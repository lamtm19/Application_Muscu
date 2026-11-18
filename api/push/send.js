/* ================================================================
   api/push/send.js — Appelée par QStash à l'heure prévue
   1. Vérifie que l'appel vient bien de QStash (signature).
   2. Envoie la notification Web Push au téléphone.
================================================================ */
import { Receiver } from '@upstash/qstash';
import webpush from 'web-push';

export async function POST(request) {
  const corps = await request.text(); // texte brut : nécessaire pour la signature

  // 1. Signature QStash
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  });
  try {
    const ok = await receiver.verify({ signature: request.headers.get('upstash-signature') || '', body: corps });
    if (!ok) return new Response('Signature invalide', { status: 401 });
  } catch {
    return new Response('Signature invalide', { status: 401 });
  }

  // 2. Envoi de la notification
  let m;
  try { m = JSON.parse(corps); } catch { return new Response('Corps invalide', { status: 400 }); }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  try {
    await webpush.sendNotification(m.subscription, JSON.stringify({ titre: m.titre, texte: m.texte }), { TTL: 60, urgency: 'high' });
  } catch (err) {
    // 404/410 : abonnement expiré. On répond 200 pour que QStash ne réessaie pas.
    console.error('web-push', err.statusCode, err.body);
  }
  return new Response('OK');
}
