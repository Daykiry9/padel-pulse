/**
 * Service worker deliberadamente vacío: solo red, cero caché.
 *
 * El navegador exige un SW con handler de fetch para ofrecer instalar la PWA.
 * Pero cachear romperia el wrapper de Capacitor: el WebView nativo cargaria
 * assets viejos despues de cada deploy de Vercel (ver apps/web/CAPACITOR.md).
 * Este SW cumple el requisito sin guardar nada, asi que no hay staleness.
 *
 * Si algun dia se quiere offline de verdad, hay que resolver antes la
 * invalidacion para el WebView, no simplemente empezar a cachear aca.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Barre cualquier caché que haya dejado una version anterior de este archivo.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Passthrough explicito. Sin esto el navegador no lo cuenta como instalable.
  event.respondWith(fetch(event.request));
});
