const CACHE_NAME = "slb-v2";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./game.js",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js",
  "./assets/images/bg.png",
  "./assets/images/stengun.png",
  "./assets/images/bullet.png",
  "./assets/images/target1.png",
  "./assets/images/target2.png",
  "./assets/images/target3.png",
  "./assets/images/target4.png",
  "./assets/images/target5.png",
  "./assets/audio/bgm.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    }),
  );
});
