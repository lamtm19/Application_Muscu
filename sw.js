/* ================================================================
   sw.js — Service worker de Pause du Champion v2
   - Cache : réseau d'abord pour index.html (les mises à jour arrivent
     toujours), cache d'abord pour le reste (rapide et hors ligne).
   - Push : affiche les notifications « Reprise dans 10 s » / « C'est reparti ! ».
   Change le numéro de VERSION à chaque mise en ligne.
================================================================ */
const VERSION = '2.0.0';
const CACHE = 'pdc-v2-' + VERSION;

const FICHIERS = [
  './', 'index.html', 'manifest.json', 'logo.png', 'logoApp.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'css/app.css',
  'js/app.js', 'js/store.js', 'js/model.js', 'js/runner.js', 'js/audio.js', 'js/push.js', 'js/coach.js', 'js/illustrations.js',
  'js/ui/commun.js', 'js/ui/accueil.js', 'js/ui/editeur.js', 'js/ui/biblio.js', 'js/ui/recap.js', 'js/ui/seance.js',
  'js/ui/reglages.js', 'js/ui/aide.js', 'js/ui/historique.js',
  'data/exercices.json', 'data/illustrations.json', 'data/seances-base.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Supprime les anciens caches (dont celui de la v1, resté figé)
  e.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return; // Coach et notifications : toujours en ligne

  // Page principale : réseau d'abord, cache en secours
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    e.respondWith(fetch(req).then(rep => {
      const copie = rep.clone();
      caches.open(CACHE).then(c => c.put('index.html', copie));
      return rep;
    }).catch(() => caches.match('index.html')));
    return;
  }

  // Le reste (JS, CSS, images, données, polices) : cache d'abord
  e.respondWith(caches.match(req).then(enCache => enCache || fetch(req).then(rep => {
    if (rep.ok && (url.origin === location.origin || url.host.includes('fonts.g'))) {
      const copie = rep.clone();
      caches.open(CACHE).then(c => c.put(req, copie));
    }
    return rep;
  })));
});

/* ---------- Notifications push ---------- */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titre: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titre || 'Pause du Champion', {
    body: d.texte || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'pdc',          // remplace la notification précédente
    renotify: true,      // …mais refait le son système
    silent: false,
    vibrate: [200, 100, 200],
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(fenetres => {
    for (const f of fenetres) if ('focus' in f) return f.focus();
    return self.clients.openWindow('./');
  }));
});
