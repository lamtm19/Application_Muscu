/* ================================================================
   ui/aide.js — Aide : installer l'app sur iPhone + Coach IA
================================================================ */
import { entete } from './commun.js';

const ETAPES = [
  'Ouvre le site dans Safari.',
  'Appuie sur l’icône Partager (le carré avec la flèche).',
  'Si besoin, appuie sur « En voir plus ».',
  'Choisis « Sur l’écran d’accueil », puis Ajouter.',
  'Ouvre l’app depuis ton écran d’accueil et autorise les notifications.',
];

export function rendu() {
  return `<div class="ecran">
    ${entete('Aide')}
    <div class="pdc-scroll contenu-page">
      <section class="boite">
        <h2 class="titre-boite">Installer l’app sur ton iPhone</h2>
        <p class="gris13 m0 lh">Indispensable pour recevoir les notifications de reprise.</p>
        ${ETAPES.map((t, i) => `<div class="etape-aide"><span class="num-aide">${i + 1}</span><span>${t}</span></div>`).join('')}
      </section>
      <section class="boite">
        <h2 class="titre-boite">Tes temps de série et de repos</h2>
        <p class="texte-clair">Demande au Coach IA (Gemini) : il règle tes temps de série et de repos directement dans l’app.</p>
        <button class="btn-jaune h48" data-action="allerCoach">Ouvrir le coach</button>
      </section>
    </div>
  </div>`;
}
export const actions = {};
