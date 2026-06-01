/* Service Worker — SunXP Pro (mode hors-ligne) */
const CACHE_NAME = 'sunxp-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/legal.html',
  '/css/style.css',
  '/css/stations.css',
  '/css/heures.css',
  '/css/repertoire.css',
  '/img/logo.svg',
  '/img/matting_2026-4-21_fa553fc4-3d99-11f1-9b2d-16737e16766a.png',
  '/js/utils.js',
  '/js/accueil.js',
  '/js/heures-calculs.js',
  '/js/heures-dashboard.js',
  '/js/heures.js',
  '/js/activite.js',
  '/js/stats.js',
  '/js/stats-import.js',
  '/js/stats-impacts.js',
  '/js/primes.js',
  '/js/primes-calculs.js',
  '/js/primes-message.js',
  '/js/repertoire.js',
  '/js/repertoire-form.js',
  '/js/flotte.js',
  '/js/flotte-camions.js',
  '/js/flotte-degats.js',
  '/js/flotte-problemes.js',
  '/js/ressources-humaines.js',
  '/js/chef-equipe.js',
  '/js/planning.js',
  '/js/documents.js',
  '/js/documents-chauffeurs.js',
  '/js/bouton-deroulant.js',
  '/js/parametres.js',
  '/js/stations.js',
  '/js/supabase-db.js',
  '/js/realtime.js',
  '/js/chauffeur-portal.js',
  '/js/chauffeur-portal-extra.js',
  '/js/badges.js',
  '/js/badges-calculs.js',
  '/js/badges-manager.js',
  '/js/analyse-performance.js',
  '/js/rapport-chauffeur.js',
  '/js/rapport-concessions.js',
  '/js/eos-extraction.js',
  '/js/contacts.js',
  '/js/cles-codes.js',
  '/js/demandes-chauffeurs.js',
  '/js/repos-demandes.js',
  '/js/identifier-chauffeurs.js',
  '/js/checkTSM.js',
  '/js/push-notifications.js',
  '/js/admin.js',
  '/js/admin-monitoring.js',
  '/js/admin-sauvegarde.js',
  '/js/admin-utilisateurs.js',
  '/js/admin-logs.js',
  '/js/admin-maintenance.js',
  '/js/notifications-centre.js',
  '/js/games.js',
  '/js/game-enveloppe.js',
  '/js/game-scan.js',
  '/js/game-colis.js',
  '/js/game-boite.js',
  '/js/game-chargement.js',
  '/js/game-gps.js',
  '/js/game-memoire.js',
  '/js/game-livreur-parfait.js',
  '/js/chauffeur-accueil.js'
];

// Installation : mettre en cache tous les fichiers
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('SW: certains fichiers non mis en cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation : supprimer les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    })
  );
  self.clients.claim();
});

// Push : recevoir une notification push
self.addEventListener('push', event => {
  let data = { title: 'SunXP Pro', body: 'Nouvelle notification', icon: '/img/matting_2026-4-21_fa553fc4-3d99-11f1-9b2d-16737e16766a.png' };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/img/matting_2026-4-21_fa553fc4-3d99-11f1-9b2d-16737e16766a.png',
      badge: '/img/matting_2026-4-21_fa553fc4-3d99-11f1-9b2d-16737e16766a.png',
      vibrate: [200, 100, 200],
      data: data.url || '/'
    })
  );
});

// Notification click : ouvrir l'appli
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(event.notification.data || '/');
    })
  );
});

// Fetch : réseau d'abord, cache en fallback
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et les requêtes vers Supabase/CDN
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre à jour le cache avec la réponse fraîche
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Pas de réseau → servir depuis le cache
        return caches.match(event.request).then(cached => {
          return cached || new Response('Hors ligne', { status: 503 });
        });
      })
  );
});
