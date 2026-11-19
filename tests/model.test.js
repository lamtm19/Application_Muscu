// Tests du modèle — lancer avec : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { etapes, duree, migrerSeanceV1, alertesFutures, mmss, enMinutes } from '../js/model.js';

const lire = f => JSON.parse(readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const base = lire('seances-base.json');
const lib = lire('exercices.json');
const seance = id => base.seances.find(s => s.id === id);

test('durées des séances A, B et C (~36, 36 et 29 min)', () => {
  assert.equal(Math.round(duree(seance('sa')) / 60), 36);
  assert.equal(Math.round(duree(seance('sb')) / 60), 36);
  assert.equal(Math.round(duree(seance('sc')) / 60), 29);
  // Et toutes les séances correspondent à la durée notée dans le fichier
  for (const s of base.seances) assert.equal(Math.round(duree(s) / 60), s.dureeEstimeeMin, s.nom);
});

test('séance A : le 4e tour du bloc 1 ne contient que les dips', () => {
  const st = etapes(seance('sa')).filter(x => x.item === 1 && x.ph === 'serie');
  const tour4 = st.filter(x => x.n === 4);
  assert.equal(tour4.length, 1);
  assert.equal(tour4[0].exo.key, 'dpl');
  // 4 séries de dips + 3 de tractions
  assert.equal(st.length, 7);
});

test('repos des blocs : 75, 60 et 45 s', () => {
  const st = etapes(seance('sa'));
  const reposDuBloc = i => [...new Set(st.filter(x => x.item === i && x.ph === 'repos').map(x => x.dur))];
  assert.deepEqual(reposDuBloc(1), [75]);
  assert.deepEqual(reposDuBloc(2), [60]);
  assert.deepEqual(reposDuBloc(3), [45]);
});

test('pauses entre blocs : 60 s', () => {
  const st = etapes(seance('sa'));
  const pauses = st.filter(x => x.ph === 'transition');
  assert.equal(pauses.length, 3); // échauffement→B1, B1→B2, B2→B3
  pauses.forEach(p => assert.equal(p.dur, 60));
  // Pas de pause après le dernier élément
  assert.notEqual(st[st.length - 1].ph, 'transition');
});

test('pas de repos entre tours avant un tour vide', () => {
  const s = { items: [{ type: 'circuit', tours: 3, reposTour: 90, reposApres: 0, exos: [
    { nom: 'A', series: 1, serie: 30, repos: 10 }, { nom: 'B', series: 1, serie: 30, repos: 10 }] }] };
  const st = etapes(s);
  assert.deepEqual(st.map(x => x.ph), ['serie', 'repos', 'serie']);
});

test('migration v1 → v2', () => {
  const v1 = { id: 'fonte', name: 'Fonte', exercises: [
    { id: 'a', name: 'développé COUCHÉ', sets: 4, reps: 10, load: '20kg', workTime: 30, restTime: 150 },
    { id: 'b', name: 'Truc inconnu', sets: 2, reps: null, load: null, workTime: 20, restTime: 60 },
  ] };
  const s = migrerSeanceV1(v1, lib);
  assert.equal(s.nom, 'Fonte');
  assert.equal(s.dossier, 'perso');
  assert.equal(s.items.length, 2);
  const [a, b] = s.items;
  assert.equal(a.key, 'dc');
  assert.equal(a.kind, 'press');
  assert.equal(a.series, 4);
  assert.equal(a.serie, 30);
  assert.equal(a.repos, 150);
  assert.equal(a.note, '10 reps · 20kg');
  assert.equal(b.kind, 'generic');
  assert.equal(b.note, '');
  // Même durée que le calcul de la v1 : séries + repos entre séries + repos entre exos
  assert.equal(duree(s), (30 * 4 + 150 * 3) + 150 + (20 * 2 + 60));
});

test('alertes futures : avant la reprise et « C’est reparti »', () => {
  const s = { items: [{ type: 'exo', nom: 'Dips', series: 2, serie: 30, repos: 60, reposApres: 0 }] };
  const st = etapes(s); // série 30 s, repos 60 s, série 30 s
  const t0 = 1_000_000;
  const a = alertesFutures(st, 0, t0 + 30_000, t0, { avant: true, avantS: 10, reprise: true });
  assert.deepEqual(a, [
    { dans: 80, titre: 'Reprise dans 10 s', texte: 'Dips · série 2/2' },
    { dans: 90, titre: 'C’est reparti !', texte: 'Dips · série 2/2' },
  ]);
  const b = alertesFutures(st, 0, t0 + 30_000, t0, { avant: false, avantS: 10, reprise: true });
  assert.equal(b.length, 1);
});

test('formats de temps', () => {
  assert.equal(mmss(75), '1:15');
  assert.equal(mmss(5), '0:05');
  assert.equal(enMinutes(2160), '36 min');
  assert.equal(enMinutes(4020), '1 h 07');
});
