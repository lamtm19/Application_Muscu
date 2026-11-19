/* ================================================================
   push.js — Notifications quand l'app n'est pas à l'écran (Web Push)
   ----------------------------------------------------------------
   1. Au premier lancement de séance, on demande la permission (geste).
   2. Quand l'app passe en arrière-plan, on calcule les alertes à venir
      et on les envoie à /api/push/schedule (QStash les livrera à l'heure).
   3. Quand l'app revient (ou pause, passer…), on les annule.
   Si le serveur ne répond pas, l'app marche quand même (son seulement).
================================================================ */
import { donnees, lire, ecrire, effacer } from './store.js';
import { alertesFutures } from './model.js';
import * as runner from './runner.js';

// Clé publique VAPID (publique par nature : elle peut être dans le code)
const CLE_PUBLIQUE = 'BBmv9FzVYxEbjRoOKJj4URc3cSU1pjnfFGSuQjUN-gat0gP5tRELsI4kE1zR-g-zQrF6JzQgeWjBR0XAXCA1pRY';

const K_SUB = 'pdc2_push_sub';       // abonnement push
const K_IDS = 'pdc2_push_ids';       // identifiants des messages programmés
const K_LOTS = 'pdc2_push_lots';     // étiquettes des lots programmés (secours si les ids sont perdus)
const K_DEMANDE = 'pdc2_notif_demande';

let envoiEnCours = null; // promesse de la dernière programmation

/* ---------- Ce que sait faire l'appareil ---------- */
export function supporte() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
function estIphone() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function estInstallee() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }

/* ---------- Faut-il afficher la demande ? ---------- */
// Renvoie 'demander', 'installer' ou null
export function aDemander() {
  if (lire(K_DEMANDE)) return null;
  if (supporte()) return Notification.permission === 'default' ? 'demander' : null;
  if (estIphone() && !estInstallee()) return 'installer';
  return null;
}
export function marquerDemande() { ecrire(K_DEMANDE, true); }

// Texte affiché dans l'écran « Notifications & son »
export function etatLisible() {
  if (!supporte()) {
    return estIphone() && !estInstallee()
      ? { texte: 'Notifications indisponibles : installe d’abord l’app sur ton écran d’accueil.', action: 'allerAide', lien: 'Voir l’aide' }
      : { texte: 'Ce navigateur ne gère pas les notifications.' };
  }
  if (Notification.permission === 'denied') return { texte: 'Notifications refusées. Réactive-les dans Réglages › Notifications › Pause du Champion.' };
  if (Notification.permission === 'default' || !lire(K_SUB)) return { texte: 'Notifications pas encore activées.', action: 'activerNotif', lien: 'Activer' };
  return null;
}

/* ---------- Activer (dans un geste de l'utilisateur) ---------- */
function cleEnOctets(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const b = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...b].map(c => c.charCodeAt(0)));
}

export async function activer() {
  if (!supporte()) return false;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(CLE_PUBLIQUE) });
    ecrire(K_SUB, sub.toJSON());
    return true;
  } catch { return false; }
}

// Récupère l'abonnement (au cas où il aurait changé)
async function abonnement() {
  if (!supporte() || Notification.permission !== 'granted') return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { ecrire(K_SUB, sub.toJSON()); return sub.toJSON(); }
  } catch { /* rien */ }
  return lire(K_SUB);
}

/* ---------- Programmer (app cachée) ---------- */
export function programmerSiBesoin() {
  const r = runner.run;
  if (!r || r.done || runner.enPause() || runner.VITESSE !== 1) return;
  if (!supporte() || Notification.permission !== 'granted') return;
  const sub = lire(K_SUB);
  if (!sub) return;
  if (lire(K_IDS, []).length || lire(K_LOTS, []).length) return; // déjà programmé

  const fin = runner.finEtapeReelle();
  if (!fin) return;
  const idx = runner.enCompteARebours() ? 0 : r.idx;
  const alertes = alertesFutures(runner.steps, idx, fin, Date.now(), donnees.reglages);
  if (!alertes.length) return;

  // L'étiquette est enregistrée AVANT l'envoi : on pourra annuler même si la réponse se perd
  const lot = 'pdc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  ecrire(K_LOTS, [lot]);
  envoiEnCours = fetch('/api/push/schedule', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub, alertes, lot }),
  }).then(rep => (rep.ok ? rep.json() : null))
    .then(d => { if (d && Array.isArray(d.ids)) ecrire(K_IDS, d.ids); })
    .catch(() => { /* hors ligne : son seulement */ })
    .finally(() => { envoiEnCours = null; });
}

/* ---------- Annuler (retour à l'écran, pause, passer, quitter…) ---------- */
export async function annulerTout() {
  if (envoiEnCours) await envoiEnCours;
  const ids = lire(K_IDS, []);
  const lots = lire(K_LOTS, []);
  if (!ids.length && !lots.length) return;
  effacer(K_IDS); effacer(K_LOTS);
  try {
    await fetch('/api/push/cancel', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, lots }),
    });
  } catch { /* rien : au pire une notification arrivera pour rien */ }
}

// Au démarrage : si la permission est déjà donnée, on rafraîchit l'abonnement
abonnement();
