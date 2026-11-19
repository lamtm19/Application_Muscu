/* ================================================================
   ui/editeur.js — Modifier une séance (le « chemin »)
   + feuille de réglages d'un exercice, + feuille d'un circuit
================================================================ */
import { etat, aller, rendre } from '../app.js';
import { donnees, enregistrerSeance } from '../store.js';
import { duree, enMinutes, nbExos, mmss, trouver, baseDe, creerCircuit, clone } from '../model.js';
import { illu } from '../illustrations.js';
import { esc, ICONES, feuille, champTemps, lireTemps } from './commun.js';

/* ---------- Rendu ---------- */
export function rendu() {
  const D = etat.draft;
  const n = D.items.length;
  const nbC = D.items.filter(x => x.type === 'circuit').length;
  const dossiers = donnees.dossiers.filter(d => !d.preset);

  const items = D.items.map((x, i) => {
    let bloc;
    if (x.type === 'circuit') {
      bloc = `<div class="etape-circuit">
        <div class="rail">
          <div class="pastille-circuit">${ICONES.circuit}</div>
          <div class="rail-trait"></div>
        </div>
        <div class="carte-circuit">
          <div class="circuit-haut">
            <span class="circuit-nom">${esc(x.nom || 'Circuit')}</span>
            <span class="x-grand">x${x.tours}</span>
            <button class="btn-reglage" aria-label="Réglages du circuit" data-action="ouvrir" data-id="${x.id}">${ICONES.reglages}</button>
          </div>
          ${x.exos.map(c => `<div class="circuit-exo">
            <span class="vignette v48">${illu(c.kind, 46, 34)}</span>
            <span class="circuit-exo-nom">${esc(c.nom)}</span>
            <button class="btn-reglage-discret" aria-label="Réglages de l’exercice" data-action="ouvrir" data-id="${c.id}">${ICONES.reglages.replace(/20/g, '18')}</button>
          </div>`).join('')}
          <button class="btn-ajout-circuit" data-action="ajouterAuCircuit" data-id="${x.id}">+ Ajouter au circuit</button>
          <div class="pilule-repos petite">
            <button aria-label="Moins 15 secondes" data-action="reposTour" data-i="${i}" data-d="-15">−</button>
            <span>Entre tours : <strong>${mmss(x.reposTour)}</strong></span>
            <button aria-label="Plus 15 secondes" data-action="reposTour" data-i="${i}" data-d="15">+</button>
          </div>
        </div>
      </div>`;
    } else {
      bloc = `<div class="etape-exo">
        <div class="pastille-exo">${illu(x.kind, 60, 45)}</div>
        <div class="carte-exo">
          <span class="carte-exo-nom">${esc(x.nom)}</span>
          <span class="x-grand">x${x.series}</span>
          <button class="btn-reglage" aria-label="Réglages de l’exercice" data-action="ouvrir" data-id="${x.id}">${ICONES.reglages}</button>
        </div>
      </div>`;
    }
    const pause = i < n - 1 ? `<div class="entre-deux">
        <div class="rail-pause"><div></div></div>
        <div class="pilule-repos">
          <button aria-label="Moins 15 secondes" data-action="reposApres" data-i="${i}" data-d="-15">−</button>
          <span>Pause : <strong>${mmss(x.reposApres)}</strong></span>
          <button aria-label="Plus 15 secondes" data-action="reposApres" data-i="${i}" data-d="15">+</button>
        </div>
      </div>` : '';
    return `<div class="item-chemin">${bloc}${pause}</div>`;
  }).join('');

  return `<div class="ecran">
    <header class="entete-editeur">
      <button class="btn-carre" aria-label="Retour" data-action="retourEditeur">${ICONES.retour}</button>
      <div class="editeur-titres">
        <input class="input-nom-seance" aria-label="Nom de la séance" value="${esc(D.nom)}" data-change="nomSeance" maxlength="60">
        <label class="choix-dossier">${ICONES.dossier}
          <select aria-label="Dossier" data-change="dossier">
            ${dossiers.map(d => `<option value="${d.id}" ${d.id === (D.dossier || 'perso') ? 'selected' : ''}>${esc(d.nom)}</option>`).join('')}
          </select>
        </label>
      </div>
      <button class="btn-carre jaune" aria-label="Adapter avec le coach IA" data-action="allerCoach">${ICONES.etoile.replace('2.2', '2')}</button>
    </header>
    <div class="pdc-scroll contenu-editeur">
      ${D.copie ? '<p class="bandeau-copie">Copie d’une séance d’exemple : elle sera enregistrée dans tes dossiers.</p>' : ''}
      ${n === 0 ? '<p class="gris14 m0 mb14">Ajoute un exercice ou un circuit pour commencer.</p>' : ''}
      ${items}
      <div class="ligne-ajout">
        <button class="btn-ajout" data-action="ajouterExo">${ICONES.plus}Exercice</button>
        <button class="btn-ajout jaune" data-action="ajouterCircuit">${ICONES.plus}Circuit</button>
      </div>
    </div>
    <div class="barre-bas barre-editeur">
      <div class="editeur-total">
        <span class="gris12">Durée totale estimée</span>
        <span class="total-grand">${enMinutes(duree(D))}</span>
        <span class="gris12">${nbExos(D)} exercices${nbC ? ' · ' + nbC + ' circuit' + (nbC > 1 ? 's' : '') : ''}</span>
      </div>
      <button class="btn-jaune h54 px24" data-action="enregistrer">Enregistrer</button>
    </div>
    ${rendreFeuille()}
  </div>`;
}

function rendreFeuille() {
  const f = etat.sheetId ? trouver(etat.draft, etat.sheetId) : null;
  if (!f) return '';
  if (f.obj.type === 'circuit') return feuilleCircuit(f.obj);
  return feuilleExo(f.obj, f.circuit, { fermer: 'fermerFeuille', retirer: 'retirerExo' });
}

/* ---------- Feuille de réglages d'un exercice (réutilisée par le live edit) ---------- */
export function feuilleExo(X, circuit, { fermer, retirer, titreBouton = 'Appliquer' }) {
  const B = baseDe(donnees.lib, X.key);
  const enC = !!circuit;
  const series = enC ? Math.min(X.series, circuit.tours) : X.series;
  const chips = (enC ? [0, 10, 15, 30] : [60, 90, 120, 150]).map(v =>
    `<button class="chip-repos ${X.repos === v ? 'on' : ''}" data-action="exoRepos" data-v="${v}">${mmss(v)}</button>`).join('');
  const contenu = `
    <div class="feuille-entete-exo">
      <div class="vignette v132">${illu(X.kind, 128, 96)}</div>
      <div class="pile4 min0">
        <h2 class="titre-feuille l1">${esc(X.nom)}</h2>
        <span class="gris13">${esc(X.muscle)}</span>
      </div>
    </div>
    ${X.key === 'perso' ? `<label class="champ-label"><span>Nom de l’exercice</span><input class="champ" value="${esc(X.nom)}" data-change="exoNom" maxlength="60"></label>` : ''}
    <div class="ligne-entre">
      <span class="label-fort">${enC ? 'Séries dans ce circuit' : 'Nombre de séries'}</span>
      <div class="compteur">
        <button aria-label="Une série de moins" data-action="exoSeries" data-d="-1">−</button>
        <span>x${series}</span>
        <button aria-label="Une série de plus" data-action="exoSeries" data-d="1">+</button>
      </div>
    </div>
    <div class="pile8">
      <div class="ligne-entre">
        <span class="label-fort jaune">Temps de série</span>
        <button class="lien-conseil" data-action="exoConseil">Conseillé : ${mmss(B.serie) + (enC ? '' : ' / ' + mmss(B.repos))}</button>
      </div>
      ${champTemps('serie', X.serie, 'exoSerie', 'de série')}
    </div>
    <div class="pile8">
      <span class="label-fort rouge">${enC ? 'Repos avant l’exo suivant du circuit' : 'Repos entre les séries'}</span>
      ${champTemps('repos', X.repos, 'exoReposTemps', 'de repos')}
      <div class="ligne-chips">${chips}</div>
    </div>
    <label class="champ-label"><span>Notes</span><textarea class="champ zone" rows="2" data-change="exoNote" placeholder="Charge, répétitions, prise… (ex : 60 kg · 10 reps)">${esc(X.note)}</textarea></label>
    <div class="ligne10">
      ${retirer ? `<button class="btn-danger h52 px18" data-action="${retirer}">Retirer</button>` : ''}
      <button class="btn-jaune h52 flex1" data-action="${fermer}">${titreBouton}</button>
    </div>`;
  return feuille(contenu, fermer, 'Fermer les réglages', 'feuille-reglages');
}

/* Actions de la feuille exo, partagées avec le live edit.
   « obtenir » renvoie { obj, circuit } de l'exo à modifier. */
export function actionsFeuilleExo(obtenir, apres) {
  // Les champs (« change ») ne redessinent pas : sinon le toucher sur « Appliquer » serait perdu
  const maj = (fn, redessiner = true) => { const f = obtenir(); if (f) { fn(f.obj, f); if (redessiner) apres(); } };
  return {
    actions: {
      exoSeries: el => maj((o, f) => {
        const d = parseInt(el.dataset.d, 10);
        const max = f.circuit ? f.circuit.tours : 12;
        o.series = Math.max(1, Math.min(max, Math.min(o.series, max) + d));
      }),
      exoConseil: () => maj((o, f) => { const B = baseDe(donnees.lib, o.key); o.serie = B.serie; if (!f.circuit) o.repos = B.repos; }),
      exoRepos: el => maj(o => { o.repos = parseInt(el.dataset.v, 10); }),
    },
    changes: {
      exoSerie: el => maj(o => { o.serie = Math.max(1, lireTemps(el, o.serie)); }, false),
      exoReposTemps: el => maj(o => { o.repos = lireTemps(el, o.repos); }, false),
      exoNote: el => maj(o => { o.note = el.value; }, false),
      exoNom: el => maj(o => { o.nom = el.value.trim() || 'Exercice perso'; }, false),
    },
  };
}

/* ---------- Feuille d'un circuit ---------- */
function feuilleCircuit(C) {
  const contenu = `
    <div class="pile4">
      <input class="input-nom-circuit" aria-label="Nom du circuit" value="${esc(C.nom || 'Circuit')}" data-change="circuitNom" maxlength="40">
      <p class="gris14 m0">Tu alternes les exercices du bloc : pendant que tu fais l’un, les muscles de l’autre récupèrent. Un exercice peut avoir moins de séries que les autres (il saute alors les derniers tours).</p>
    </div>
    <div class="ligne-entre">
      <span class="label-fort">Nombre de tours</span>
      <div class="compteur">
        <button aria-label="Un tour de moins" data-action="circuitTours" data-d="-1">−</button>
        <span>x${C.tours}</span>
        <button aria-label="Un tour de plus" data-action="circuitTours" data-d="1">+</button>
      </div>
    </div>
    <div class="pile8">
      <span class="label-fort rouge">Repos entre deux tours</span>
      ${champTemps('rt', C.reposTour, 'circuitRepos', 'entre deux tours')}
    </div>
    <div class="ligne10">
      <button class="btn-danger h52 px18" data-action="retirerExo">Retirer</button>
      <button class="btn-jaune h52 flex1" data-action="fermerFeuille">Appliquer</button>
    </div>`;
  return feuille(contenu, 'fermerFeuille', 'Fermer les réglages', 'feuille-reglages');
}

/* ---------- Actions ---------- */
// Modifie le brouillon puis redessine
function upd(fn) { fn(etat.draft); rendre(); }
function majFeuille(fn) { upd(d => { const f = trouver(d, etat.sheetId); if (f) fn(f.obj, f); }); }

const feuilleExoActions = actionsFeuilleExo(() => trouver(etat.draft, etat.sheetId), () => rendre());

export const actions = {
  ...feuilleExoActions.actions,
  retourEditeur: () => aller('accueil', { draft: null, sheetId: null }),
  ouvrir: el => { etat.sheetId = el.dataset.id; rendre(); },
  fermerFeuille: () => { etat.sheetId = null; rendre(); },
  retirerExo: () => { majFeuille((o, f) => f.liste.splice(f.idx, 1)); etat.sheetId = null; rendre(); },
  reposApres: el => upd(d => { const it = d.items[+el.dataset.i]; it.reposApres = Math.max(0, Math.min(900, it.reposApres + +el.dataset.d)); }),
  reposTour: el => upd(d => { const it = d.items[+el.dataset.i]; it.reposTour = Math.max(0, Math.min(900, it.reposTour + +el.dataset.d)); }),
  circuitTours: el => majFeuille(o => {
    if (+el.dataset.d > 0) {
      // Les exos qui faisaient tous les tours en font un de plus
      o.exos.forEach(e => { if (e.series >= o.tours) e.series = o.tours + 1; });
      o.tours = Math.min(10, o.tours + 1);
    } else o.tours = Math.max(1, o.tours - 1);
  }),
  ajouterExo: () => aller('biblio', { cible: null, selection: [], recherche: '' }),
  ajouterCircuit: () => {
    const c = creerCircuit();
    etat.draft.items.push(c);
    aller('biblio', { cible: c.id, selection: [], recherche: '' });
  },
  ajouterAuCircuit: el => aller('biblio', { cible: el.dataset.id, selection: [], recherche: '' }),
  enregistrer: () => {
    const d = clone(etat.draft);
    delete d.copie;
    if (!d.nom.trim()) d.nom = 'Nouvelle séance';
    enregistrerSeance(d);
    aller('accueil', { draft: null, sheetId: null });
  },
};

export const changes = {
  ...feuilleExoActions.changes,
  nomSeance: el => { etat.draft.nom = el.value; },
  dossier: el => { etat.draft.dossier = el.value; },
  circuitNom: el => { const f = trouver(etat.draft, etat.sheetId); if (f) f.obj.nom = el.value.trim() || 'Circuit'; },
  circuitRepos: el => { const f = trouver(etat.draft, etat.sheetId); if (f) f.obj.reposTour = lireTemps(el, f.obj.reposTour); },
};
