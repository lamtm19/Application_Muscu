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
};
const V1 = {
  sessions: 'pause_champion_sessions',
  history: 'pause_champion_history',
  settings: 'pause_champion_settings',
};

// Réglages par défaut (identiques à la maquette)
export const REGLAGES_DEFAUT = {
  avant: true, avantS: 10, decompte: true, reprise: true, fin: true, musique: 'baisser', ecran: true,
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
    donnees.seances = lire(CLES.seances, []);
    donnees.dossiers = lire(CLES.dossiers, []);
    donnees.historique = lire(CLES.historique, []);
    donnees.reglages = { ...REGLAGES_DEFAUT, ...lire(CLES.reglages, {}) };
  } else {
    // Premier lancement de la v2 : séances de base + migration des données v1
    const base = await (await fetch('data/seances-base.json')).json();
    donnees.dossiers = base.dossiers;
    donnees.seances = base.seances.map(s => { const { dureeEstimeeMin, ...reste } = s; return reste; });
    migrerV1();
    sauver();
  }
}

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
