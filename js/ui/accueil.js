/* ================================================================
   ui/accueil.js — Écran d'accueil : dossiers et séances
================================================================ */
import { etat, aller, rendre } from '../app.js';
import { donnees, majDossier, nouveauDossier, supprimerDossier, dossierDe } from '../store.js';
import { duree, enMinutes, nbExos, etapes, clone, uid } from '../model.js';
import { esc, ICONES, feuille } from './commun.js';

export function rendu() {
  const visibles = donnees.dossiers.filter(d => !d.masque);
  const masques = donnees.dossiers.filter(d => d.masque).length;

  const dossiersHtml = visibles.map(d => {
    const liste = donnees.seances.filter(s => s.dossier === d.id);
    const cartes = liste.map(s => `
      <article class="carte-seance">
        <div class="carte-haut">
          <div class="carte-titres">
            <h3>${esc(s.nom)}</h3>
            <span class="gris13">${nbExos(s)} exercices</span>
          </div>
          <span class="carte-duree">${enMinutes(duree(s))}</span>
        </div>
        <div class="carte-boutons">
          ${etapes(s).length
            ? `<button class="btn-jaune h46" data-action="lancer" data-id="${s.id}">${ICONES.play}Lancer</button>`
            : `<button class="btn-gris h46 flex1" data-action="modifier" data-id="${s.id}">Séance vide</button>`}
          <button class="btn-contour h46" data-action="modifier" data-id="${s.id}">Modifier</button>
        </div>
      </article>`).join('');
    return `<section class="dossier">
      <div class="dossier-ligne">
        <button class="dossier-titre" data-action="basculer" data-id="${d.id}" aria-label="${(d.ouvert ? 'Replier ' : 'Déplier ') + esc(d.nom)}">
          <span class="chevron ${d.ouvert ? 'ouvert' : ''}">${ICONES.chevron}</span>
          <span class="dossier-nom">${esc(d.nom)}</span>
          <span class="gris13">${liste.length}</span>
          ${d.preset ? '<span class="etiquette">EXEMPLES</span>' : ''}
        </button>
        <button class="btn-points" aria-label="Options du dossier" data-action="optionsDossier" data-id="${d.id}">${ICONES.points}</button>
      </div>
      ${d.ouvert ? `<div class="dossier-contenu">
        ${liste.length ? cartes : '<p class="vide">Aucune séance ici pour l’instant.</p>'}
      </div>` : ''}
    </section>`;
  }).join('');

  return `<div class="ecran">
    <header class="entete-accueil">
      <img src="logo.png" alt="Pause du Champion" class="logo">
      <div class="boutons-haut">
        <button class="btn-carre" aria-label="Historique" data-action="allerHistorique">${ICONES.historique}</button>
        <button class="btn-carre" aria-label="Notifications et son" data-action="allerReglages">${ICONES.cloche}</button>
        <button class="btn-carre" aria-label="Aide" data-action="allerAide">${ICONES.aide}</button>
      </div>
    </header>
    <div class="pdc-scroll contenu-accueil">
      <button class="btn-coach" data-action="allerCoach">
        <span class="pastille-coach">${ICONES.etoile}</span>
        <span class="btn-coach-txt">Coach IA</span>
        ${ICONES.chevron}
      </button>
      ${dossiersHtml}
      <div class="ligne-pilules">
        <button class="pilule-pointillee" data-action="nouveauDossier">+ Nouveau dossier</button>
        ${masques ? `<button class="pilule-grise" data-action="afficherMasques">Afficher les dossiers masqués (${masques})</button>` : ''}
      </div>
    </div>
    <div class="barre-bas">
      <button class="btn-nouvelle" data-action="nouvelleSeance">${ICONES.plus}Nouvelle séance</button>
    </div>
    ${rendreFeuilleDossier()}
  </div>`;
}

function rendreFeuilleDossier() {
  const D = donnees.dossiers.find(d => d.id === etat.dossierSheet);
  if (!D) return '';
  let contenu;
  if (!D.preset) {
    const supprimable = D.id !== 'perso';
    contenu = `<div class="pile14">
      <label class="champ-label"><span>Nom du dossier</span><input class="champ" value="${esc(D.nom)}" data-change="nomDossier" maxlength="40"></label>
      <div class="ligne10">
        ${supprimable ? '<button class="btn-danger h52" data-action="supprimerDossier">Supprimer</button>' : ''}
        <button class="btn-jaune h52 flex1" data-action="fermerDossier">OK</button>
      </div>
      ${supprimable ? '<p class="gris13 m0">Si tu le supprimes, ses séances retournent dans « Mes séances ».</p>' : ''}
    </div>`;
  } else {
    contenu = `<div class="pile12">
      <h2 class="titre-feuille">${esc(D.nom)}</h2>
      <p class="gris14 m0">Des séances d’exemple pour bien démarrer. Si tu en modifies une, une copie est enregistrée dans « Mes séances ».</p>
      <button class="btn-gris h52" data-action="masquerDossier">Masquer ce dossier</button>
    </div>`;
  }
  return feuille(contenu, 'fermerDossier', 'Fermer');
}

// Ouvre l'éditeur sur une séance (copie si c'est une séance d'exemple)
export function ouvrirEditeur(s) {
  const d = clone(s);
  const dos = dossierDe(s);
  if (dos && dos.preset) { d.id = uid('s'); d.dossier = 'perso'; d.copie = true; }
  aller('editeur', { draft: d, sheetId: null });
}

export const actions = {
  basculer: el => { const d = donnees.dossiers.find(x => x.id === el.dataset.id); majDossier(d.id, { ouvert: !d.ouvert }); rendre(); },
  optionsDossier: el => { etat.dossierSheet = el.dataset.id; rendre(); },
  fermerDossier: () => { etat.dossierSheet = null; rendre(); },
  masquerDossier: () => { majDossier(etat.dossierSheet, { masque: true }); etat.dossierSheet = null; rendre(); },
  supprimerDossier: () => { supprimerDossier(etat.dossierSheet); etat.dossierSheet = null; rendre(); },
  nouveauDossier: () => { const d = nouveauDossier(); etat.dossierSheet = d.id; rendre(); },
  afficherMasques: () => { donnees.dossiers.forEach(d => { if (d.masque) majDossier(d.id, { masque: false }); }); rendre(); },
  lancer: el => {
    const s = donnees.seances.find(x => x.id === el.dataset.id);
    if (s && etapes(s).length) aller('recap', { recap: clone(s) });
  },
  modifier: el => { const s = donnees.seances.find(x => x.id === el.dataset.id); if (s) ouvrirEditeur(s); },
  nouvelleSeance: () => aller('editeur', { draft: { id: uid('s'), dossier: 'perso', nom: 'Nouvelle séance', items: [] }, sheetId: null }),
};

export const changes = {
  nomDossier: el => { const v = el.value.trim() || 'Sans nom'; majDossier(etat.dossierSheet, { nom: v }); },
};
