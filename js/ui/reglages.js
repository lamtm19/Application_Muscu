/* ================================================================
   ui/reglages.js — Notifications & son
================================================================ */
import { rendre } from '../app.js';
import { donnees, majReglages } from '../store.js';
import { debloquer } from '../audio.js';
import { entete, interrupteur, esc } from './commun.js';
import * as push from '../push.js';

const INTERRUPTEURS = [
  ['decompte', 'Bips 3, 2, 1', 'Un bip à chacune des 3 dernières secondes du repos'],
  ['avant', 'Alerte avant la reprise', 'Te prévient quelques secondes avant la fin du repos'],
  ['reprise', 'Alerte « C’est reparti »', 'Au moment exact où la série doit commencer'],
  ['fin', 'Fin de série', 'Signal quand le temps de série est écoulé'],
  ['ecran', 'Garder l’écran allumé', 'Bips précis à la seconde ; écran verrouillé, les notifications prennent le relais'],
];
const MUSIQUE = [
  ['baisser', 'Baisser la musique', 'Le volume baisse pendant le bip puis remonte, comme Waze (à confirmer sur ton iPhone)'],
  ['melanger', 'Bip par-dessus la musique', 'La musique continue au même volume, le bip passe par-dessus'],
  ['rien', 'Notifications seulement', 'Aucun son de l’app, juste la notification'],
];

function apercuNotif(titre) {
  return `<div class="notif-apercu">
    <img src="logoApp.png" alt="">
    <div class="flex1 pile2"><div class="ligne-entre"><span class="notif-titre">${esc(titre)}</span><span class="gris12">maintenant</span></div><span class="notif-texte">Développé couché · série 3/4</span></div>
  </div>`;
}

export function rendu() {
  const R = donnees.reglages;
  const toggles = INTERRUPTEURS.map(([k, titre, desc], i) => `
    <div class="ligne-toggle ${i ? 'sep' : ''}">
      <div class="ligne-toggle-haut">
        <div class="flex1 pile3"><span class="label-fort">${titre}</span><span class="gris13">${desc}</span></div>
        ${interrupteur(!!R[k], 'basculer', titre, `data-k="${k}"`)}
      </div>
      ${k === 'avant' && R.avant ? `<div class="segments">
        ${[10, 15, 20].map(v => `<button class="segment ${R.avantS === v ? 'on' : ''}" data-action="avantS" data-v="${v}">${v} s avant</button>`).join('')}
      </div>` : ''}
    </div>`).join('');

  const musique = MUSIQUE.map(([k, titre, desc]) => `
    <button class="choix-radio ${R.musique === k ? 'on' : ''}" data-action="musique" data-k="${k}">
      <span class="radio"><span></span></span>
      <span class="pile3"><span class="label-fort">${titre}</span><span class="gris13">${desc}</span></span>
    </button>`).join('');

  const etatPush = push.etatLisible();

  return `<div class="ecran">
    ${entete('Notifications & son')}
    <div class="pdc-scroll contenu-page">
      <h2 class="sous-titre">APERÇU SUR L’ÉCRAN VERROUILLÉ</h2>
      <div class="pile8">${apercuNotif('Reprise dans ' + R.avantS + ' s')}${apercuNotif('C’est reparti !')}</div>
      <h2 class="sous-titre mt10">ALERTES</h2>
      <p class="gris13 m0 lh">App ouverte à l’écran : alarme sonore seulement. Écran verrouillé ou autre app : notification avec son.</p>
      ${etatPush ? `<p class="info-push">${etatPush.texte}${etatPush.action ? ` <button class="lien-jaune" data-action="${etatPush.action}">${etatPush.lien}</button>` : ''}</p>` : ''}
      <div class="boite-toggles">${toggles}</div>
      <h2 class="sous-titre mt10">PENDANT TA MUSIQUE</h2>
      <div class="pile8">${musique}</div>
    </div>
  </div>`;
}

export const actions = {
  basculer: el => { const k = el.dataset.k; majReglages({ [k]: !donnees.reglages[k] }); rendre(); },
  avantS: el => { majReglages({ avantS: parseInt(el.dataset.v, 10) }); rendre(); },
  musique: el => { majReglages({ musique: el.dataset.k }); rendre(); },
  activerNotif: async () => { debloquer(); await push.activer(); rendre(); },
};
