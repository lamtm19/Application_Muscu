/* ================================================================
   api/push/schedule.js — Programme les notifications d'une séance
   ----------------------------------------------------------------
   Pour chaque alerte, on publie un message QStash avec un délai.
   À l'heure dite, QStash appelle /api/push/send, qui envoie la
   notification. Aucune base de données : tout est dans le message.
   Entrée : { subscription, alertes:[{ dans (s), a (heure exacte, ms), titre, texte }], lot }
   On utilise l’heure EXACTE (Upstash-Not-Before) et non un délai relatif : sinon le
   temps d’envoi depuis l’iPhone qui se verrouille et le démarrage du serveur décalent tout.
   Sortie : { ids:[…] } (identifiants QStash, pour pouvoir annuler)
================================================================ */
const QSTASH = (process.env.QSTASH_URL || 'https://qstash.upstash.io').replace(/\/$/, '');

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

// Adresse de /api/push/send : le site de production, ou la preview en test
function adresseEnvoi(request) {
  if (process.env.PUSH_SEND_URL) return process.env.PUSH_SEND_URL;
  if (process.env.VERCEL_ENV === 'production' && process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '') + '/api/push/send';
  return new URL(request.url).origin + '/api/push/send';
}

// GET : heure du serveur, pour que le téléphone corrige un éventuel décalage de son horloge
export function GET() {
  return json({ maintenant: Date.now() });
}

export async function POST(request) {
  const token = (process.env.QSTASH_TOKEN || '').replace(/\s+/g, '');
  if (!token) return json({ erreur: 'Notifications non configurées' }, 503);

  let e;
  try { e = await request.json(); } catch { return json({ erreur: 'Requête invalide' }, 400); }
  const sub = e.subscription;
  if (!sub || typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://') || !sub.keys) {
    return json({ erreur: 'Abonnement invalide' }, 400);
  }
  const lot = String(e.lot || '').replace(/[^\w-]/g, '').slice(0, 40) || 'pdc';
  // Garde-fous : 80 alertes max, dans l'heure qui vient
  const alertes = (Array.isArray(e.alertes) ? e.alertes : [])
    .filter(a => a && Number(a.dans) >= 1 && Number(a.dans) <= 3600)
    .slice(0, 80);
  if (!alertes.length) return json({ ids: [] });

  const destination = adresseEnvoi(request);
  const ANTICIPATION = 1; // s : compense le trajet QStash → Apple → iPhone
  const maintenantS = Date.now() / 1000;
  // Heure de livraison (secondes Unix) : heure exacte si fournie et cohérente, sinon délai relatif
  const heure = a => {
    const exacte = Number(a.a) / 1000;
    if (exacte > maintenantS - 5 && exacte < maintenantS + 3700) return Math.max(Math.ceil(maintenantS), Math.floor(exacte) - ANTICIPATION);
    return Math.round(maintenantS + Number(a.dans)) - ANTICIPATION;
  };
  const contournement = process.env.VERCEL_AUTOMATION_BYPASS_SECRET; // previews protégées
  const lots = alertes.map(a => ({
    destination,
    headers: {
      'Content-Type': 'application/json',
      'Upstash-Not-Before': String(heure(a)),
      'Upstash-Label': lot,
      'Upstash-Retries': '1',
      ...(contournement && process.env.VERCEL_ENV !== 'production' ? { 'Upstash-Forward-x-vercel-protection-bypass': contournement } : {}),
    },
    body: JSON.stringify({
      subscription: { endpoint: sub.endpoint, keys: sub.keys },
      titre: String(a.titre || '').slice(0, 80),
      texte: String(a.texte || '').slice(0, 160),
    }),
  }));

  try {
    const rep = await fetch(QSTASH + '/v2/batch', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(lots),
    });
    if (!rep.ok) {
      console.error('QStash batch', rep.status, (await rep.text()).slice(0, 300));
      return json({ erreur: 'QStash indisponible' }, 502);
    }
    const res = await rep.json();
    return json({ ids: res.map(r => r.messageId).filter(Boolean) });
  } catch (err) {
    console.error('schedule', err);
    return json({ erreur: 'QStash indisponible' }, 502);
  }
}
