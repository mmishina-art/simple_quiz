// アプリのファイルを変更したら CACHE_VERSION を上げてください（利用者に更新が届きます）。
const CACHE_VERSION = 'v10';
const CACHE_NAME = `simple-quiz-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/storage.js',
  './js/sound.js',
  './js/chara.js',
  './js/debug.js',
  './js/data/helpers.js',
  './js/data/school.js',
  './js/data/school/kokugo.js',
  './js/data/school/sansu.js',
  './js/data/school/rika.js',
  './js/data/school/shakai.js',
  './js/data/trivia.js',
  './js/data/trivia/ikimono.js',
  './js/data/trivia/sekai.js',
  './js/data/trivia/kurashi.js',
  './js/data/trivia/sports.js',
  './js/data/english.js',
  './js/data/english/eiken5.js',
  './js/data/english/eiken4.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('simple-quiz-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// キャッシュ優先。オフラインでも遊べるようにする。
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => (request.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    }),
  );
});
