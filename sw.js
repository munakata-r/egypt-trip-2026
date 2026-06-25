/* エジプト旅行2026 — Service Worker（オフライン対応） */
const CACHE = 'egypt2026-v23';
/* 同一オリジンのコアファイルを事前キャッシュ（相対パス＝サブディレクトリ配信に対応） */
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './images/pyramid.webp',
  './images/hero-ruins.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* ナビゲーション（ページ遷移）はネット優先 → 失敗時はキャッシュのindex.htmlを返す */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  /* それ以外（画像/タイル/フォント/CDN）は stale-while-revalidate */
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        /* opaque含め取得できたものはキャッシュ（地図タイル等のオフライン再表示用） */
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
