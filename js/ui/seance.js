/* ================================================================
   ui/seance.js — Séance en cours (grille stricte, tout centré)
   + compte à rebours 3-2-1, aperçu « 1/6 », quitter, live edit
================================================================ */
import { etat, aller, rendre } from '../app.js';
import { donnees } from '../store.js';
import { mmss, enMinutes, prochaineSerie, trouver, clone } from '../model.js';
import { illu } from '../illustrations.js';
import { esc, ICONES, feuille } from './commun.js';
import { feuilleExo, actionsFeuilleExo } from './editeur.js';
import * as runner from '../runner.js';
import * as push from '../push.js';

let boucle = null;
let verrou = null;            // Wake Lock (écran allumé)
let panneau = null;           // null | 'apercu' | 'quitter' | 'edit'
let edition = null;           // { exo, circuit } : copie de l'exo modifié en live edit

const CIRC = 2 * Math.PI * 100; // périmètre de l'anneau (r = 100)

/* ---------- Branchement du moteur ---------- */
export function brancher() {
  panneau = null; edition = null;
  runner.surChangement(type => {
    if (etat.ecran !== 'seance') return;
    if (type === 'tick') majLegere();
    else { if (type === 'fin') arreter(); rendre(); }
  });
  clearInterval(boucle);
  boucle = setInterval(runner.tic, 200);
  reprendreVerrou();
}

function arreter() {
  clearInterval(boucle); boucle = null;
  libererVerrou();
}

/* ---------- Écran allumé (Wake Lock) ---------- */
export async function reprendreVerrou() {
  if (!runner.run || runner.run.done || !donnees.reglages.ecran) return;
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    verrou = await navigator.wakeLock.request('screen');
    verrou.addEventListener('release', () => { verrou = null; });
  } catch { /* refusé (batterie faible…) */ }
}
function libererVerrou() { if (verrou) { verrou.release().catch(() => {}); verrou = null; } }

/* ---------- Calcul de ce qu'on affiche ---------- */
function vue() {
  const r = runner.run, steps = runner.steps;
  const cur = runner.etapeCourante();
  const enSerie = cur.ph === 'serie';
  const show = enSerie ? cur : (prochaineSerie(steps, r.idx + 1) || cur);
  const exo = show.exo || { nom: '', kind: 'curl', note: '' };
  const reste = runner.resteSec();
  const total = runner.enCompteARebours() ? 3 : cur.dur;
  const frac = total ? Math.min(1, runner.resteMs() / (total * 1000)) : 0;
  const tot = runner.dureeTotale(), rem = runner.resteSeance();
  return {
    r, cur, show, exo, enSerie, reste, frac,
    col: enSerie ? '#e8ff00' : '#ff4d4d',
    restant: mmss(rem),
    prog: Math.max(0, Math.min(100, Math.round(100 * (1 - rem / Math.max(1, tot))))),
    prog1: (show.item + 1) + '/' + r.seance.items.length,
  };
}

// Chiffres à largeur fixe : le chrono ne bouge pas
function chiffres(txt) {
  return txt.split('').map(c => `<span class="${c === ':' ? 'deux-points' : 'chiffre'}">${c}</span>`).join('');
}

/* ---------- Rendu ---------- */
export function rendu() {
  const r = runner.run;
  if (!r) return '<div class="ecran"></div>';
  const v = vue();

  const entete = `<header class="entete-seance">
    <button class="btn-rond-gris" aria-label="Quitter la séance" data-action="demanderQuitter">${ICONES.croix}</button>
    <span class="seance-nom">${esc(r.seance.nom)}</span>
    <button class="puce-apercu" aria-label="Voir toute la séance" data-action="ouvrirApercu">${v.prog1}${ICONES.bas}</button>
  </header>`;

  if (r.done) {
    return `<div class="ecran">${entete}
      <div class="ecran-fin">
        <span class="rond-check">${ICONES.grandCheck}</span>
        <h2 class="titre-fin">Séance terminée</h2>
        <span class="gris15">${esc(r.seance.nom)} · ${enMinutes(runner.dureeTotale())}</span>
        <button class="btn-jaune h54 px28 mt10" data-action="quitterSeance">Retour à l’accueil</button>
      </div></div>`;
  }

  const { show, exo, enSerie } = v;
  let dots = '';
  if (show.N > 1) {
    const fait = show.n - 1, courant = enSerie ? show.n - 1 : -1;
    for (let i = 0; i < show.N; i++) {
      const cls = i < fait ? 'fait' : i === courant ? 'courant' : '';
      dots += `<span class="case ${cls}">${i < fait ? ICONES.check : i + 1}</span>`;
    }
  }
  const enPause = runner.enPause();

  return `<div class="ecran ecran-seance">
    ${entete}
    <div class="seance-centre">
      <div class="seance-illu">${illu(enSerie ? exo.kind : 'rest', 184, 138)}</div>
      <div class="anneau-boite">
        <svg width="216" height="216" viewBox="0 0 216 216" aria-hidden="true" class="anneau">
          <circle cx="108" cy="108" r="100" fill="none" stroke="#1e1e1e" stroke-width="8"></circle>
          <circle id="anneau" cx="108" cy="108" r="100" fill="none" stroke="${v.col}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="${(CIRC * (1 - v.frac)).toFixed(1)}"></circle>
        </svg>
        <div class="chrono" id="chrono" style="color:${v.col}">${chiffres(mmss(v.reste))}</div>
      </div>
      <span class="avant-nom">${enSerie ? '' : 'EXERCICE SUIVANT'}</span>
      <div class="ligne-exo-nom">
        <h2 class="exo-nom">${esc(exo.nom)}</h2>
        ${!enSerie && show.exo ? `<button class="btn-crayon" aria-label="Modifier l’exercice suivant" data-action="liveEdit">${ICONES.crayon}</button>` : ''}
      </div>
      <div class="cases" role="img" aria-label="Série ${show.n} sur ${show.N}">
        ${show.N > 1 ? '<span class="cases-mot">SÉRIES</span>' : ''}${dots}
      </div>
      <p class="seance-note">${esc(exo.note || '')}</p>
      <div class="commandes">
        <button class="btn-rond" aria-label="${enSerie ? 'Recommencer la série' : 'Recommencer le repos'}" data-action="recommencer">${ICONES.recommencer}</button>
        <button class="btn-rond grand" style="background:${v.col}" aria-label="${enPause ? 'Reprendre' : 'Pause'}" data-action="pause">${enPause ? ICONES.reprendre : ICONES.pause}</button>
        <button class="btn-rond" aria-label="Passer" data-action="passer">${ICONES.passer}</button>
        <span>Recommencer</span><span>${enPause ? 'Reprendre' : 'Pause'}</span><span>Passer</span>
      </div>
    </div>
    <div class="seance-bas">
      <div class="ligne-entre base">
        <span class="gris13">Fin de séance dans</span>
        <span class="restant" id="restant">${v.restant}</span>
      </div>
      <div class="barre-prog"><div id="prog" style="width:${v.prog}%"></div></div>
    </div>
    ${runner.enCompteARebours() ? `<div class="compte" role="status">
      <span class="compte-mot">PRÉPARE-TOI</span>
      <span class="compte-chiffre" id="compte">${v.reste}</span>
      <span class="compte-exo">${esc(exo.nom)}</span>
    </div>` : ''}
    ${rendrePanneau(v)}
  </div>`;
}

function rendrePanneau(v) {
  const r = runner.run;
  if (panneau === 'apercu') {
    const lignes = r.seance.items.map((it, i) => {
      const enC = i === v.show.item && !r.done, ok = i < v.show.item || r.done;
      let det = it.type === 'circuit' ? it.exos.map(e => e.nom).join(' + ') : it.series + ' séries';
      if (enC) det = v.exo.nom + ' · série ' + v.show.n + ' / ' + v.show.N + (v.cur.ph !== 'serie' ? ' · repos' : '');
      return `<div class="ligne-apercu ${enC ? 'en-cours' : ''} ${ok ? 'fait' : ''}">
        <span class="apercu-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="recap-txt"><span class="apercu-nom">${esc(it.type === 'circuit' ? (it.nom || 'Circuit') : it.nom)}</span><span class="gris12">${ok ? 'Terminé' : esc(det)}</span></span>
        ${enC ? '<span class="badge-en-cours">EN COURS</span>' : ''}${ok ? ICONES.checkJaune : ''}
      </div>`;
    }).join('');
    return feuille(`<div class="ligne-entre base mb8"><h2 class="titre-feuille t30">${esc(r.seance.nom)}</h2><span class="gris14">${v.prog1}</span></div>${lignes}`,
      'fermerPanneau', 'Fermer l’aperçu', 'feuille-apercu');
  }
  if (panneau === 'quitter') {
    return feuille(`<h2 class="titre-feuille t32">Quitter la séance ?</h2>
      <p class="gris15 m0 mb18">Ta progression sera perdue.</p>
      <div class="ligne10">
        <button class="btn-gris h56 flex1" data-action="fermerPanneau">Continuer</button>
        <button class="btn-danger h56 flex1 gras" data-action="quitterSeance">Quitter</button>
      </div>`, 'fermerPanneau', 'Continuer la séance', 'feuille-quitter');
  }
  if (panneau === 'edit' && edition) {
    return feuilleExo(edition.exo, edition.circuit, { fermer: 'appliquerEdit', retirer: null });
  }
  return '';
}

/* ---------- Mise à jour légère (chaque seconde, sans tout redessiner) ---------- */
function majLegere() {
  if (!runner.run || runner.run.done) return;
  const v = vue();
  const c = document.getElementById('compte');
  if (c) c.textContent = v.reste;
  const ch = document.getElementById('chrono');
  if (ch) ch.innerHTML = chiffres(mmss(v.reste));
  const an = document.getElementById('anneau');
  if (an) an.setAttribute('stroke-dashoffset', (CIRC * (1 - v.frac)).toFixed(1));
  const re = document.getElementById('restant');
  if (re) re.textContent = v.restant;
  const pr = document.getElementById('prog');
  if (pr) pr.style.width = v.prog + '%';
}
export function apresRendu() { majLegere(); }

/* ---------- Actions ---------- */
const editActions = actionsFeuilleExo(() => edition && { obj: edition.exo, circuit: edition.circuit }, () => rendre());

export const actions = {
  ...editActions.actions,
  demanderQuitter: () => { panneau = 'quitter'; rendre(); },
  ouvrirApercu: () => { panneau = 'apercu'; rendre(); },
  fermerPanneau: () => { panneau = null; edition = null; rendre(); },
  quitterSeance: () => {
    panneau = null;
    arreter();
    runner.quitter();
    push.annulerTout();
    aller('accueil');
  },
  pause: () => { runner.basculerPause(); push.annulerTout(); },
  recommencer: () => { runner.recommencer(); push.annulerTout(); },
  passer: () => { runner.passer(); push.annulerTout(); },
  liveEdit: () => {
    const v = vue();
    const f = trouver(runner.run.seance, v.show.exo.id);
    if (!f) return;
    edition = { id: f.obj.id, exo: clone(f.obj), circuit: f.circuit ? clone(f.circuit) : null };
    panneau = 'edit';
    rendre();
  },
  appliquerEdit: () => {
    if (edition) {
      const { nom, series, serie, repos, note } = edition.exo;
      runner.modifierExoEnCours(edition.id, { nom, series, serie, repos, note });
      push.annulerTout();
    }
    panneau = null; edition = null;
    rendre();
  },
};
export const changes = { ...editActions.changes };
