/* ================================================================
   ui/commun.js — Petits outils partagés par tous les écrans
================================================================ */

// Protège un texte avant de l'insérer dans du HTML
export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Icônes SVG (reprises de la maquette)
export const ICONES = {
  retour: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>',
  historique: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
  cloche: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"></path><path d="M10 21h4"></path></svg>',
  aide: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"></path><path d="M12 17h.01"></path></svg>',
  etoile: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>',
  chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888888" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>',
  points: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle></svg>',
  play: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7z"></path></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
  dossier: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h6l2 2h10v10H3z"></path></svg>',
  reglages: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"></path><circle cx="16" cy="6" r="2"></circle><circle cx="10" cy="12" r="2"></circle><circle cx="18" cy="18" r="2"></circle></svg>',
  circuit: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l3 3-3 3"></path><path d="M4 11V9a4 4 0 0 1 4-4h12"></path><path d="M7 22l-3-3 3-3"></path><path d="M20 13v2a4 4 0 0 1-4 4H4"></path></svg>',
  loupe: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888888" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>',
  croix: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
  bas: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>',
  checkJaune: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8ff00" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Terminé"><path d="M5 12l5 5 9-10"></path></svg>',
  recommencer: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v6h6"></path><path d="M5.5 15a8 8 0 1 0 1-9L4 10"></path></svg>',
  pause: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M8 5v14M16 5v14"></path></svg>',
  reprendre: '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7z"></path></svg>',
  passer: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M6 5l10 7-10 7zM18 5v14"></path></svg>',
  envoyer: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l16-8-6 16-2-7z"></path></svg>',
  crayon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"></path><path d="M14 6l4 4"></path></svg>',
  grandCheck: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>',
};

// En-tête standard : bouton retour + titre
export function entete(titre, action = 'retour') {
  return `<header class="entete">
    <button class="btn-carre" aria-label="Retour" data-action="${action}">${ICONES.retour}</button>
    <h1 class="titre-page">${esc(titre)}</h1>
  </header>`;
}

// Feuille du bas (panneau qui monte depuis le bas de l'écran)
export function feuille(contenu, actionFermer, label = 'Fermer', classe = '') {
  return `<div class="voile">
    <button class="voile-fond" aria-label="${esc(label)}" data-action="${actionFermer}"></button>
    <div class="feuille pdc-scroll ${classe}" role="dialog">
      <div class="poignee"></div>
      ${contenu}
    </div>
  </div>`;
}

// Champ minutes + secondes (temps de série, repos…)
export function champTemps(prefixe, secondes, action, label) {
  const m = Math.floor(secondes / 60), s = secondes % 60;
  return `<div class="ligne-temps">
    <label class="champ-mini"><input type="number" inputmode="numeric" min="0" max="59" value="${m}" data-change="${action}" data-part="m" aria-label="Minutes ${esc(label)}"><span>min</span></label>
    <label class="champ-mini"><input type="number" inputmode="numeric" min="0" max="59" value="${s}" data-change="${action}" data-part="s" aria-label="Secondes ${esc(label)}"><span>s</span></label>
  </div>`;
}

// Lit un champ minutes/secondes et renvoie la nouvelle valeur totale
export function lireTemps(el, ancien) {
  let v = parseInt(el.value, 10);
  if (isNaN(v)) v = 0;
  v = Math.max(0, Math.min(59, v));
  return el.dataset.part === 'm' ? v * 60 + (ancien % 60) : Math.floor(ancien / 60) * 60 + v;
}

// Interrupteur (style maquette)
export function interrupteur(on, action, label, extra = '') {
  return `<button class="inter ${on ? 'on' : ''}" aria-label="${esc(label)}" aria-pressed="${on}" data-action="${action}" ${extra}><span></span></button>`;
}

// Date lisible pour l'historique : « lundi 16 novembre »
export function dateLisible(ts) {
  const d = new Date(ts);
  const auj = new Date();
  const jours = Math.floor((new Date(auj.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (jours === 0) return 'aujourd’hui';
  if (jours === 1) return 'hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
