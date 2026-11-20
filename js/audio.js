/* ================================================================
   audio.js — Alarme sonore de l'app
   - UN SEUL AudioContext, créé et débloqué au toucher de « C'est parti ! »
     (la v1 en créait un à chaque bip, ce qui finissait par bloquer le son).
   - Les bips sont générés avec un oscillateur (aucun fichier audio).
   - Gestion de la musique avec navigator.audioSession (Safari 16.4+) :
       « baisser »   : 'transient' pendant le bip (la musique baisse), puis 'ambient'
       « melanger »  : 'ambient' (le bip passe par-dessus)
       « rien »      : aucun son
================================================================ */
import { donnees } from './store.js';

let ctx = null;
let timerRetour = null;

// Séquences de bips : [fréquence Hz, début s, durée s]
const SONS = {
  tic: [[880, 0, 0.09]],
  avant: [[660, 0, 0.12], [660, 0.2, 0.12]],
  fin: [[440, 0, 0.25]],
  reprise: [[520, 0, 0.15], [780, 0.18, 0.35]],
};

// Le navigateur sait-il gérer la session audio ?
function session() {
  return (typeof navigator !== 'undefined' && navigator.audioSession) ? navigator.audioSession : null;
}
function typeSession(t) {
  const s = session();
  if (!s) return;
  try { s.type = t; } catch { /* non supporté */ }
}

// À appeler dans un geste de l'utilisateur (toucher d'un bouton)
export function debloquer() {
  try {
    // 'ambient' AVANT de créer le contexte : ainsi la musique n'est pas coupée
    typeSession('ambient');
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== 'running') ctx.resume();
    // Un son vide joué pendant le geste débloque définitivement le contexte sur iPhone
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(ctx.destination); src.start(0);
  } catch { /* pas d'audio */ }
}

// Le son est-il prêt (contexte créé et actif) ?
export function estDebloque() { return !!ctx && ctx.state === 'running'; }

// Quand l'app revient à l'écran, le contexte peut avoir été suspendu
export function reveiller() {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}

// Joue un son : 'tic' | 'avant' | 'reprise' | 'fin'. forcer = true pour « Tester l'alerte »
export function jouer(type, forcer = false) {
  const mode = donnees.reglages.musique;
  if (mode === 'rien' && !forcer) return;
  const seq = SONS[type] || SONS.reprise;
  try {
    if (!ctx) debloquer();
    if (!ctx) return;
    reveiller();

    const longueur = Math.max(...seq.map(q => q[1] + q[2])) + 0.1;
    if (mode === 'baisser') {
      // La musique baisse pendant le bip, puis remonte
      typeSession('transient');
      clearTimeout(timerRetour);
      timerRetour = setTimeout(() => typeSession('ambient'), longueur * 1000 + 250);
    } else {
      typeSession('ambient');
    }

    const t0 = ctx.currentTime + 0.02;
    seq.forEach(([freq, debut, duree]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t0 + debut);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + debut + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + debut + duree);
      o.start(t0 + debut);
      o.stop(t0 + debut + duree + 0.05);
    });
    if (navigator.vibrate) navigator.vibrate(type === 'tic' ? 40 : 120);
  } catch { /* pas d'audio */ }
}
