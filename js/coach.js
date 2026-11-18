/* ================================================================
   coach.js — Écran Coach IA (Gemini, via /api/coach)
   - Les choix proposés par le coach s'affichent en boutons.
   - Texte libre accepté (champ en 16 px : pas de zoom sur iPhone).
   - Limite : 20 messages par jour et par appareil.
================================================================ */
import { etat, aller, rendre } from './app.js';
import { donnees, enregistrerSeance, lire, ecrire } from './store.js';
import { creerExo, creerCircuit, duree, enMinutes, uid } from './model.js';
import { esc, ICONES } from './ui/commun.js';

const LIMITE_JOUR = 20;
const K_COMPTEUR = 'pdc2_coach_compteur';
const ACCUEIL = 'Salut ! Je suis ton coach. Je peux créer une séance de zéro, importer une séance que tu as déjà écrite, ou adapter une de tes séances. On fait quoi ?';
const CHOIX_DEPART = ['Créer de zéro', 'Importer ma séance', 'Adapter une séance'];

// Conversation (gardée tant que l'app est ouverte)
let chat = [{ role: 'ia', text: ACCUEIL }];
let historiqueApi = [{ role: 'model', text: ACCUEIL }];
let choix = [...CHOIX_DEPART];
let attente = false;
let saisie = '';

/* ---------- Compteur journalier ---------- */
function aujourdHui() { return new Date().toISOString().slice(0, 10); }
function messagesRestants() {
  const c = lire(K_COMPTEUR, {});
  return c.jour === aujourdHui() ? Math.max(0, LIMITE_JOUR - c.n) : LIMITE_JOUR;
}
function compterMessage() {
  const c = lire(K_COMPTEUR, {});
  const n = c.jour === aujourdHui() ? c.n + 1 : 1;
  ecrire(K_COMPTEUR, { jour: aujourdHui(), n });
}

/* ---------- Séances envoyées comme contexte (pour « adapter ») ---------- */
function contexteSeances() {
  return donnees.seances.filter(s => s.dossier !== 'debut' && s.dossier !== 'street').map(s => ({
    id: s.id, nom: s.nom,
    items: s.items.map(it => it.type === 'circuit'
      ? { type: 'circuit', nom: it.nom, tours: it.tours, reposTour: it.reposTour, reposApres: it.reposApres,
          exos: it.exos.map(e => ({ key: e.key, nom: e.nom, series: e.series, serie: e.serie, repos: e.repos, note: e.note })) }
      : { type: 'exo', key: it.key, nom: it.nom, series: it.series, serie: it.serie, repos: it.repos, reposApres: it.reposApres, note: it.note }),
  }));
}

/* ---------- Transforme la réponse de l'IA en vraies séances ---------- */
const entier = (v, min, max, defaut) => { const n = Math.round(Number(v)); return isNaN(n) ? defaut : Math.max(min, Math.min(max, n)); };

function exoDepuisIA(e, enCircuit, tours) {
  const lib = donnees.lib;
  const connu = lib.some(b => b.key === e.key);
  const o = {};
  if (!connu || e.key === 'perso') o.nom = e.nom || 'Exercice perso';
  if (e.series !== undefined) o.series = entier(e.series, 1, enCircuit ? tours : 12, 3);
  if (e.serie !== undefined) o.serie = entier(e.serie, 5, 900, 40);
  if (e.repos !== undefined) o.repos = entier(e.repos, 0, 900, 90);
  if (e.reposApres !== undefined) o.reposApres = entier(e.reposApres, 0, 900, 120);
  if (e.note) o.note = String(e.note).slice(0, 120);
  if (enCircuit && o.series === undefined) o.series = tours;
  if (enCircuit && o.repos === undefined) o.repos = 15;
  return creerExo(lib, connu ? e.key : 'perso', o);
}

function seanceDepuisIA(s) {
  const items = (s.items || []).map(it => {
    if (it.type === 'circuit') {
      const tours = entier(it.tours, 1, 10, 3);
      return creerCircuit({
        nom: it.nom || 'Circuit', tours,
        reposTour: entier(it.reposTour, 0, 900, 90),
        reposApres: entier(it.reposApres, 0, 900, 120),
        exos: (it.exos || []).map(e => exoDepuisIA(e, true, tours)),
      });
    }
    return exoDepuisIA(it, false, 0);
  }).filter(Boolean);
  const existante = s.id && donnees.seances.find(x => x.id === s.id && x.dossier !== 'debut' && x.dossier !== 'street');
  return {
    id: existante ? existante.id : uid('s'),
    nom: String(s.nom || 'Séance du coach').slice(0, 60),
    dossier: existante ? existante.dossier : 'perso',
    items,
    _maj: !!existante,
  };
}

/* ---------- Envoi d'un message ---------- */
async function envoyer(texte) {
  texte = String(texte || '').trim();
  if (!texte || attente) return;
  chat.push({ role: 'moi', text: texte });
  historiqueApi.push({ role: 'user', text: texte });
  choix = [];
  saisie = '';

  if (messagesRestants() <= 0) {
    chat.push({ role: 'ia', text: 'Tu as utilisé tes 20 messages du jour avec le coach. Reviens demain, tes séances restent modifiables à la main en attendant.' });
    rendre(); return;
  }
  attente = true;
  rendre();
  compterMessage();

  try {
    const rep = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: historiqueApi.slice(-20), seances: contexteSeances() }),
    });
    const d = await rep.json().catch(() => null);
    if (!rep.ok || !d || !d.texte) throw new Error((d && d.erreur) || 'Erreur');
    historiqueApi.push({ role: 'model', text: JSON.stringify(d) });
    chat.push({ role: 'ia', text: d.texte });
    if (d.type === 'seances' && Array.isArray(d.seances) && d.seances.length) {
      const seances = d.seances.map(seanceDepuisIA).filter(s => s.items.length);
      if (seances.length) {
        const maj = seances.length === 1 && seances[0]._maj;
        chat.push({ role: 'carte', carte: {
          titre: maj ? 'SÉANCE MODIFIÉE' : seances.length > 1 ? 'PROGRAMME PROPOSÉ' : 'SÉANCE PROPOSÉE',
          btn: maj ? 'Mettre à jour la séance' : seances.length > 1 ? 'Ajouter les ' + seances.length + ' séances' : 'Ajouter à mes séances',
          seances, valide: false, maj,
        } });
      }
      choix = ['Nouvelle demande'];
    } else {
      choix = Array.isArray(d.choix) ? d.choix.slice(0, 4).map(String) : [];
    }
  } catch (e) {
    chat.push({ role: 'ia', text: 'Le coach ne répond pas pour l’instant (connexion ou limite gratuite atteinte). Réessaie dans un moment.' });
    historiqueApi.pop();
    choix = [];
  }
  attente = false;
  rendre();
}

/* ---------- Rendu ---------- */
export function rendu() {
  const bulles = chat.map((m, i) => {
    if (m.role === 'ia') return `<div class="bulle-ia">${esc(m.text)}</div>`;
    if (m.role === 'moi') return `<div class="bulle-moi">${esc(m.text)}</div>`;
    const c = m.carte;
    return `<div class="carte-coach">
      <span class="carte-coach-titre">${esc(c.titre)}</span>
      ${c.seances.map(s => `<div class="carte-coach-item">
        <span class="label-fort14">${esc(s.nom)} · ${enMinutes(duree(s))}</span>
        <span class="gris12">${esc(s.items.map(e => e.type === 'circuit' ? (e.nom || 'Circuit') + ' ×' + e.tours : e.nom + ' ×' + e.series).join(', '))}</span>
      </div>`).join('')}
      ${c.valide ? `<span class="valide">${c.maj ? 'Séance mise à jour' : 'Ajouté dans « Mes séances »'}</span>`
        : `<button class="btn-jaune h48" data-action="valider" data-i="${i}">${esc(c.btn)}</button>`}
    </div>`;
  }).join('');

  return `<div class="ecran">
    <header class="entete bordure">
      <button class="btn-carre" aria-label="Retour" data-action="retourCoach">${ICONES.retour}</button>
      <span class="pastille-coach">${ICONES.etoile.replace('2.2', '2')}</span>
      <div class="pile0">
        <span class="titre-coach">Coach IA</span>
        <span class="gris12">Propulsé par Gemini, l’IA de Google</span>
      </div>
    </header>
    <div class="pdc-scroll contenu-coach" id="fil-coach">
      ${bulles}
      ${attente ? '<div class="bulle-ia attente"><span></span><span></span><span></span></div>' : ''}
    </div>
    <div class="bas-coach">
      ${choix.length ? `<div class="pdc-scroll ligne-choix">${choix.map((c, i) => `<button class="choix-coach" data-action="choix" data-i="${i}">${esc(c)}</button>`).join('')}</div>` : ''}
      <div class="ligne8">
        <input class="champ-coach" value="${esc(saisie)}" data-input="saisie" data-entree="envoyer" placeholder="Écris ou colle ta séance…" aria-label="Message au coach" enterkeyhint="send" autocomplete="off">
        <button class="btn-envoyer" aria-label="Envoyer" data-action="envoyer">${ICONES.envoyer}</button>
      </div>
    </div>
  </div>`;
}

// Fait défiler le fil jusqu'au dernier message
export function apresRendu() {
  const fil = document.getElementById('fil-coach');
  if (fil) fil.scrollTop = fil.scrollHeight;
}

export const actions = {
  retourCoach: () => aller(etat.draft ? 'editeur' : 'accueil'),
  choix: el => {
    const c = choix[+el.dataset.i];
    if (c === 'Nouvelle demande') {
      chat = [{ role: 'ia', text: 'On repart : créer, importer ou adapter une séance ?' }];
      historiqueApi = [{ role: 'model', text: chat[0].text }];
      choix = [...CHOIX_DEPART];
      rendre(); return;
    }
    envoyer(c);
  },
  envoyer: () => { const el = document.querySelector('.champ-coach'); envoyer(el ? el.value : saisie); },
  valider: el => {
    const m = chat[+el.dataset.i];
    if (!m || !m.carte || m.carte.valide) return;
    m.carte.seances.forEach(s => { const { _maj, ...propre } = s; enregistrerSeance(propre); });
    m.carte.valide = true;
    chat.push({ role: 'ia', text: 'C’est fait ! Tu la retrouves dans « Mes séances ». Les notifications de reprise sont déjà calées sur ces temps.' });
    choix = ['Nouvelle demande'];
    rendre();
  },
};
export const saisies = { saisie: el => { saisie = el.value; } };
