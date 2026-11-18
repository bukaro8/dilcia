const CACHE="dilcia-shell-v3";
const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/glucometro-192.png",
  "/icons/glucometro-512.png",
  "/icons/glucometro-apple.png",
  "/illustrations/glucometro-ayunas.png",
  "/illustrations/glucometro-almuerzo.png",
  "/illustrations/glucometro-cena.png",
];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("dilcia-shell-")&&key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener("fetch",event=>{const request=event.request,url=new URL(request.url);if(request.method!=="GET"||url.pathname.startsWith("/api/")||url.pathname.startsWith("/cuenta/")||url.pathname.toLowerCase().includes("report"))return;event.respondWith(fetch(request).then(response=>{if(response.ok&&url.origin===location.origin)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response}).catch(async()=>await caches.match(request)||Response.error()))});
