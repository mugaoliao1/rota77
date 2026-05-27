// Service Worker — MídiaCar PWA
// A versão é injetada automaticamente em postbuild (scripts/inject-sw-version.mjs)
// Para forçar atualização manual: basta fazer um novo deploy

const BUILD_VERSION = 'mpnpfxuz'
const CACHE_STATIC  = 'midiacar-static-'  + BUILD_VERSION
const CACHE_DYNAMIC = 'midiacar-dynamic-' + BUILD_VERSION

// Assets pré-cacheados na instalação
const PRECACHE = [
  '/tablet.html',
  '/portal.html',
  '/painel.html',
  // Firebase SDKs self-hosted (versão local para suporte offline completo)
  '/shared/js/vendor/firebase-app-compat.js',
  '/shared/js/vendor/firebase-database-compat.js',
  '/shared/js/vendor/firebase-auth-compat.js',
  // shared
  '/shared/js/firebase.js',
  '/shared/js/listeners.js',
  '/shared/js/logger.js',
  '/shared/js/updater.js',
  // tablet
  '/tablet/js/state.js',
  '/tablet/js/helpers.js',
  '/tablet/js/ui.js',
  '/tablet/js/clima.js',
  '/tablet/js/player.js',
  '/tablet/js/main.js',
  '/tablet/js/stability.js',
  // portal
  '/portal/js/state.js',
  '/portal/js/auth.js',
  '/portal/js/relatorio.js',
  '/portal/js/anuncios.js',
  '/portal/js/previa.js',
  '/portal/js/pdf.js',
  // painel
  '/painel/js/state.js',
  '/painel/js/ui.js',
  '/painel/js/dashboard.js',
  '/painel/js/anunciantes.js',
  '/painel/js/midia.js',
  '/painel/js/tablets.js',
  '/painel/js/editorial.js',
  '/painel/js/config.js',
  '/painel/js/csv.js',
  '/painel/js/templates.js',
  '/painel/js/reset.js',
  '/painel/js/auth.js',
  '/painel/js/listeners.js',
  // ícones
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Extensões de vídeo nunca são cacheadas (arquivos grandes, servidos pelo CDN)
const VIDEO_EXT = ['.mp4', '.webm', '.ogg', '.m3u8', '.ts']

function isVideoAsset(url) {
  return VIDEO_EXT.some(function (ext) { return url.pathname.endsWith(ext) })
}

// ── Instalação: pré-cacheia o app shell ─────────────────────────────────────
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(function (cache) { return cache.addAll(PRECACHE) })
      .then(function () { return self.skipWaiting() })
  )
})

// ── Ativação: limpa caches antigos e notifica clientes ──────────────────────
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) { return k !== CACHE_STATIC && k !== CACHE_DYNAMIC })
            .map(function (k) { return caches.delete(k) })
        )
      })
      .then(function () { return self.clients.claim() })
      .then(function () {
        // Avisa todos os clientes que há nova versão disponível
        return self.clients.matchAll({ includeUncontrolled: true })
      })
      .then(function (clients) {
        clients.forEach(function (client) {
          client.postMessage({ type: 'SW_UPDATED', version: BUILD_VERSION })
        })
      })
  )
})

// ── Fetch: intercepta apenas same-origin, não-GET é ignorado ────────────────
self.addEventListener('fetch', function (event) {
  var request = event.request
  if (request.method !== 'GET') return

  var url = new URL(request.url)

  // Cross-origin (Firebase, CDN, gstatic, Cloudinary, OpenWeather…) → browser handle
  if (url.origin !== self.location.origin) return

  // Vídeos → nunca cachear
  if (isVideoAsset(url)) return

  var isHTML  = request.destination === 'document' || url.pathname.endsWith('.html')
  var isImage = request.destination === 'image' || /\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname)

  if (isHTML) {
    // Network-first: sempre busca versão fresca; cai no cache se offline
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response.ok) {
            var toCache = response.clone()  // clona de forma síncrona, antes do return
            caches.open(CACHE_DYNAMIC).then(function (c) { c.put(request, toCache) })
          }
          return response
        })
        .catch(function () { return caches.match(request) })
    )

  } else if (isImage) {
    // Cache-first: ícones e imagens locais raramente mudam
    event.respondWith(
      caches.open(CACHE_STATIC).then(function (cache) {
        return cache.match(request).then(function (cached) {
          if (cached) return cached
          return fetch(request).then(function (response) {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
        })
      })
    )

  } else {
    // JS/CSS → stale-while-revalidate: serve cache imediatamente, atualiza em background
    event.respondWith(
      caches.open(CACHE_STATIC).then(function (cache) {
        return cache.match(request).then(function (cached) {
          var networkFetch = fetch(request).then(function (response) {
            if (response.ok) cache.put(request, response.clone())
            return response
          }).catch(function () { return cached })
          return cached || networkFetch
        })
      })
    )
  }
})
