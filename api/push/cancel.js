/* ================================================================
   api/push/cancel.js — Annule les notifications programmées
   Entrée : { ids:[…], lots:[…] }
   - ids  : identifiants QStash (annulation exacte)
   - lots : étiquettes, utilisées si les ids ont été perdus
================================================================ */
const QSTASH = (process.env.QSTASH_URL || 'https://qstash.upstash.io').replace(/\/$/, '');

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export async function POST(request) {
  const token = (process.env.QSTASH_TOKEN || '').replace(/\s+/g, '');
  if (!token) return json({ annules: 0 });

  let e;
  try { e = await request.json(); } catch { return json({ erreur: 'Requête invalide' }, 400); }
  const propre = v => String(v).replace(/[^\w-]/g, '').slice(0, 80);
  const ids = (Array.isArray(e.ids) ? e.ids : []).map(propre).filter(Boolean).slice(0, 100);
  const lots = (Array.isArray(e.lots) ? e.lots : []).map(propre).filter(Boolean).slice(0, 5);
  const auth = { Authorization: 'Bearer ' + token };

  try {
    if (ids.length) {
      // Annulation message par message (en parallèle). 404 = déjà livré : normal.
      const res = await Promise.all(ids.map(id =>
        fetch(`${QSTASH}/v2/messages/${id}`, { method: 'DELETE', headers: auth }).then(r => r.ok).catch(() => false)));
      return json({ annules: res.filter(Boolean).length });
    }
    if (lots.length) {
      // Secours : annule tout ce qui porte l'étiquette du lot
      const q = lots.map(l => 'label=' + encodeURIComponent(l)).join('&');
      await fetch(`${QSTASH}/v2/messages?${q}&async=true`, { method: 'DELETE', headers: auth });
      return json({ annules: 'lot' });
    }
    return json({ annules: 0 });
  } catch (err) {
    console.error('cancel', err);
    return json({ erreur: 'QStash indisponible' }, 502);
  }
}
