# 💪 Pause du Champion — v2

Minuteur de séries et de temps de repos pour la musculation et le street workout.
C'est une PWA : on l'installe sur l'écran d'accueil de l'iPhone depuis Safari.

👉 **https://pause-du-champion.vercel.app**

---

## 🚀 Fonctionnalités

- **Séances en « chemin »** : exercices et **circuits** (supersets), pause réglable entre chaque élément.
- **62 exercices** avec une **illustration animée** pour chacun (muscu + street workout).
- **Ajout multiple** : on coche plusieurs exercices d'un coup, dans l'ordre.
- **Dossiers** repliables, séances d'exemple (une copie est créée si on les modifie).
- **Récap** avant de lancer, puis **compte à rebours 3-2-1**.
- **Séance en cours** : chrono dans un anneau (jaune = série, rouge = repos), cases des séries, note, Recommencer / Pause / Passer, aperçu de toute la séance (puce « 1/6 »).
- **Live edit** : pendant un repos, le crayon permet de modifier l'exercice suivant.
- **Minuteur fiable** : basé sur l'horloge, il reste juste même si l'iPhone met l'app en veille, et la séance survit à une fermeture de l'app.
- **Son** : bips 3-2-1, alerte avant la reprise, « C'est reparti », fin de série. La musique peut baisser pendant le bip.
- **Notifications** quand l'écran est verrouillé : « Reprise dans 10 s » puis « C'est reparti ! ».
- **Coach IA** (Gemini, gratuit) : crée une séance de zéro, importe une séance écrite, ou adapte une séance existante.
- **Historique** des séances terminées.
- Les données de la v1 sont récupérées automatiquement (séances, historique, réglages).

---

## 📲 Installer sur iPhone

1. Ouvre le site dans **Safari**.
2. Appuie sur **Partager** (le carré avec la flèche).
3. Si besoin, appuie sur **« En voir plus »**.
4. Choisis **« Sur l'écran d'accueil »**, puis **Ajouter**.
5. Ouvre l'app depuis l'écran d'accueil et **autorise les notifications**.

---

## 🛠️ Architecture

HTML, CSS et JavaScript **sans framework ni build** (modules ES). Seules les fonctions serveur utilisent npm.

```
index.html               coquille de l'app
css/app.css              tout le style (couleurs de la maquette)
js/app.js                démarrage, navigation entre écrans, anti-zoom
js/store.js              données (localStorage, clés pdc2_*) + migration v1
js/model.js              calcul des étapes d'une séance, durées, alertes
js/runner.js             moteur de séance (minuteur basé sur l'horloge)
js/audio.js              bips (un seul AudioContext) + gestion de la musique
js/push.js               abonnement aux notifications, programmation/annulation
js/coach.js              écran Coach IA
js/illustrations.js      chargement des SVG animés
js/ui/*.js               un fichier par écran
data/exercices.json      base des 62 exercices
data/illustrations.json  54 illustrations SVG animées
data/seances-base.json   dossiers + séances préchargées
sw.js                    service worker (cache + notifications)
api/coach.js             fonction Vercel → Gemini
api/push/schedule.js     fonction Vercel → QStash (programme les notifications)
api/push/cancel.js       fonction Vercel → QStash (annule)
api/push/send.js         appelée par QStash → envoie la notification (web-push)
tests/model.test.js      tests du modèle
docs/kit/                maquette validée et générateur d'illustrations (non déployé)
```

**Notifications, sans base de données** : quand l'app passe en arrière-plan, elle calcule les
alertes des 45 prochaines minutes et les envoie à `/api/push/schedule`. Chaque alerte devient un
message QStash avec un délai ; à l'heure dite, QStash appelle `/api/push/send`, qui vérifie la
signature puis envoie la notification. Au retour dans l'app (ou pause, passer…), tout est annulé.

---

## 🔑 Variables d'environnement (dans Vercel)

Voir `.env.example`. Ajout : `vercel env add NOM production preview`.

| Nom | Rôle |
|---|---|
| `GEMINI_API_KEY` | Clé Google AI Studio (Coach IA) |
| `QSTASH_URL`, `QSTASH_TOKEN` | Upstash QStash (programmation des notifications) |
| `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | Vérification de la signature QStash |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push (la clé publique est aussi dans `js/push.js`) |
| `APP_URL` | `https://pause-du-champion.vercel.app` |

Facultatif : `GEMINI_MODEL` pour forcer un modèle Gemini.

---

## 🧪 Développer

```bash
npm install
npm test                  # tests du modèle (durées, circuits, migration…)
vercel dev                # lance l'app + les fonctions en local
```

En local ou sur une preview, `?vitesse=10` accélère le minuteur (jamais en production).

À chaque mise en ligne, change `VERSION` dans `sw.js` pour que les iPhone récupèrent la nouvelle version.

---

## ➕ Ajouter un exercice

1. **Illustration** : le générateur est dans `docs/kit/reference/generateur/` (`gen.py` lance `more.py`).
   Dans `gen.py`, remplace les chemins `/home/claude/gen/...` (lignes 338-339) par ceux de ton PC,
   ajoute le dessin du mouvement dans `more.py`, puis lance `python gen.py`. Il écrit `out.json`
   (toutes les illustrations, sous la forme `"nom": "<svg …>"`) : copie la nouvelle entrée dans
   `data/illustrations.json`. Tu peux aussi simplement réutiliser une illustration existante.
2. **Fiche** : ajoute une ligne dans `data/exercices.json` :
   ```json
   { "key": "abc", "nom": "Mon exercice", "kind": "monMouvement", "cats": ["muscu"],
     "muscle": "Pectoraux", "serie": 40, "repos": 90, "series": 3 }
   ```
   (`key` unique et courte ; `cats` : `"muscu"` et/ou `"street"` ; temps en secondes.)
3. Change `VERSION` dans `sw.js`, puis mets en ligne. Le Coach IA connaîtra l'exercice automatiquement.

---

## ⚠️ Limites connues

- **Offres gratuites** : QStash = 1 000 messages par jour (une séance écran verrouillé en utilise
  quelques dizaines) ; Gemini gratuit = quotas Google, 20 messages par jour et par appareil dans l'app.
  Si Gemini Flash est saturé, l'app bascule sur Gemini Flash-Lite.
- **Son sur iPhone** : quand l'écran est verrouillé, l'app ne peut pas jouer de son elle-même ;
  ce sont les notifications (avec le son système) qui prennent le relais. La baisse de la musique
  pendant le bip dépend de la version d'iOS (Safari 16.4+).
- Les notifications sur iPhone demandent iOS 16.4+ et l'app installée sur l'écran d'accueil.
