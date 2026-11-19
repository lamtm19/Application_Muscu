/* ================================================================
   ui/historique.js — Liste des séances faites
================================================================ */
import { donnees } from '../store.js';
import { enMinutes } from '../model.js';
import { entete, esc, dateLisible } from './commun.js';

export function rendu() {
  const h = donnees.historique;
  return `<div class="ecran">
    ${entete('Historique')}
    <div class="pdc-scroll contenu-page g10">
      ${h.length ? h.map(x => `<div class="ligne-histo">
        <div class="pile3"><span class="label-fort">${esc(x.nom)}</span><span class="gris13">${dateLisible(x.date)}</span></div>
        <span class="histo-duree">${enMinutes(x.duree || 0)}</span>
      </div>`).join('') : '<p class="vide">Ton historique apparaîtra ici après ta première séance.</p>'}
    </div>
  </div>`;
}
export const actions = {};
