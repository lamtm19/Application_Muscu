/* ================================================================
   ui/recap.js — Récap avant de lancer la séance
   + demande d'autorisation des notifications (au premier lancement)
================================================================ */
import { etat, aller, rendre } from '../app.js';
import { duree, enMinutes, nbExos } from '../model.js';
import { illu } from '../illustrations.js';
import { esc, ICONES, feuille } from './commun.js';
import { ouvrirEditeur } from './accueil.js';
import { debloquer } from '../audio.js';
import * as push from '../push.js';
import * as runner from '../runner.js';
import { brancher } from './seance.js';

let feuilleNotif = null; // null | 'demander' | 'installer'

export function rendu() {
  const R = etat.recap;
  const items = R.items.map(x => x.type === 'circuit'
    ? `<div class="ligne-recap circuit">
        <span class="vignette v64">${illu((x.exos[0] || { kind: 'pushup' }).kind, 62, 46)}</span>
        <span class="recap-txt"><span class="recap-nom">${esc(x.nom || 'Circuit')}</span><span class="gris12">${esc(x.exos.map(e => e.nom).join(', '))}</span></span>
        <span class="x-moyen">x${x.tours}</span>
      </div>`
    : `<div class="ligne-recap">
        <span class="vignette v64">${illu(x.kind, 62, 46)}</span>
        <span class="recap-txt"><span class="recap-nom">${esc(x.nom)}</span></span>
        <span class="x-moyen">x${x.series}</span>
      </div>`).join('');

  return `<div class="ecran">
    <header class="entete">
      <button class="btn-carre" aria-label="Retour" data-action="retour">${ICONES.retour}</button>
      <span class="surtitre">RÉCAP DE LA SÉANCE</span>
    </header>
    <div class="pdc-scroll contenu-recap">
      <h1 class="titre-recap">${esc(R.nom)}</h1>
      <div class="grille2">
        <div class="tuile"><span class="tuile-val jaune">${enMinutes(duree(R))}</span><span class="gris12">au total</span></div>
        <div class="tuile"><span class="tuile-val">${nbExos(R)}</span><span class="gris12">exercices</span></div>
      </div>
      <div class="pile8">${items}</div>
    </div>
    <div class="barre-bas ligne10">
      <button class="btn-contour h54 px18" data-action="modifierRecap">Modifier</button>
      <button class="btn-jaune h54 flex1" data-action="cestParti">${ICONES.play.replace(/15/g, '16')}C’est parti !</button>
    </div>
    ${rendreFeuilleNotif()}
  </div>`;
}

function rendreFeuilleNotif() {
  if (feuilleNotif === 'demander') {
    return feuille(`<div class="pile12">
      <h2 class="titre-feuille">Être prévenu de la reprise</h2>
      <p class="gris14 m0">Autorise les notifications : même écran verrouillé, ton iPhone te prévient quelques secondes avant la fin du repos, puis au moment de repartir.</p>
      <button class="btn-jaune h52" data-action="autoriserNotif">Autoriser les notifications</button>
      <button class="btn-gris h52" data-action="sansNotif">Plus tard</button>
    </div>`, 'sansNotif', 'Plus tard');
  }
  if (feuilleNotif === 'installer') {
    return feuille(`<div class="pile12">
      <h2 class="titre-feuille">Notifications indisponibles</h2>
      <p class="gris14 m0">Sur iPhone, les notifications marchent seulement si l’app est installée sur ton écran d’accueil. En attendant, tu auras l’alarme sonore quand l’app est ouverte.</p>
      <button class="btn-jaune h52" data-action="voirAide">Voir comment installer l’app</button>
      <button class="btn-gris h52" data-action="sansNotif">Continuer sans</button>
    </div>`, 'sansNotif', 'Continuer sans');
  }
  return '';
}

// Lance vraiment la séance (compte à rebours 3-2-1)
function lancer() {
  feuilleNotif = null;
  if (!runner.demarrer(etat.recap)) return;
  brancher();
  aller('seance');
}

export const actions = {
  modifierRecap: () => ouvrirEditeur(etat.recap),
  cestParti: () => {
    debloquer(); // dans le geste de l'utilisateur : obligatoire sur iPhone
    const besoin = push.aDemander();
    if (besoin) { feuilleNotif = besoin; push.marquerDemande(); rendre(); return; }
    lancer();
  },
  autoriserNotif: async () => {
    debloquer();
    const p = push.activer(); // la demande de permission part pendant le geste
    lancer();
    await p;
  },
  sansNotif: () => { debloquer(); lancer(); },
  voirAide: () => { feuilleNotif = null; aller('aide'); },
};
