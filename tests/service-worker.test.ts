import {describe,it,expect,vi} from 'vitest';
import {runInNewContext} from 'node:vm';
import {createWorkerSource} from '../scripts/coconut-worker.mjs';
function worker(network=vi.fn(),cached:unknown={revision:'old'}){
 const handlers:Record<string,(event:any)=>void>={},match=vi.fn(async()=>cached),addAll=vi.fn(async()=>{}),claim=vi.fn(),skipWaiting=vi.fn();
 const caches={open:vi.fn(async()=>({match,addAll})),keys:async()=>['sequencepang3-coconut-old','sequencepang3-coconut-obsolete','unrelated'],delete:vi.fn()};
 const source=createWorkerSource({version:'old',audioVersion:'audio',audioPaths:[],urls:['/index.html','/assets/old.js']});
 runInNewContext(source,{self:{location:{origin:'https://game.test'},addEventListener:(type:string,fn:any)=>{handlers[type]=fn;},clients:{claim},skipWaiting},caches,fetch:network,URL,Request:class extends Request{constructor(url:string,options?:RequestInit){super(new URL(url,'https://game.test'),options);}},Response});
 function navigate(path='/'){let response:Promise<any>|undefined;handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://game.test'+path},respondWith:(value:Promise<any>)=>{response=value;}});return response!;}
 return {navigate,handlers,caches,network,skipWaiting,claim,match,addAll};
}
describe('version-consistent offline worker',()=>{
 it.each(['offline','stalled','slow-success','new-version-online'])('returns current cached HTML immediately with %s network',async mode=>{
  const network=vi.fn(()=>mode==='offline'?Promise.reject(Error('offline')):mode==='new-version-online'?Promise.resolve({revision:'new'}):new Promise(()=>{}));
  const w=worker(network);
  expect(await w.navigate('/?installed=1')).toEqual({revision:'old'});
  expect(w.caches.open).toHaveBeenCalledWith('sequencepang3-coconut-old');
  expect(w.match).toHaveBeenCalledWith('/index.html');expect(network).not.toHaveBeenCalled();
 });
 it('uses the network only if the installed shell was evicted',async()=>{
  const network=vi.fn(async()=>({revision:'network'})),w=worker(network,null);
  expect(await w.navigate()).toEqual({revision:'network'});expect(network).toHaveBeenCalledTimes(1);
 });
 it('keeps legacy page redirects and query strings',async()=>{
  const w=worker();const response=await w.navigate('/coconut/?from=old');
  expect(response.status).toBe(302);expect(response.headers.get('location')).toBe('https://game.test/?from=old');
 });
 it('installs atomically without taking over or reloading an active game',async()=>{
  const w=worker();let installed:Promise<any>|undefined;
  w.handlers.install({waitUntil:(promise:Promise<any>)=>{installed=promise;}});await installed;
  expect(w.addAll).toHaveBeenCalledTimes(1);expect(w.skipWaiting).not.toHaveBeenCalled();expect(w.claim).not.toHaveBeenCalled();
  let activated:Promise<any>|undefined;w.handlers.activate({waitUntil:(promise:Promise<any>)=>{activated=promise;}});await activated;
  expect(w.caches.delete).toHaveBeenCalledWith('sequencepang3-coconut-obsolete');expect(w.caches.delete).not.toHaveBeenCalledWith('sequencepang3-coconut-old');expect(w.caches.delete).not.toHaveBeenCalledWith('unrelated');
 });
});
