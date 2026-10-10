// Service worker: omogućava instalaciju i brže otvaranje. Podaci se UVIJEK čitaju uživo iz baze.
const CACHE = 'malena-v1'
self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return // Supabase i ostalo ide direktno
  // Mreža prvo (uvijek najnovija verzija aplikacije), keš samo ako nema interneta
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {})
      return res
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html')))
  )
})
