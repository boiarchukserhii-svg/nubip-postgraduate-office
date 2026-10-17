const PREFIX='nubip-office-shell-';
const CACHE=PREFIX+'v62-native-education-20261017';
const SHELL=['./','./index.html','./styles.css?v=62','./data.js?v=2','./data.json?v=2','./app.js?v=62','./manifest.webmanifest','./nubip-logo.png','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  const key=request.mode==='navigate'?new URL('./index.html',scope).href:request;
  event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(request,{cache:'no-store'});if(response.ok){await cache.put(key,response.clone());return response;}return await cache.match(key)||response;}catch{return await cache.match(key)||Response.error();}})());
});

