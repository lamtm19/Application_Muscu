/* ================================================================
   api/coach.js — Fonction Vercel : Coach IA (Google Gemini, offre gratuite)
   La clé GEMINI_API_KEY reste sur le serveur (jamais envoyée au téléphone).
   Entrée  : { messages:[{ role:'user'|'model', text }], seances:[…] }
   Sortie  : { type:'question', texte, choix:[…] }
          ou { type:'seances', texte, seances:[…] }
================================================================ */
import lib from '../data/exercices.json' with { type: 'json' };

// Flash gratuit le plus récent (ai.google.dev/gemini-api/docs/models, nov. 2026),
// puis des modèles Flash-Lite gratuits en secours si Google est saturé (erreur 503/429 ou trop lent).
const MODELES = (process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [])
  .concat(['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
const DELAI_MAX = [15000, 20000, 20000]; // ms par tentative
const CLES = lib.map(e => e.key).concat('perso');

const INSTRUCTIONS = `Tu es un coach de musculation et de street workout dans l'app « Pause du Champion » (minuteur de séries et de repos).
Règles :
- Réponds en français, en phrases courtes, en tutoyant.
- Pose UNE seule question à la fois, avec 2 à 4 choix courts (champ "choix"), type "question".
- Utilise UNIQUEMENT les clés ("key") de la base d'exercices ci-dessous. N'invente jamais un exercice hors de la base. S'il en faut vraiment un autre, utilise key "perso" avec un "nom".
- Choisis le temps de série ("serie", secondes) et le repos ("repos", secondes) d'après l'objectif : force = repos longs (150 à 240 s) ; prise de muscle = 60 à 120 s ; perte de gras / remise en forme = 30 à 75 s. Une série dure en général 30 à 50 s.
- "reposApres" = pause avant l'élément suivant (souvent 60 à 120 s).
- Tu peux créer des circuits (type "circuit", "tours", "reposTour", et dans chaque exo "repos" = repos avant l'exo suivant du circuit, "series" ≤ "tours").
- Mets les répétitions ou la charge dans "note" (ex : "8-12 reps").
- Un exercice seul = un élément type "exo" avec key, series, serie, repos, reposApres DIRECTEMENT dedans (jamais de "exos"). "exos" sert uniquement aux circuits.
- N’invente pas d’"id" : mets un "id" seulement pour modifier une séance existante (son id exact).
- Trois parcours possibles : 1) créer de zéro : demande l'objectif, le niveau, les jours par semaine, le matériel, puis les contraintes (une question à la fois), puis propose les séances ; 2) importer une séance écrite : l'utilisateur colle son texte, tu reconnais les exercices, demande l'objectif si besoin, puis renvoie la séance ; 3) adapter une séance existante : demande laquelle (choix = noms de ses séances), puis ce qu'il veut changer, puis renvoie la séance modifiée EN GARDANT SON "id".
- Quand tu proposes des séances : type "seances", "texte" = une phrase de résumé, "seances" = la liste.

Base d'exercices (key : nom [illustration]) :
${lib.map(e => `${e.key} : ${e.nom} [${e.kind}] — ${e.muscle}, conseillé ${e.serie}s / repos ${e.repos}s`).join('\n')}`;

// Schéma de la réponse (sortie structurée JSON)
const EXO = {
  type: 'OBJECT',
  properties: {
    key: { type: 'STRING', enum: CLES },
    nom: { type: 'STRING' },
    series: { type: 'INTEGER' },
    serie: { type: 'INTEGER' },
    repos: { type: 'INTEGER' },
    reposApres: { type: 'INTEGER' },
    note: { type: 'STRING' },
  },
  required: ['key', 'series', 'serie', 'repos'],
};
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    type: { type: 'STRING', enum: ['question', 'seances'] },
    texte: { type: 'STRING' },
    choix: { type: 'ARRAY', items: { type: 'STRING' } },
    seances: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          nom: { type: 'STRING' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                type: { type: 'STRING', enum: ['exo', 'circuit'] },
                ...EXO.properties,
                tours: { type: 'INTEGER' },
                reposTour: { type: 'INTEGER' },
                exos: { type: 'ARRAY', items: EXO },
              },
              required: ['type'],
            },
          },
        },
        required: ['nom', 'items'],
      },
    },
  },
  required: ['type', 'texte'],
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export async function POST(request) {
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) return json({ erreur: 'Coach non configuré' }, 503);

  let entree;
  try { entree = await request.json(); } catch { return json({ erreur: 'Requête invalide' }, 400); }
  const messages = Array.isArray(entree.messages) ? entree.messages.slice(-20) : [];
  if (!messages.length) return json({ erreur: 'Aucun message' }, 400);

  // Séances de l'utilisateur (pour le parcours « adapter »), limitées en taille
  const seances = JSON.stringify(entree.seances || []).slice(0, 20000);
  const contents = messages.map(m => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: String(m.text || '').slice(0, 6000) }],
  }));
  // Gemini veut que la conversation commence par l'utilisateur
  while (contents.length && contents[0].role !== 'user') contents.shift();
  if (!contents.length) return json({ erreur: 'Aucun message' }, 400);

  const corps = {
    systemInstruction: { parts: [{ text: INSTRUCTIONS + '\n\nSéances actuelles de l’utilisateur (JSON) :\n' + seances }] },
    contents,
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.6 },
  };

  let derniere = 502;
  for (let i = 0; i < MODELES.length; i++) {
    try {
      const rep = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELES[i]}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cle },
        body: JSON.stringify(corps),
        signal: AbortSignal.timeout(DELAI_MAX[i] || 20000),
      });
      if (!rep.ok) {
        derniere = rep.status;
        console.error('Gemini', MODELES[i], rep.status, (await rep.text()).slice(0, 300));
        continue; // on essaie le modèle suivant
      }
      const d = await rep.json();
      const texte = d?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      const sortie = JSON.parse(texte);
      if (!sortie.texte) throw new Error('Réponse vide');
      return json(sortie);
    } catch (e) {
      console.error('Coach', MODELES[i], e.name, e.message);
    }
  }
  return json({ erreur: derniere === 429 ? 'Limite gratuite atteinte, réessaie plus tard' : 'Coach indisponible' }, 502);
}
