// Precache the actual production filenames after Vite has finished hashing them.
import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
async function files(directory){
 const entries=await readdir(path.join(dist,directory),{withFileTypes:true});
 return (await Promise.all(entries.map(entry=>entry.isDirectory()?files(`${directory}/${entry.name}`):`${directory}/${entry.name}`))).flat();
}
const manifest=JSON.parse(await readFile(path.join(dist,'.vite/manifest.json'),'utf8'));
const assets=[...new Set(Object.values(manifest).flatMap(entry=>[entry.file,...(entry.css||[])]))].sort();
const icons=(await files('coconut/icons')).filter(file=>file.endsWith('.png'));
const logos=(await files('coconut/logos')).filter(file=>file.endsWith('.png'));
const paths=['index.html','coconut/index.html','manifest.webmanifest','fonts/Jua-Regular.ttf','coconut/mascot.webp',...assets,...icons,...logos].sort();
const hash=createHash('sha256');
for(const file of paths){hash.update(file);hash.update(await readFile(path.join(dist,file)));}
const version=hash.digest('hex').slice(0,16);
const urls=paths.map(file=>`/${file}`);
const source=`// Generated from the production build. Do not edit dist manually.
const CACHE='sequencepang3-coconut-${version}';
const PRECACHE=${JSON.stringify(urls)};
const ASSETS=new Set(PRECACHE);
const HOME='/index.html';
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE.map(url=>new Request(url,{cache:'reload'})))));
 // A new worker waits until the game is closed; it never reloads a live puzzle.
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('sequencepang3-coconut-')&&name!==CACHE)await caches.delete(name);
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
   try{const response=await fetch(request);if(response.ok)return response;}catch{}
   // Keep the offline HTML paired with this worker's complete asset revision.
   return (await caches.open(CACHE)).match(HOME);
  })());return;
 }
 if(ASSETS.has(url.pathname))event.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(url.pathname);
  return cached||fetch(request);
 })());
});
`;
await writeFile(path.join(dist,'sw.js'),source);
console.log(`Coconut PWA: ${urls.length} precached files, version ${version}`);
