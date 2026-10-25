export function createWorkerSource({version,audioVersion,audioPaths,urls}){
return `// Generated from the production build. Do not edit dist manually.
const CACHE='sequencepang3-coconut-${version}';
const AUDIO_CACHE='sequencepang3-audio-${audioVersion}';
const AUDIO_ASSETS=new Set(${JSON.stringify(audioPaths.map(file=>`/${file}`))});
const PRECACHE=${JSON.stringify(urls)};
const ASSETS=new Set(PRECACHE);
const HOME='/index.html';
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE.map(url=>new Request(url,{cache:'reload'})))));
 // A new worker waits until the game is closed; it never reloads a live puzzle.
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const name of await caches.keys())if((name.startsWith('sequencepang3-coconut-')&&name!==CACHE)||(name.startsWith('sequencepang3-audio-')&&name!==AUDIO_CACHE))await caches.delete(name);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'&&['/coconut','/coconut/','/coconut/index.html'].includes(url.pathname)){
  event.respondWith(Promise.resolve(Response.redirect(new URL('/'+url.search,self.location.origin).href,302)));return;
 }
 if(request.mode==='navigate'&&['/','/index.html'].includes(url.pathname)){
  event.respondWith((async()=>{
   // Cache-first is bounded even on a stalled network and keeps HTML paired
   // with this worker's atomic asset revision. New workers still wait for closure.
   const cached=await (await caches.open(CACHE)).match(HOME);
   return cached||fetch(request);
  })());return;
 }
 if(AUDIO_ASSETS.has(url.pathname)){
  event.respondWith((async()=>{
   let cache;
   try{cache=await caches.open(AUDIO_CACHE);const cached=await cache.match(url.pathname);if(cached)return cached;}catch{}
   const response=await fetch(request);
   if(response.ok&&response.status===200&&cache){try{await cache.put(url.pathname,response.clone());}catch{/* Quota limits never interrupt playback. */}}
   return response;
  })());return;
 }
 if(ASSETS.has(url.pathname))event.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(url.pathname);
  return cached||fetch(request);
 })());
});
`;
}
