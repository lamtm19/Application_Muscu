/* ================================================================
   ui/biblio.js — Ajouter un ou plusieurs exercices (sélection numérotée)
================================================================ */
import { etat, aller, rendre } from '../app.js';
import { donnees } from '../store.js';
import { creerExo, trouver, normaliser } from '../model.js';
import { illu } from '../illustrations.js';
import { esc, ICONES } from './commun.js';

const FILTRES = [['tout', 'Tout'], ['muscu', 'Muscu'], ['street', 'Street workout']];

function liste() {
  const q = normaliser(etat.recherche);
  return donnees.lib.filter(e =>
    (etat.filtre === 'tout' || e.cats.includes(etat.filtre)) &&
    (!q || normaliser(e.nom + ' ' + e.muscle).includes(q)));
}

// Partie qui change pendant la frappe (redessinée sans toucher au champ de recherche)
function rendreListe() {
  const items = liste();
  const txt = etat.recherche.trim();
  return `<p class="gris13 m0">${etat.cible ? 'Sélectionne tous les exercices du circuit, dans l’ordre.' : 'Sélectionne un ou plusieurs exercices.'}</p>
    ${items.length === 0 ? '<p class="gris14 my4">Pas trouvé dans la base. Crée-le, il sera réglable comme les autres.</p>' : ''}
    <button class="btn-creer" data-action="creerPerso">${ICONES.plus}${txt ? 'Créer « ' + esc(txt) + ' »' : 'Créer un exercice perso'}</button>
    ${items.map(e => {
      const i0 = etat.selection.indexOf(e.key);
      return `<button class="ligne-biblio ${i0 >= 0 ? 'sel' : ''}" data-action="basculer" data-key="${e.key}" aria-pressed="${i0 >= 0}">
        <span class="vignette v80">${illu(e.kind, 78, 58)}</span>
        <span class="biblio-txt"><span class="biblio-nom">${esc(e.nom)}</span><span class="gris12">${esc(e.muscle)}</span></span>
        ${i0 >= 0 ? `<span class="ordre">${i0 + 1}</span>` : '<span class="ordre-vide"></span>'}
      </button>`;
    }).join('')}`;
}

function rendreBas() {
  const n = etat.selection.length;
  if (!n) return '';
  return `<div class="barre-bas"><button class="btn-jaune h54 w100" data-action="valider">Ajouter ${n} exercice${n > 1 ? 's' : ''}${etat.cible ? ' au circuit' : ''}</button></div>`;
}

export function rendu() {
  return `<div class="ecran">
    <header class="entete-biblio">
      <div class="ligne10 centre">
        <button class="btn-carre" aria-label="Retour" data-action="retourBiblio">${ICONES.retour}</button>
        <h1 class="titre-page">${etat.cible ? 'Ajouter au circuit' : 'Ajouter un exercice'}</h1>
      </div>
      <label class="recherche">${ICONES.loupe}
        <input value="${esc(etat.recherche)}" data-input="recherche" placeholder="Rechercher (pecs, squat, biceps…)" aria-label="Rechercher un exercice" autocomplete="off" enterkeyhint="search">
      </label>
      <div class="ligne6">
        ${FILTRES.map(([k, t]) => `<button class="filtre ${etat.filtre === k ? 'on' : ''}" data-action="filtre" data-k="${k}">${t}</button>`).join('')}
      </div>
    </header>
    <div class="pdc-scroll contenu-biblio" id="liste-biblio">${rendreListe()}</div>
    <div id="bas-biblio">${rendreBas()}</div>
  </div>`;
}

function majPartielle() {
  document.getElementById('liste-biblio').innerHTML = rendreListe();
  document.getElementById('bas-biblio').innerHTML = rendreBas();
}

export const actions = {
  retourBiblio: () => {
    // Circuit tout juste créé puis abandonné sans exercice : on le retire
    if (etat.cible && etat.draft) etat.draft.items = etat.draft.items.filter(it => it.id !== etat.cible || it.exos.length);
    aller('editeur', { cible: null, selection: [], recherche: '' });
  },
  filtre: el => { etat.filtre = el.dataset.k; rendre(); },
  basculer: el => {
    const k = el.dataset.key, i = etat.selection.indexOf(k);
    if (i >= 0) etat.selection.splice(i, 1); else etat.selection.push(k);
    majPartielle();
  },
  valider: () => {
    const d = etat.draft;
    const c = etat.cible ? trouver(d, etat.cible) : null;
    etat.selection.forEach(k => {
      if (c) c.obj.exos.push(creerExo(donnees.lib, k, { series: c.obj.tours, repos: 15 }));
      else d.items.push(creerExo(donnees.lib, k));
    });
    aller('editeur', { sheetId: null, recherche: '', cible: null, selection: [] });
  },
  creerPerso: () => {
    const nom = etat.recherche.trim() || 'Nouvel exercice';
    const d = etat.draft;
    const c = etat.cible ? trouver(d, etat.cible) : null;
    const nx = creerExo(donnees.lib, 'perso', { nom, series: c ? c.obj.tours : 3, repos: c ? 15 : 90 });
    if (c) c.obj.exos.push(nx); else d.items.push(nx);
    // On ouvre directement ses réglages pour pouvoir le renommer
    aller('editeur', { sheetId: nx.id, recherche: '', cible: null, selection: [] });
  },
};

export const saisies = {
  recherche: el => { etat.recherche = el.value; majPartielle(); },
};
