// Çevrimdışı çalışma: uygulama ve tüm Kur'an metni ilk açılışta cihaza kaydedilir.
// Uygulama dosyaları değiştiğinde SURUM artırılmalıdır (yayin_hazirla.py bunu otomatik yapar).
const SURUM = "hafiz-ef42c5ff4b";
const KABUK = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/app.js", "js/data.js", "js/store.js", "js/audio.js", "js/oku.js", "js/ekranlar.js", "js/ayarlar.js", "js/ui.js",
  "fonts/AmiriQuran-Regular.ttf", "fonts/Alegreya-Var.ttf",
  "fonts/AlegreyaSans-Regular.ttf", "fonts/AlegreyaSans-Medium.ttf", "fonts/AlegreyaSans-Bold.ttf",
  "icons/icon.svg", "icons/rozet.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "data/sureler.json", "data/sayfalar.json", "data/cuzler.json",
];
const SURELER = Array.from({ length: 114 }, (_, i) => `data/sure/${String(i + 1).padStart(3, "0")}.json`);
const taze = (u) => new Request(u, { cache: "reload" });

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SURUM);
    await c.addAll(KABUK.map(taze));                                   // uygulama kabuğu: hepsi ya da hiçbiri
    await Promise.allSettled(SURELER.map((u) => c.add(taze(u))));      // sureler: inemeyen sonra tamamlanır
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("hafiz-") && k !== SURUM) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== "GET") return; // ses dosyalarını audio.js yönetir
  e.respondWith((async () => {
    const c = await caches.open(SURUM);
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const r = await fetch(e.request);
      if (r.ok) e.waitUntil(c.put(e.request, r.clone()));
      return r;
    } catch {
      if (e.request.mode === "navigate") return (await c.match("index.html")) || Response.error();
      return Response.error();
    }
  })());
});
