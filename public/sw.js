/* Radar Financeiro: o Service Worker nunca armazena respostas da API ou dados financeiros. */
const VERSION = 'radar-financeiro-pwa-v1';
const STATIC_CACHE = VERSION + '-static';
const PAGE_CACHE = VERSION + '-shell';
const INITIAL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/assets/brand/simbolo-radar.webp',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(INITIAL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('radar-financeiro-pwa-') &&
          key !== STATIC_CACHE && key !== PAGE_CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Nunca cachear API, autenticação, autorização ou respostas com credenciais.
  if (url.pathname === '/api' || url.pathname.startsWith('/api/') ||
      request.headers.has('Authorization')) return;

  if (request.mode === 'navigate') {
    // Sempre prioriza o servidor. O shell em cache serve apenas para iniciar a UI offline;
    // operações financeiras dependem da API e continuam indisponíveis sem conexão.
    event.respondWith(
      fetch(request).then(async response => {
        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
          const copia = response.clone();
          event.waitUntil(caches.open(PAGE_CACHE).then(cache => cache.put('/', copia)).catch(() => {}));
        }
        return response;
      }).catch(async () => (await caches.match('/')) ?? Response.error()),
    );
    return;
  }

  // Só recursos de apresentação (nunca anexos nem imagens privadas).
  const staticAsset = url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/icons/')
    || /^\/(?:favicon\.ico|manifest\.webmanifest)$/.test(url.pathname)
    || /\.(?:js|css|woff2?)$/.test(url.pathname);
  if (!staticAsset) return;

  // Arquivos Angular em produção possuem nomes hash; assets públicos ficam
  // restritos ao cache de versão do aplicativo.
  event.respondWith(caches.open(STATIC_CACHE).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }));
});
