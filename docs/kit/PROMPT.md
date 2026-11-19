# Mission : Pause du Champion v2

Tu es Claude Code. Tu as la main sur le PC de Lam pour réaliser **toute** la v2 de son application « Pause du Champion », de bout en bout, jusqu'à la mise en ligne. Lam est **débutant en JavaScript** : il ne doit rien faire lui-même, sauf ce qui est listé dans « Ce que seul Lam peut faire ». Pour tout le reste, tu agis.

Réponds-lui toujours en français, en commençant chaque message par « Lam, ». Fais des messages courts. À la fin de chaque étape, envoie un résumé de 3 à 5 lignes : ce que tu as fait, ce qui marche, ce qui reste.

---

## 0. Ce que seul Lam peut faire (et rien d'autre)

1. Te donner accès à son ordinateur, puis rester disponible.
2. Se connecter lui-même quand un site demande son mot de passe ou un code (GitHub, Vercel, Google, Upstash). Tu ouvres la page, tu lui dis exactement quoi faire en une phrase, puis tu attends.
3. Accepter des conditions d'utilisation si un site l'exige.
4. Faire le test final sur son iPhone (section 11). Tu lui donnes la liste à cocher.

Ne lui demande **jamais** de copier une clé, d'ouvrir un terminal ou de modifier un fichier. Tu le fais.

---

## 1. Contexte

- **Application actuelle (v1)** : https://pause-du-champion.vercel.app
- **Code source v1** : https://github.com/lamtm19/Application_Muscu, avec les fichiers `index.html` (toute l'app : HTML, CSS et JS dans un seul fichier), `sw.js`, `timerWorker.js`, `manifest.json`, `logo.png`, `logoApp.png` et `README.md`.
- **Hébergement** : Vercel, déployé depuis ce dépôt GitHub.
- **Usage** : minuteur de séries et de temps de repos en musculation, utilisé sur iPhone, installé sur l'écran d'accueil (PWA).
- **Le dossier `kit/`** (livré avec ce fichier) contient la référence validée par Lam :
  - `kit/reference/maquette-app.dc.html` : la maquette complète validée. Lis-la en entier. Les écrans sont dans des blocs `<sc-if value="{{is.xxx}}">`, et toute la logique est dans le `<script type="text/x-dc">` en bas (modèle de données, calcul des étapes, minuteur, coach simulé). C'est **la source de vérité** pour le design, les textes et le comportement. Ignore la syntaxe propre à la maquette (`sc-if`, `sc-for`, `{{…}}`, `dc-import`) : reproduis le rendu en HTML, CSS et JS classiques.
  - `kit/reference/illustrations-svg.json` : 54 illustrations SVG animées (animations SMIL `animateTransform`), indexées par type (`"press"`, `"curl"`, `"rest"`…). À utiliser **telles quelles**. Ne les redessine pas.
  - `kit/reference/exercices.json` : la base de 62 exercices (clé, nom, type d'illustration, catégories, muscles, temps de série conseillé, repos conseillé, séries).
  - `kit/reference/seances-base.json` : les dossiers et les 8 séances préchargées, dont les séances A, B et C de Lam.
  - `kit/reference/generateur/` : les scripts Python qui ont généré les SVG (`gen.py` lance `more.py`). Ils servent seulement à ajouter un exercice plus tard. Les chemins `/home/claude/gen/...` y sont à adapter.
  - `kit/assets/logo.png` : le logo recoloré (barres en `#e8ff00`). Il remplace l'ancien `logo.png`.

**Si le dossier `kit/` n'est pas à côté de ce fichier**, cherche-le sur le PC (Téléchargements, Bureau) : `pause-du-champion-v2-kit.zip` ou un dossier `kit`. Dézippe-le si besoin.

---

## 2. Contraintes non négociables

- **100 % gratuit** : aucun service payant, aucune carte bancaire.
- **100 % PWA** : pas d'app native, pas de Capacitor, pas de Mac nécessaire.
- **Aucune régression** : toutes les fonctions de la v1 restent, notamment :
  - le récap avant lancement ;
  - le compte à rebours 3-2-1 ;
  - l'historique des séances ;
  - **la modification d'un exercice pendant le repos (« live edit »)**, à garder et à intégrer au nouveau design ;
  - l'aperçu de la séance (puce « 1/6 ») ;
  - « Recommencer » et « Passer ».
- **Les données de la v1 ne sont pas perdues** : migration automatique des clés `localStorage` `pause_champion_sessions`, `pause_champion_history` et `pause_champion_settings` (voir 5.3).
- **Zéro zoom** sur iPhone, à aucun moment (voir 9.1).
- **Code lisible** : commentaires en français, noms clairs. Lam doit pouvoir s'y retrouver.

---

## 3. Préparation (tu fais tout)

1. Vérifie les outils installés : `git`, `node` (version 20 ou plus), `npm`. Installe ce qui manque.
2. Clone le dépôt dans `~/Projets/Application_Muscu`, ou mets à jour la copie locale si elle existe déjà.
3. Crée une branche `v2`.
4. Copie `kit/` dans le dépôt sous `docs/kit/`. Ce dossier reste dans le dépôt comme documentation, mais il est exclu du déploiement (voir `.vercelignore`).
5. Installe la CLI Vercel (`npm i -g vercel`), puis lance `vercel login`. Si une connexion est nécessaire, Lam se connecte. Fais ensuite `vercel link` sur le projet existant `pause-du-champion`.
6. Lis tout le code de la v1, puis la maquette, avant d'écrire la moindre ligne. Ensuite, envoie à Lam un plan de 10 lignes maximum et **continue sans attendre sa réponse**. Il a déjà tout validé.

---

## 4. Architecture cible

Reste en **HTML, CSS et JavaScript sans framework ni étape de build**, avec des modules ES. Seules les fonctions serveur utilisent npm.

```
/index.html               coquille de l'app + écrans
/css/app.css
/js/app.js                démarrage, navigation entre écrans
/js/store.js              données, localStorage, migration v1
/js/model.js              calcul des étapes d'une séance, durées
/js/runner.js             moteur de séance (minuteur basé sur l'horloge)
/js/audio.js              alarme sonore (un seul AudioContext)
/js/push.js               abonnement push, programmation et annulation
/js/coach.js              écran Coach IA
/js/illustrations.js      chargement des SVG depuis /data/illustrations.json
/js/ui/*.js               un fichier par écran
/data/exercices.json
/data/illustrations.json
/data/seances-base.json
/sw.js                    service worker (cache + push)
/manifest.json
/api/coach.js             fonction Vercel → Gemini
/api/push/schedule.js     fonction Vercel → QStash (programme les notifications)
/api/push/cancel.js       fonction Vercel → QStash (annule)
/api/push/send.js         fonction Vercel appelée par QStash → envoie le Web Push
/package.json             dépendances serveur : web-push, @upstash/qstash
/vercel.json
```

---

## 5. Données

### 5.1 Modèle

Reprends exactement le modèle de la maquette :

```js
// Exercice dans une séance
{ type:'exo', id, key, nom, kind, muscle, series, serie /*s*/, repos /*s*/, reposApres /*s*/, note }

// Circuit (= superset ou bloc)
{ type:'circuit', id, nom, tours, reposTour /*s*/, reposApres /*s*/,
  exos:[ { ...exo, series /* ≤ tours */, repos /* s après cet exo */ } ] }

// Séance
{ id, nom, dossier, items:[ exo | circuit ] }

// Dossier
{ id, nom, preset /* true = exemples */, ouvert, masque }
```

- `serie` est le temps d'une série. `repos` est le repos entre les séries, ou, dans un circuit, le repos après cet exo. `reposApres` est la pause avant l'élément suivant de la séance.
- **Calcul des étapes** : reprends `pdcSteps()` de la maquette à l'identique.
  - Dans un circuit, au tour `t`, on fait les exos dont `series ≥ t`, dans l'ordre, avec `exo.repos` entre eux.
  - Entre deux tours, on applique `reposTour`, sauf si le tour suivant n'a plus aucun exo.
  - Exemple de la séance A : dips 4 séries et tractions 3 séries, donc le 4e tour ne contient que les dips.

### 5.2 Premier lancement

Charge `data/seances-base.json`, soit 3 dossiers et 8 séances.

### 5.3 Migration v1 → v2

- Si `pause_champion_sessions` existe, convertis chaque séance v1 (`{name, exercises:[{name, sets, workTime, restTime, reps, load}]}`) en séance v2 dans le dossier `perso`. Pour chaque exercice :
  - `serie = workTime`, `repos = restTime`, `series = sets` ;
  - `note` = « reps · charge » si ces valeurs existent ;
  - `kind` : retrouve l'exercice dans `exercices.json` par son nom (sans tenir compte des majuscules ni des accents). Sinon, utilise `'generic'`.
- Garde l'historique et les réglages.
- Ne supprime jamais les anciennes clés, pour pouvoir revenir en arrière.
- Les nouvelles clés commencent par `pdc2_`.

---

## 6. Écrans (copie fidèle de la maquette)

**Charte** :
- couleurs : fond `#0a0a0a`, surfaces `#141414` et `#1e1e1e`, bordures `#2a2a2a`, texte `#f0f0f0`, texte secondaire `#888888`, accent série `#e8ff00`, repos et danger `#ff4d4d` ;
- polices : Bebas Neue pour les titres et le chrono, DM Sans pour le texte ;
- zones de toucher de 44 px minimum ;
- respect des zones sûres de l'iPhone (`env(safe-area-inset-*)`).

1. **Accueil**
   - Le logo seul en haut à gauche (pas de texte), et 3 boutons ronds : historique, notifications et son, aide.
   - Le bouton « Coach IA », haut de 64 px, avec le seul texte « Coach IA ».
   - Les dossiers repliables. « Mes séances » est ouvert par défaut ; « Muscu débutant » et « Street débutant » portent l'étiquette EXEMPLES. Le bouton ⋯ permet de renommer ou supprimer un dossier perso, ou de masquer un dossier d'exemples.
   - En bas : « + Nouveau dossier », « Afficher les dossiers masqués (n) », et le bouton « Nouvelle séance » (contour jaune).
   - Une carte de séance affiche seulement : le nom, « N exercices », la durée, et les boutons Lancer et Modifier.
2. **Modifier une séance (le chemin)**
   - Le nom est éditable, avec le choix du dossier en dessous.
   - Chaque exo est une étape : illustration à gauche, nom, « xN » et bouton de réglages. **Aucun temps affiché dans le chemin.**
   - Entre deux éléments : « Pause : 2:00 » avec − et + (pas de 15 s).
   - Un circuit est une carte à contour jaune : nom éditable (« Bloc 1 »), « xN tours », liste des exos, « + Ajouter au circuit » et « Entre tours : 1:15 » avec − et +.
   - En bas : « + Exercice », « + Circuit », la durée estimée, « N exercices · N circuits » et Enregistrer.
   - La **feuille de réglages d'un exo** contient :
     - l'illustration ;
     - le nombre de séries (ou « Séries dans ce circuit », limité au nombre de tours) ;
     - le temps de série en minutes et secondes, à la seconde près, avec le lien « Conseillé : x » ;
     - le repos en minutes et secondes, avec des raccourcis ;
     - le champ Notes (charge, reps…) ;
     - les boutons Retirer et Appliquer.
   - La **feuille d'un circuit** contient le nom, le nombre de tours, le repos entre tours et le bouton Retirer.
   - Modifier une séance d'exemple crée une **copie** dans « Mes séances », avec un bandeau d'explication. L'original reste intact.
3. **Ajouter un exercice**
   - Recherche, puis filtres Tout, Muscu et Street workout.
   - **Sélection multiple numérotée** dans l'ordre des touches, puis le bouton « Ajouter N exercices (au circuit) ».
   - Le bouton « Créer « texte » » ajoute un exo perso (kind `generic`, nom éditable dans ses réglages).
4. **Récap** : nom, durée, nombre d'exercices, liste des éléments avec leur illustration, puis Modifier et « C'est parti ! », qui lance le compte à rebours 3-2-1.
5. **Séance en cours** (grille stricte, tout centré, hauteurs fixes)
   - En-tête : la croix pour quitter (**grise**, discrète), le nom de la séance centré, et la puce « 1/6 ▾ » qui ouvre l'aperçu.
   - Illustration de 184 × 138 px : le **mouvement** pendant une série, la **personne au repos** (`rest`) pendant un repos ou une pause.
   - Anneau de 216 px avec seulement le chrono, en 60 px avec un espacement de 2 px, comme la v1. **Chaque chiffre a une largeur fixe**, pour que le chrono ne bouge pas. Couleur jaune pendant une série, rouge pendant un repos.
   - Le libellé « EXERCICE SUIVANT », uniquement pendant un repos.
   - Le nom de l'exo, sur une seule ligne.
   - **Les cases de séries** : le mot « SÉRIES » puis des cases numérotées de 26 px. Une série faite est une case jaune cochée, la série en cours a un contour jaune avec son numéro en jaune, les séries à venir sont grises.
   - La note sur 2 lignes maximum.
   - Les boutons Recommencer, Pause et Passer, avec une légende sous chacun.
   - En bas : « Fin de séance dans » avec le temps, et la barre de progression. **Pas de ligne « Ensuite ».**
   - La croix ouvre un panneau du bas « Quitter la séance ? Ta progression sera perdue. », avec Continuer et Quitter.
   - Le **live edit** de la v1 reste accessible pendant le repos (petit bouton crayon près du nom de l'exo suivant). Il ouvre la feuille de réglages de l'exo et recalcule les étapes restantes.
6. **Coach IA** : voir section 8.
7. **Notifications et son** : voir section 7. On y trouve un aperçu des notifications, les interrupteurs suivants, les 3 choix de musique et le bouton « Tester l'alerte ».
   - Bips 3, 2, 1.
   - Alerte avant la reprise (5, 10 ou 15 s).
   - Alerte « C'est reparti ».
   - Fin de série.
   - Garder l'écran allumé.
8. **Aide**
   - Les 5 étapes pour installer l'app sur iPhone : Safari, Partager, « En voir plus », « Sur l'écran d'accueil », puis ouvrir l'app et autoriser les notifications.
   - Le bloc « Demande au Coach IA (Gemini) ».
   - **Pas de prompt à copier.**
9. **Historique** : la liste des séances faites.

Reprends **mot pour mot** tous les textes de la maquette.

---

## 7. Minuteur, son et notifications (le cœur du projet)

### 7.1 Minuteur fiable

- Le temps restant se calcule **à partir de l'horloge** (`endsAt = Date.now() + durée`), jamais en décrémentant un compteur.
- Quand l'app revient au premier plan, recalcule l'étape courante d'après l'heure (en avançant de plusieurs étapes si besoin), sans rejouer les sons manqués.
- Sauvegarde l'état de la séance en cours dans `localStorage` : une séance doit survivre à une fermeture de l'app.
- **Wake Lock** (`navigator.wakeLock.request('screen')`) pendant la séance si « Garder l'écran allumé » est activé. Redemande-le à chaque `visibilitychange`.

### 7.2 Son quand l'app est ouverte

Pas de notification dans ce cas : seulement l'alarme sonore.

- **Un seul `AudioContext`**, créé et débloqué au toucher de « C'est parti ! ». La v1 en recréait un à chaque bip, ce qui finit par bloquer le son sur iPhone. Supprime aussi le fichier audio muet en boucle de la v1 : c'est lui qui coupait la musique.
- Les bips sont générés avec un oscillateur, comme `jouer()` dans la maquette :
  - `tic` : 880 Hz, 90 ms ;
  - `avant` : deux bips à 660 Hz ;
  - `reprise` : 520 Hz puis 780 Hz ;
  - `fin` : 440 Hz.
- Les bips 3, 2, 1 sonnent aux 3 dernières secondes d'un repos ou d'une pause, puis `reprise` à 0.
- Gestion de la musique, avec détection de ce que le navigateur supporte :
  - « Baisser la musique » : `navigator.audioSession.type = 'transient'` juste avant le bip, puis `'ambient'` après ;
  - « Bip par-dessus » : `'ambient'` ;
  - « Notifications seulement » : aucun son de l'app.
  - Si `navigator.audioSession` n'existe pas, joue le bip simplement.
- Le bouton « Tester l'alerte » joue le son `reprise`.

### 7.3 Notifications quand l'app n'est pas à l'écran

Écran verrouillé ou autre app ouverte : Web Push gratuit.

- **Clés VAPID** : génère-les toi-même avec `npx web-push generate-vapid-keys`. La clé publique est utilisée côté client, la clé privée est stockée dans Vercel.
- **Abonnement** : la permission se demande seulement sur un geste de l'utilisateur, au premier lancement de séance, avec une phrase d'explication. Sur iPhone, cela ne marche que si l'app est installée sur l'écran d'accueil. Sinon, affiche un lien vers l'Aide.
- **Programmation** :
  - Au `visibilitychange` vers `hidden`, calcule toutes les alertes futures de la séance : alerte « avant la reprise » et « C'est reparti ».
  - Pour réduire le nombre de messages, limite-toi aux 45 prochaines minutes, et respecte les interrupteurs.
  - Envoie-les avec `fetch('/api/push/schedule', {keepalive:true})`.
  - `api/push/schedule` publie un message QStash par alerte, avec un délai (`delay` en secondes), vers `/api/push/send`. Le message contient l'abonnement et le contenu de la notification. Il n'y a donc **aucune base de données**.
  - La fonction renvoie les identifiants des messages, que tu stockes dans `localStorage`.
- **Annulation** : au retour à l'écran (`visible`), ainsi qu'à chaque pause, Recommencer, Passer, live edit ou sortie de séance, appelle `api/push/cancel` avec les identifiants. Reprogramme ensuite si l'app est encore cachée.
- **`api/push/send`** : vérifie la signature QStash (`Receiver` de `@upstash/qstash`, avec les clés de signature), puis envoie la notification avec `web-push`.
- **`sw.js`** : gère l'événement `push`. Il affiche la notification (titre, texte, logo, `tag:'pdc'` pour remplacer la précédente) et le son système. Il gère aussi `notificationclick`, qui rouvre l'app.
- **Texte des notifications**, sans charge ni reps :
  - titre « Reprise dans 10 s », texte « Développé couché · série 3/4 » ;
  - titre « C'est reparti ! », texte « Développé couché · série 3/4 ».
- Prévois un mode de secours : si une fonction serveur échoue, l'app marche normalement, avec le son seulement.

### 7.4 Service worker

- Change le nom du cache en `pdc-v2-<numéro de version>`.
- Stratégie **réseau d'abord** pour `index.html`, et cache d'abord pour le reste, afin que les mises à jour arrivent toujours chez Lam. La v1 restait figée en cache.
- Met en cache les polices et `/data/*.json` pour que l'app marche hors ligne, sauf le Coach et les notifications.

---

## 8. Coach IA (Gemini, offre gratuite acceptée par Lam)

- **`api/coach.js`** appelle l'API Gemini avec la clé `GEMINI_API_KEY`, stockée dans Vercel. La clé ne doit jamais apparaître côté client.
- **Modèle** : consulte https://ai.google.dev/gemini-api/docs/models et prends le modèle **Flash gratuit le plus récent**.
- **Sortie structurée** en JSON (`responseMimeType: "application/json"` avec un `responseSchema`), qui renvoie :
  - soit `{type:"question", texte, choix:[...]}` ;
  - soit `{type:"seances", texte, seances:[...]}`, où les séances suivent le modèle de la section 5.1.
- **Instructions système** à donner au modèle :
  - coach de musculation et de street workout ;
  - répond en français, en phrases courtes ;
  - pose une question à la fois, avec 2 à 4 choix ;
  - utilise **uniquement** les `key` de la base d'exercices (passe-lui la liste des clés, noms et types) ;
  - choisit les temps de série et de repos d'après l'objectif ;
  - peut créer des circuits ;
  - n'invente jamais un exercice hors de la base. S'il en faut un, il utilise `key:'perso'` avec un nom.
- **Les 3 parcours** de la maquette :
  - créer de zéro : objectif, niveau, jours par semaine, matériel, contraintes ;
  - importer une séance écrite (texte collé) ;
  - adapter une séance existante.
- **Côté client** : affiche les choix en boutons, accepte le texte libre, et propose la carte « Ajouter à mes séances » ou « Mettre à jour la séance ».
- Sous le titre, affiche « Propulsé par Gemini, l'IA de Google ».
- **Limite** : 20 messages par jour et par appareil (compteur en `localStorage`), avec un message clair quand la limite est atteinte.
- Le **champ de saisie fait 16 px**.

---

## 9. Détails iPhone

### 9.1 Aucun zoom

- `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">`
- Tous les champs (`input`, `textarea`, `select`) ont une police de **16 px minimum**.
- `touch-action: manipulation` sur `html`, et `-webkit-text-size-adjust: 100%`.
- Bloque les événements `gesturestart` et `dblclick`.

### 9.2 Autres points

- Le texte de l'app ne doit pas être sélectionnable, sauf dans les champs.
- `manifest.json` :
  - garde le nom ;
  - icônes : `logoApp.png` (icône d'écran d'accueil existante, déjà à la bonne couleur), à décliner en 192 et 512 px avec `sharp` ;
  - `theme_color` et `background_color` à `#0a0a0a` ;
  - `display: standalone`.
- Garde `apple-touch-icon` sur `logoApp.png`.
- Remplace `logo.png` par `kit/assets/logo.png`.

---

## 10. Services gratuits à créer (tu les crées via le navigateur)

Ouvre chaque site dans le navigateur. Quand une connexion est demandée, Lam se connecte. Tu fais tout le reste, puis tu ajoutes chaque valeur dans Vercel avec `vercel env add <NOM> production preview` (sans jamais l'écrire dans le code ni dans Git).

1. **Google AI Studio** (https://aistudio.google.com/apikey) : connexion avec le compte Google de Lam, puis « Create API key » → `GEMINI_API_KEY`.
2. **Upstash** (https://console.upstash.com, connexion avec Google) : ouvre QStash, puis récupère `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` et `QSTASH_NEXT_SIGNING_KEY`. Reste sur l'offre gratuite. Note dans le résumé final la limite de messages gratuits par jour.
3. **VAPID** : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, et `VAPID_SUBJECT` = `mailto:` suivi de l'e-mail du compte GitHub de Lam.
4. `APP_URL` = `https://pause-du-champion.vercel.app`.

Crée aussi `.env.example` (noms des variables sans valeurs) et `.vercelignore` (avec `docs/`).

---

## 11. Tests, mise en ligne et test iPhone

### 11.1 Tests automatiques (Node)

Écris des tests pour `model.js` et vérifie au minimum ces points :
- les durées des séances A, B et C de `seances-base.json`, environ 36, 36 et 29 min ;
- le 4e tour du bloc 1 de la séance A ne contient que les dips ;
- les repos sont bien 75, 60 et 45 s ;
- les pauses entre blocs sont de 60 s ;
- la migration v1 marche sur un exemple.

### 11.2 Tests dans le navigateur

Utilise Chrome avec la simulation iPhone et vérifie chaque écran par rapport à la maquette :
- une séance complète en accéléré (prévois un paramètre `?vitesse=10`, en développement seulement) ;
- les sons ;
- la sélection multiple ;
- les circuits ;
- la copie d'une séance d'exemple ;
- le live edit ;
- le Coach avec la vraie clé ;
- l'absence de zoom.

### 11.3 Mise en ligne

1. Déploie d'abord en **preview** (`vercel`), puis teste les fonctions `/api/*` sur l'URL de preview : une notification programmée à 20 s doit arriver.
2. Fusionne `v2` dans la branche principale, puis pousse et déploie en production (`vercel --prod`).
3. Mets à jour `README.md` : fonctionnalités v2, architecture, variables d'environnement, comment ajouter un exercice avec le générateur.

### 11.4 Le test de Lam sur iPhone

Donne-lui cette liste, puis attends ses retours :
1. Supprimer l'ancienne app de l'écran d'accueil, puis la réinstaller depuis Safari (étapes de l'Aide).
2. Ouvrir l'app : ses anciennes séances doivent être dans « Mes séances ».
3. Lancer la séance A et accepter les notifications.
4. Lancer de la musique (Spotify ou Apple Music) et écouter les bips 3, 2, 1 : est-ce que la musique baisse ou continue ?
5. Verrouiller l'écran pendant un repos : la notification « Reprise dans 10 s » doit arriver, puis « C'est reparti ! ».
6. Taper dans le Coach IA : aucun zoom.

Corrige tout ce qu'il signale, puis redéploie.

---

## 12. Règles de travail

- Fais un commit par étape logique, avec un message en français.
- Ne mets jamais de clé ou de secret dans le code ni dans Git.
- Si quelque chose de la maquette est impossible sur iPhone (par exemple, la baisse de la musique ne fonctionne pas), choisis la meilleure solution de repli, applique-la et explique-la à Lam en une phrase. Ne bloque pas.
- Si tu hésites entre deux options, prends celle qui colle le plus à la maquette.
- Termine par un résumé final, qui contient :
  - l'URL de l'app ;
  - ce qui marche ;
  - les limites connues (offres gratuites, son sur iPhone) ;
  - comment ajouter un exercice plus tard.
