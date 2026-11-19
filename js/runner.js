/* ================================================================
   runner.js — Moteur de la séance en cours
   ----------------------------------------------------------------
   Le temps restant se calcule TOUJOURS à partir de l'horloge :
   on mémorise l'heure de fin de l'étape (finEtape) et on compare à
   l'heure actuelle. On ne décrémente jamais un compteur, donc le
   minuteur reste juste même si l'iPhone met l'app en veille.
================================================================ */
import { etapes, duree, clone, trouver } from './model.js';
import { donnees, sauverRun, lireRun, ajouterHistorique, enregistrerSeance, dossierDe } from './store.js';
import { jouer } from './audio.js';

/* ---------- Horloge (accélérable en développement : ?vitesse=10) ---------- */
function lireVitesse() {
  try {
    const v = parseInt(new URLSearchParams(location.search).get('vitesse'), 10);
    const enDev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.hostname.endsWith('.vercel.app') && location.hostname !== 'pause-du-champion.vercel.app';
    return enDev && v > 1 ? Math.min(v, 50) : 1;
  } catch { return 1; }
}
export const VITESSE = lireVitesse();
const T0 = Date.now();
export function maintenant() { return VITESSE === 1 ? Date.now() : T0 + (Date.now() - T0) * VITESSE; }
// Convertit une heure « virtuelle » en heure réelle (utile pour les notifications)
export function versReel(t) { return VITESSE === 1 ? t : T0 + (t - T0) / VITESSE; }

/* ---------- État ----------
   run = { seance, idx, finEtape, resteEnPause, compteFin, done }
   - finEtape     : heure (ms) de fin de l'étape en cours
   - resteEnPause : ms restantes quand on est en pause (sinon null)
   - compteFin    : heure de fin du compte à rebours 3-2-1 (sinon null)
*/
export let run = null;
export let steps = [];
let dernierReste = null;       // dernière valeur affichée (secondes), pour déclencher les bips
let ecouteur = () => {};       // fonction appelée à chaque changement

export function surChangement(fn) { ecouteur = fn; }
function prevenir(type) { ecouteur(type); }
function persister() { sauverRun(run && !run.done ? run : null); }

/* ---------- Démarrer / reprendre ---------- */
export function demarrer(seance) {
  const s = clone(seance);
  steps = etapes(s);
  if (!steps.length) return false;
  run = { seance: s, idx: 0, finEtape: 0, resteEnPause: null, compteFin: maintenant() + 3000, done: false };
  dernierReste = 4;
  persister();
  return true;
}

// Au démarrage de l'app : reprend une séance interrompue (app fermée)
export function restaurer() {
  const r = lireRun();
  if (!r || r.done || !r.seance) return false;
  run = r;
  steps = etapes(run.seance);
  if (!steps.length) { run = null; persister(); return false; }
  dernierReste = null;
  avancerSelonHorloge(false);
  return true;
}

export function quitter() { run = null; steps = []; persister(); }

/* ---------- Infos utiles à l'affichage ---------- */
export function etapeCourante() { return steps[Math.min(run.idx, steps.length - 1)]; }
export function enCompteARebours() { return run && run.compteFin !== null; }
export function enPause() { return run && run.resteEnPause !== null; }

// Millisecondes restantes de l'étape (ou du 3-2-1)
export function resteMs() {
  if (!run) return 0;
  if (run.resteEnPause !== null) return run.resteEnPause;
  if (run.compteFin !== null) return Math.max(0, run.compteFin - maintenant());
  return Math.max(0, run.finEtape - maintenant());
}
export function resteSec() { return Math.ceil(resteMs() / 1000); }

// Temps restant jusqu'à la fin de la séance (secondes)
export function resteSeance() {
  if (!run || run.done) return 0;
  let t = run.compteFin !== null ? steps[0].dur : resteSec();
  for (let j = run.idx + 1; j < steps.length; j++) t += steps[j].dur;
  return t;
}
export function dureeTotale() { return run ? duree(run.seance) : 0; }

/* ---------- Boucle : appelée plusieurs fois par seconde ---------- */
export function tic() {
  if (!run || run.done || run.resteEnPause !== null) return;
  const t = maintenant();

  // Compte à rebours 3-2-1
  if (run.compteFin !== null) {
    const s = Math.ceil((run.compteFin - t) / 1000);
    if (s !== dernierReste && s >= 1) { dernierReste = s; prevenir('tick'); }
    if (t >= run.compteFin) {
      run.finEtape = run.compteFin + steps[0].dur * 1000;
      run.compteFin = null;
      dernierReste = null;
      jouer('reprise');
      persister();
      prevenir('etape');
    }
    return;
  }

  if (t >= run.finEtape) { avancerSelonHorloge(true); return; }

  // Bips de fin de repos
  const s = Math.ceil((run.finEtape - t) / 1000);
  if (s !== dernierReste) {
    const unSeulPas = dernierReste !== null && dernierReste - s === 1;
    dernierReste = s;
    const cur = steps[run.idx];
    const R = donnees.reglages;
    if (unSeulPas && cur.ph !== 'serie') {
      if (R.decompte && s >= 1 && s <= 3) jouer('tic');
      else if (R.avant && s === R.avantS) jouer('avant');
    }
    prevenir('tick');
  }
}

/* Avance d'autant d'étapes que nécessaire selon l'heure.
   avecSon = false quand on rattrape un retard (retour au premier plan) :
   on ne rejoue pas les sons manqués. */
function avancerSelonHorloge(avecSon) {
  if (!run || run.compteFin !== null || run.resteEnPause !== null) return;
  const t = maintenant();
  let pas = 0;
  const avant = steps[run.idx];
  while (!run.done && t >= run.finEtape) {
    run.idx += 1;
    pas += 1;
    if (run.idx >= steps.length) { terminer(); return; }
    run.finEtape += steps[run.idx].dur * 1000;
  }
  if (!pas) return;
  // Un retard de plus de 1,5 s = l'app était en veille : pas de son
  const enRetard = t - (run.finEtape - steps[run.idx].dur * 1000) > 1500;
  if (avecSon && pas === 1 && !enRetard) sonTransition(avant, steps[run.idx]);
  dernierReste = null;
  persister();
  prevenir('etape');
}

function sonTransition(prev, x) {
  const R = donnees.reglages;
  if (x.ph === 'serie' && prev.ph !== 'serie') { if (R.reprise) jouer('reprise'); }
  else if (prev.ph === 'serie' && x.ph !== 'serie') { if (R.fin) jouer('fin'); }
}

function terminer() {
  run.done = true;
  run.idx = steps.length - 1;
  ajouterHistorique(run.seance.nom, duree(run.seance));
  jouer('reprise');
  persister();
  prevenir('fin');
}

/* ---------- Boutons ---------- */
export function basculerPause() {
  if (!run || run.done) return;
  if (run.compteFin !== null) return;
  if (run.resteEnPause === null) {
    run.resteEnPause = Math.max(0, run.finEtape - maintenant());
  } else {
    run.finEtape = maintenant() + run.resteEnPause;
    run.resteEnPause = null;
  }
  dernierReste = null;
  persister();
  prevenir('etape');
}

export function recommencer() {
  if (!run || run.done || run.compteFin !== null) return;
  const d = steps[run.idx].dur * 1000;
  if (run.resteEnPause !== null) run.resteEnPause = d;
  else run.finEtape = maintenant() + d;
  dernierReste = null;
  persister();
  prevenir('etape');
}

export function passer() {
  if (!run || run.done) return;
  if (run.compteFin !== null) { run.compteFin = maintenant(); tic(); return; }
  const prev = steps[run.idx];
  run.idx += 1;
  if (run.idx >= steps.length) { terminer(); return; }
  const d = steps[run.idx].dur * 1000;
  if (run.resteEnPause !== null) run.resteEnPause = d;
  else { run.finEtape = maintenant() + d; sonTransition(prev, steps[run.idx]); }
  dernierReste = null;
  persister();
  prevenir('etape');
}

/* ---------- Live edit : modifier un exo pendant le repos ----------
   Les étapes restantes sont recalculées. Le repos en cours garde son temps. */
export function modifierExoEnCours(exoId, patch) {
  if (!run) return;
  // Position actuelle = nombre de séries déjà commencées
  const seriesAvant = steps.slice(0, run.idx + 1).filter(x => x.ph === 'serie').length;
  const surSerie = steps[run.idx].ph === 'serie';

  const f = trouver(run.seance, exoId);
  if (!f) return;
  Object.assign(f.obj, patch);
  if (f.circuit) f.obj.series = Math.min(f.obj.series, f.circuit.tours);
  steps = etapes(run.seance);

  // Retrouve la même position dans les nouvelles étapes
  let vues = 0, nouvelIdx = steps.length;
  for (let j = 0; j < steps.length; j++) {
    if (steps[j].ph === 'serie') vues += 1;
    if (vues === seriesAvant) { nouvelIdx = surSerie ? j : j + 1; break; }
  }
  if (nouvelIdx >= steps.length) { terminer(); return; }
  if (run.idx !== nouvelIdx || steps[nouvelIdx].ph === 'serie' && !surSerie) {
    run.idx = nouvelIdx;
    // Si on tombe sur une série (le repos a disparu), elle commence maintenant
    if (steps[nouvelIdx].ph === 'serie' && !surSerie) {
      const d = steps[nouvelIdx].dur * 1000;
      if (run.resteEnPause !== null) run.resteEnPause = d; else run.finEtape = maintenant() + d;
    }
  }

  // On garde la modification dans la séance enregistrée (sauf séance d'exemple)
  const originale = donnees.seances.find(s => s.id === run.seance.id);
  if (originale) {
    const dos = dossierDe(originale);
    if (!dos || !dos.preset) {
      const copie = clone(originale);
      const g = trouver(copie, exoId);
      if (g) { Object.assign(g.obj, patch); if (g.circuit) g.obj.series = Math.min(g.obj.series, g.circuit.tours); enregistrerSeance(copie); }
    }
  }
  dernierReste = null;
  persister();
  prevenir('etape');
}

/* ---------- Pour les notifications ---------- */
// Heure réelle (ms) de fin de l'étape en cours, ou null si en pause / terminé
export function finEtapeReelle() {
  if (!run || run.done || run.resteEnPause !== null) return null;
  if (run.compteFin !== null) return versReel(run.compteFin + steps[0].dur * 1000);
  return versReel(run.finEtape);
}
