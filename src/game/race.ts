export type Race = { phase:'ready'|'running'|'finished'; startedAt:number|null; elapsed:number };
export const newRace=():Race=>({phase:'ready',startedAt:null,elapsed:0});
export function startRace(race:Race,now:number):Race {return race.phase==='ready'?{phase:'running',startedAt:now,elapsed:0}:race;}
export function elapsedMs(race:Race,now:number):number {return race.phase==='running'?Math.max(0,now-race.startedAt!):race.elapsed;}
export function finishRace(race:Race,now:number):Race {return race.phase==='running'?{...race,phase:'finished',elapsed:elapsedMs(race,now)}:race;}
export function formatTime(ms:number):string {
  const tenths=Math.floor(Math.max(0,ms)/100);
  return `${String(Math.floor(tenths/600)).padStart(2,'0')}:${String(Math.floor(tenths/10)%60).padStart(2,'0')}.${tenths%10}`;
}
export function readBest(key:string):number|null {
  try{const raw=localStorage.getItem(key);if(raw===null)return null;const n=Number(raw);return Number.isFinite(n)&&n>0?n:null}catch{return null}
}
export function saveBest(key:string,ms:number):number {
  const previous=readBest(key);const best=previous===null?ms:Math.min(ms,previous);
  try{localStorage.setItem(key,String(best))}catch{/* Timing remains playable when storage is unavailable. */}
  return best;
}
