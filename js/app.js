/* ================================================================
   app.js — Démarrage de l'app et navigation entre les écrans
   ----------------------------------------------------------------
   Chaque écran (js/ui/*.js) exporte :
     - rendu()   : renvoie le HTML de l'écran
     - actions   : { nomAction(el, event) { … } } déclenchées par data-action="nomAction"
     - changes   : { … } déclenchées par data-change (événement « change » des champs)
     - saisies   : { … } déclenchées par data-input (à chaque frappe)
   L'état de navigation est dans l'objet « etat » ci-dessous.
================================================================ */
import { charger } from './store.js';
import { chargerIllustrations } from './illustrations.js';
import * as runner from './runner.js';
import { reveiller, debloquer, estDebloque } from './audio.js';
import * as push from './push.js';

import * as accueil from './ui/accueil.js';
import * as editeur from './ui/editeur.js';
import * as biblio from './ui/biblio.js';
import * as recap from './ui/recap.js';
import * as seance from './ui/seance.js';
import * as coach from './coach.js';
import * as reglages from './ui/reglages.js';
import * as aide from './ui/aide.js';
import * as historique from './ui/historique.js';

const ECRANS = { accueil, editeur, biblio, recap, seance, coach, reglages, aide, historique };

// État de navigation (ce qui est affiché à l'écran)
export const etat = {
  ecran: 'accueil',
  precedent: 'accueil',  // pour le bouton retour du coach / de l'aide
  draft: null,           // séance en cours de modification
  sheetId: null,         // exo ou circuit dont la feuille de réglages est ouverte
  cible: null,           // id du circuit où ajouter des exercices (biblio)
  selection: [],         // clés sélectionnées dans la biblio (dans l'ordre)
  filtre: 'tout',
  recherche: '',
  recap: null,           // séance affichée dans le récap
  dossierSheet: null,    // dossier dont la feuille d'options est ouverte
};

const racine = () => document.getElementById('app');

/* ---------- Navigation ---------- */
export function aller(ecran, options = {}) {
  if (ecran !== etat.ecran) etat.precedent = etat.ecran;
  Object.assign(etat, options);
  etat.ecran = ecran;
  rendre(true);
}

// Redessine l'écran courant. nouveau = true : on remonte en haut de la page
export function rendre(nouveau = false) {
  const ancienScroll = nouveau ? 0 : (document.querySelector('#app .pdc-scroll')?.scrollTop || 0);
  const ancienFeuille = nouveau ? 0 : (document.querySelector('#app .feuille')?.scrollTop || 0);
  racine().innerHTML = ECRANS[etat.ecran].rendu();
  racine().dataset.ecran = etat.ecran;
  const sc = document.querySelector('#app .pdc-scroll');
  if (sc) sc.scrollTop = ancienScroll;
  const fe = document.querySelector('#app .feuille');
  if (fe) fe.scrollTop = ancienFeuille;
  ECRANS[etat.ecran].apresRendu?.();
}

/* ---------- Délégation des événements ---------- */
function trouverAction(nom) {
  const e = ECRANS[etat.ecran];
  return (e.actions && e.actions[nom]) || ACTIONS_GLOBALES[nom];
}

const ACTIONS_GLOBALES = {
  retour: () => aller('accueil', { sheetId: null }),
  allerHistorique: () => aller('historique'),
  allerReglages: () => aller('reglages'),
  allerAide: () => aller('aide'),
  allerCoach: () => aller('coach'),
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-action]');
  if (!el || !racine().contains(el) && !el.closest('#hors-app')) return;
  const fn = trouverAction(el.dataset.action);
  if (fn) { ev.preventDefault(); fn(el, ev); }
});
document.addEventListener('change', ev => {
  const el = ev.target.closest('[data-change]');
  if (!el) return;
  const fn = ECRANS[etat.ecran].changes?.[el.dataset.change];
  if (fn) fn(el, ev);
});
document.addEventListener('input', ev => {
  const el = ev.target.closest('[data-input]');
  if (!el) return;
  const fn = ECRANS[etat.ecran].saisies?.[el.dataset.input];
  if (fn) fn(el, ev);
});
// Touche Entrée dans un champ = valider (ex : envoyer au coach)
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Enter') return;
  const el = ev.target.closest('[data-entree]');
  if (!el) return;
  const fn = trouverAction(el.dataset.entree);
  if (fn) { ev.preventDefault(); fn(el, ev); }
});

/* ---------- Son : débloqué au premier toucher ----------
   Sur iPhone, le son ne marche que s'il a été activé pendant un toucher.
   Si l'app a été rouverte au milieu d'une séance (pas de « C'est parti ! »),
   n'importe quel toucher réactive le son. */
['touchend', 'click'].forEach(t => document.addEventListener(t, () => {
  if (!estDebloque()) debloquer();
}, { capture: true, passive: true }));

/* ---------- Zéro zoom sur iPhone ---------- */
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
let dernierToucher = 0;
document.addEventListener('touchend', e => {
  // Double-tap rapide : on empêche le zoom (sauf dans les champs)
  const t = Date.now();
  if (t - dernierToucher < 300 && !e.target.closest('input, textarea, select')) e.preventDefault();
  dernierToucher = t;
}, { passive: false });

/* ---------- Premier plan / arrière-plan ---------- */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    reveiller();
    push.annulerTout().then(() => { if (document.visibilityState === 'hidden') push.programmerSiBesoin(); });
    if (runner.run) {
      runner.tic();
      if (etat.ecran === 'seance') rendre();
      seance.reprendreVerrou();
    }
  } else {
    push.programmerSiBesoin();
  }
});
window.addEventListener('pagehide', () => push.programmerSiBesoin());

/* ---------- Hauteur de l'écran (app installée sur iPhone) ----------
   Dans l'app installée, iOS donne parfois une hauteur trop petite
   (100vh, 100dvh, innerHeight) : une bande noire apparaît en bas.
   En plein écran et en portrait, la vraie hauteur est celle de l'écran. */
function ajusterHauteur() {
  const installee = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const portrait = matchMedia('(orientation: portrait)').matches;
  if (!installee || !portrait) { document.documentElement.style.removeProperty('--h-app'); return; }
  const h = Math.max(window.innerHeight, screen.height);
  document.documentElement.style.setProperty('--h-app', h + 'px');
}
ajusterHauteur();
window.addEventListener('resize', ajusterHauteur);
window.addEventListener('orientationchange', () => setTimeout(ajusterHauteur, 300));

/* ---------- Démarrage ---------- */
async function demarrer() {
  try {
    await Promise.all([charger(), chargerIllustrations()]);
  } catch (e) {
    racine().innerHTML = '<p style="padding:40px 20px;color:#888">Impossible de charger les données. Vérifie ta connexion puis rouvre l’app.</p>';
    return;
  }
  // Une séance était en cours quand l'app a été fermée ? On la reprend.
  if (runner.restaurer()) {
    seance.brancher();
    aller('seance');
  } else {
    rendre(true);
  }
  push.annulerTout();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
demarrer();
