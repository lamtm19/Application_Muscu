/* ================================================================
   model.js — Modèle de données d'une séance (sans DOM, testable dans Node)
   ----------------------------------------------------------------
   Exercice : { type:'exo', id, key, nom, kind, muscle, series, serie, repos, reposApres, note }
   Circuit  : { type:'circuit', id, nom, tours, reposTour, reposApres, exos:[exo…] }
   Séance   : { id, nom, dossier, items:[exo | circuit] }
   Tous les temps sont en secondes.
================================================================ */

// Exercice utilisé quand une clé n'existe pas dans la base
export const EXO_PERSO = {
  key: 'perso', nom: 'Exercice perso', kind: 'generic',
  muscle: 'Exercice personnalisé', serie: 40, repos: 90, series: 3,
};

// Identifiant unique (court) pour les exercices, circuits, séances…
let compteur = 0;
export function uid(prefixe = 'x') {
  compteur += 1;
  return prefixe + Date.now().toString(36) + compteur.toString(36) + Math.random().toString(36).slice(2, 5);
}

// Copie profonde d'un objet simple
export function clone(o) { return JSON.parse(JSON.stringify(o)); }

// Retrouve la fiche d'un exercice de la base à partir de sa clé
export function baseDe(lib, key) {
  return lib.find(e => e.key === key) || EXO_PERSO;
}

// Crée un exercice de séance à partir de la base, avec des valeurs à remplacer
export function creerExo(lib, key, remplacer = {}) {
  const b = baseDe(lib, key);
  const exo = {
    type: 'exo', id: uid('x'), key: b.key, nom: b.nom, kind: b.kind, muscle: b.muscle,
    series: b.series, serie: b.serie, repos: b.repos, reposApres: 120, note: '',
  };
  return Object.assign(exo, remplacer);
}

// Crée un circuit vide (ou avec des exercices)
export function creerCircuit(remplacer = {}) {
  return Object.assign({ type: 'circuit', id: uid('c'), nom: 'Circuit', tours: 3, reposTour: 90, reposApres: 120, exos: [] }, remplacer);
}

/* ----------------------------------------------------------------
   Calcul des étapes — copie fidèle de pdcSteps() de la maquette.
   Une étape = { ph:'serie'|'repos'|'transition', dur, item, exo?, n?, N?, circuit? }
---------------------------------------------------------------- */
export function etapes(seance) {
  const st = [];
  const n = seance.items.length;
  seance.items.forEach((it, i) => {
    if (it.type === 'circuit') {
      if (!it.exos.length) return;
      for (let t = 1; t <= it.tours; t++) {
        // Au tour t : seulement les exos qui ont encore une série à faire
        const actifs = it.exos.filter(e => t <= Math.min(e.series, it.tours));
        actifs.forEach((e, j) => {
          st.push({ ph: 'serie', dur: e.serie, item: i, exo: e, n: t, N: Math.min(e.series, it.tours), circuit: true });
          if (j < actifs.length - 1 && e.repos > 0) st.push({ ph: 'repos', dur: e.repos, item: i });
        });
        // Repos entre deux tours, sauf si le tour suivant est vide
        const suivants = it.exos.filter(e => t + 1 <= Math.min(e.series, it.tours)).length;
        if (t < it.tours && suivants && it.reposTour > 0) st.push({ ph: 'repos', dur: it.reposTour, item: i });
      }
    } else {
      for (let k = 1; k <= it.series; k++) {
        st.push({ ph: 'serie', dur: it.serie, item: i, exo: it, n: k, N: it.series });
        if (k < it.series && it.repos > 0) st.push({ ph: 'repos', dur: it.repos, item: i });
      }
    }
    // Pause avant l'élément suivant
    if (i < n - 1 && it.reposApres > 0) st.push({ ph: 'transition', dur: it.reposApres, item: i });
  });
  return st;
}

// Durée totale d'une séance (secondes)
export function duree(seance) { return etapes(seance).reduce((a, x) => a + x.dur, 0); }

// Nombre d'exercices (un circuit compte pour ses exos)
export function nbExos(seance) {
  return seance.items.reduce((a, it) => a + (it.type === 'circuit' ? it.exos.length : 1), 0);
}

// 75 → "1:15"
export function mmss(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60), r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
}

// 2160 → "36 min" ; 4000 → "1 h 07"
export function enMinutes(t) {
  const m = Math.round(t / 60);
  if (m < 60) return m + ' min';
  const r = m % 60;
  return Math.floor(m / 60) + ' h ' + (r < 10 ? '0' : '') + r;
}

// Retrouve un exo ou un circuit (même à l'intérieur d'un circuit) par son id
export function trouver(seance, id) {
  for (let i = 0; i < seance.items.length; i++) {
    const it = seance.items[i];
    if (it.id === id) return { obj: it, liste: seance.items, idx: i, circuit: null };
    if (it.type === 'circuit') {
      for (let j = 0; j < it.exos.length; j++) {
        if (it.exos[j].id === id) return { obj: it.exos[j], liste: it.exos, idx: j, circuit: it };
      }
    }
  }
  return null;
}

// Texte d'une série : "Développé couché · série 3/4"
export function libelle(etape) { return etape.exo.nom + ' · série ' + etape.n + '/' + etape.N; }

// Prochaine étape de série à partir de l'index « depuis »
export function prochaineSerie(steps, depuis) {
  for (let j = depuis; j < steps.length; j++) if (steps[j].ph === 'serie') return steps[j];
  return null;
}

/* ----------------------------------------------------------------
   Alertes futures (pour les notifications quand l'app est cachée)
   idx      : étape en cours
   finEtape : heure (ms) de fin de l'étape en cours
   reglages : { avant, avantS, reprise }
   horizon  : on ne garde que les alertes des N prochaines secondes
   Renvoie [{ dans (s), a (heure exacte en ms), titre, texte }]
---------------------------------------------------------------- */
export function alertesFutures(steps, idx, finEtape, maintenant, reglages, horizon = 45 * 60) {
  const out = [];
  let fin = finEtape; // fin de l'étape j
  for (let j = idx; j < steps.length; j++) {
    if (j > idx) fin += steps[j].dur * 1000;
    const x = steps[j];
    const suivante = steps[j + 1];
    // On ne s'intéresse qu'aux repos/pauses suivis d'une série
    if (x.ph !== 'serie' && suivante && suivante.ph === 'serie') {
      const texte = libelle(suivante);
      if (reglages.avant && x.dur > reglages.avantS) {
        const t = fin - reglages.avantS * 1000;
        if (t > maintenant) out.push({ dans: Math.round((t - maintenant) / 1000), a: Math.round(t), titre: 'Reprise dans ' + reglages.avantS + ' s', texte });
      }
      if (reglages.reprise && fin > maintenant) {
        out.push({ dans: Math.round((fin - maintenant) / 1000), a: Math.round(fin), titre: 'C’est reparti !', texte });
      }
    }
    if ((fin - maintenant) / 1000 > horizon) break;
  }
  return out.filter(a => a.dans >= 1 && a.dans <= horizon);
}

/* ----------------------------------------------------------------
   Migration v1 → v2
   v1 : { id, name, exercises:[{ name, sets, workTime, restTime, reps, load }] }
---------------------------------------------------------------- */

// "Développé Couché" → "developpe couche" (sans accents ni majuscules)
export function normaliser(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function migrerSeanceV1(v1, lib) {
  const items = (v1.exercises || []).map(e => {
    const trouve = lib.find(b => normaliser(b.nom) === normaliser(e.name));
    const note = [e.reps ? e.reps + ' reps' : '', e.load ? String(e.load) : ''].filter(Boolean).join(' · ');
    return {
      type: 'exo', id: uid('x'),
      key: trouve ? trouve.key : 'perso',
      nom: e.name || 'Exercice',
      kind: trouve ? trouve.kind : 'generic',
      muscle: trouve ? trouve.muscle : EXO_PERSO.muscle,
      series: Math.max(1, parseInt(e.sets, 10) || 1),
      serie: Math.max(1, parseInt(e.workTime, 10) || 30),
      repos: Math.max(0, parseInt(e.restTime, 10) || 0),
      // En v1, le repos de l'exo servait aussi de pause avant l'exo suivant
      reposApres: Math.max(0, parseInt(e.restTime, 10) || 0),
      note,
    };
  });
  return { id: 'v1_' + (v1.id || uid('s')), nom: v1.name || 'Séance', dossier: 'perso', items };
}
