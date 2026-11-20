/* ================================================================
   store.js — Données de l'app (localStorage) et migration de la v1
   Toutes les nouvelles clés commencent par « pdc2_ ».
   Les anciennes clés de la v1 ne sont JAMAIS supprimées.
================================================================ */
import { migrerSeanceV1, uid } from './model.js';

const CLES = {
  seances: 'pdc2_seances',
  dossiers: 'pdc2_dossiers',
  historique: 'pdc2_historique',
  reglages: 'pdc2_reglages',
  run: 'pdc2_run',
  version: 'pdc2_version',
};
const VERSION_DONNEES = 2;
const V1 = {
  sessions: 'pause_champion_sessions',
  history: 'pause_champion_history',
  settings: 'pause_champion_settings',
};

// Réglages par défaut (identiques à la maquette)
export const REGLAGES_DEFAUT = {
  avant: true, avantS: 15, decompte: true, reprise: true, fin: true, musique: 'baisser', ecran: true,
};

// État en mémoire, chargé au démarrage
export const donnees = {
  lib: [],          // base d'exercices (data/exercices.json)
  seances: [],
  dossiers: [],
  historique: [],   // [{ nom, date (ms), duree (s) }]
  reglages: { ...REGLAGES_DEFAUT },
};

/* ---------- Lecture / écriture sûres ---------- */
export function lire(cle, defaut = null) {
  try {
    const v = localStorage.getItem(cle);
    return v === null ? defaut : JSON.parse(v);
  } catch { return defaut; }
}
export function ecrire(cle, valeur) {
  try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* stockage plein ou bloqué */ }
}
export function effacer(cle) {
  try { localStorage.removeItem(cle); } catch { /* rien */ }
}

/* ---------- Démarrage ---------- */
export async function charger() {
  donnees.lib = await (await fetch('data/exercices.json')).json();

  const dejaV2 = lire(CLES.seances) !== null;
  if (dejaV2) {
    // On ne garde que des données valides (une valeur abîmée ne doit pas bloquer l'app)
    const tableau = (cle) => { const v = lire(cle, []); return Array.isArray(v) ? v : []; };
    donnees.seances = tableau(CLES.seances).filter(s => s && typeof s === 'object' && Array.isArray(s.items));
    donnees.dossiers = tableau(CLES.dossiers).filter(d => d && typeof d === 'object' && d.id);
    donnees.historique = tableau(CLES.historique).filter(h => h && typeof h === 'object');
    const reg = lire(CLES.reglages, {});
    donnees.reglages = { ...REGLAGES_DEFAUT, ...(reg && typeof reg === 'object' ? reg : {}) };
    mettreAJourDonnees();
  } else {
    // Premier lancement de la v2 : séances de base + migration des données v1
    const base = await (await fetch('data/seances-base.json')).json();
    donnees.dossiers = base.dossiers;
    donnees.seances = base.seances.map(s => { const { dureeEstimeeMin, ...reste } = s; return reste; });
    migrerV1();
    ecrire(CLES.version, VERSION_DONNEES);
    sauver();
  }
}

/* ---------- Mises à jour des données déjà enregistrées sur le téléphone ---------- */
function mettreAJourDonnees() {
  // Le dossier « Mes séances » doit toujours exister, et chaque séance doit être dans un dossier connu
  if (!donnees.dossiers.some(d => d.id === 'perso')) {
    donnees.dossiers.unshift({ id: 'perso', nom: 'Mes séances', preset: false, masque: false, ouvert: true });
  }
  const ids = new Set(donnees.dossiers.map(d => d.id));
  donnees.seances.forEach(s => { if (!ids.has(s.dossier)) s.dossier = 'perso'; });

  const v = lire(CLES.version, 1);
  if (v < 2) {
    // Noms des séances de Lam sans « Séance A/B/C » + note d’échauffement de la B écrite en entier
    const noms = { sa: ['Séance A — Pecs, triceps, dos', 'Pecs, triceps, dos'], sb: ['Séance B — Pecs, biceps, dos', 'Pecs, biceps, dos'], sc: ['Séance C — Pecs, bras (bonus)', 'Pecs, bras (bonus)'] };
    donnees.seances.forEach(s => {
      const n = noms[s.id];
      if (n && s.nom === n[0]) s.nom = n[1];
      if (s.id === 'sb' && s.items[0] && s.items[0].note === NOTE_B_ANCIENNE) s.items[0].note = NOTE_B;
    });
    // Alerte avant la reprise : 15 s par défaut (choix 10, 15 ou 20 s)
    if (![10, 15, 20].includes(donnees.reglages.avantS) || donnees.reglages.avantS === 10) donnees.reglages.avantS = 15;
  }
  ecrire(CLES.version, VERSION_DONNEES);
  sauver();
}
const NOTE_B_ANCIENNE = 'Comme la séance A, plus 1 série de rowing léger';
const NOTE_B = 'Rotations d’épaules, pull-apart élastique 2 × 20, 10 pompes faciles, 3 dips, plus 1 série de rowing léger';

/* ---------- Migration v1 → v2 ---------- */
function migrerV1() {
  // 1. Séances : ajoutées dans « Mes séances »
  const sessionsV1 = lire(V1.sessions, []);
  if (Array.isArray(sessionsV1)) {
    sessionsV1.forEach(s => {
      try { donnees.seances.push(migrerSeanceV1(s, donnees.lib)); } catch { /* séance illisible : ignorée */ }
    });
  }
  // 2. Historique : { sessionName, date, duration } → { nom, date, duree }
  const histV1 = lire(V1.history, []);
  if (Array.isArray(histV1)) {
    donnees.historique = histV1.map(h => ({ nom: h.sessionName, date: h.date, duree: h.duration }));
  }
  // 3. Réglages : son coupé en v1 → « Notifications seulement »
  const regV1 = lire(V1.settings, null);
  if (regV1 && regV1.soundEnabled === false) donnees.reglages.musique = 'rien';
}

/* ---------- Sauvegarde ---------- */
export function sauver() {
  ecrire(CLES.seances, donnees.seances);
  ecrire(CLES.dossiers, donnees.dossiers);
  ecrire(CLES.historique, donnees.historique);
  ecrire(CLES.reglages, donnees.reglages);
}

/* ---------- Séances ---------- */
export function enregistrerSeance(s) {
  const i = donnees.seances.findIndex(x => x.id === s.id);
  if (i >= 0) donnees.seances[i] = s; else donnees.seances.push(s);
  sauver();
}
export function supprimerSeance(id) {
  donnees.seances = donnees.seances.filter(s => s.id !== id);
  sauver();
}
export function dossierDe(s) { return donnees.dossiers.find(d => d.id === s.dossier); }

/* ---------- Dossiers ---------- */
export function majDossier(id, patch) {
  donnees.dossiers = donnees.dossiers.map(d => (d.id === id ? { ...d, ...patch } : d));
  sauver();
}
export function nouveauDossier() {
  const d = { id: uid('d'), nom: 'Nouveau dossier', preset: false, ouvert: true, masque: false };
  donnees.dossiers.push(d);
  sauver();
  return d;
}
export function supprimerDossier(id) {
  donnees.dossiers = donnees.dossiers.filter(d => d.id !== id);
  // Ses séances retournent dans « Mes séances »
  donnees.seances = donnees.seances.map(s => (s.dossier === id ? { ...s, dossier: 'perso' } : s));
  sauver();
}

/* ---------- Historique ---------- */
export function ajouterHistorique(nom, duree) {
  donnees.historique.unshift({ nom, date: Date.now(), duree });
  donnees.historique = donnees.historique.slice(0, 200);
  sauver();
}

/* ---------- Réglages ---------- */
export function majReglages(patch) {
  donnees.reglages = { ...donnees.reglages, ...patch };
  sauver();
}

/* ---------- Séance en cours (pour survivre à une fermeture) ---------- */
export function sauverRun(run) { if (run) ecrire(CLES.run, run); else effacer(CLES.run); }
export function lireRun() { return lire(CLES.run, null); }
