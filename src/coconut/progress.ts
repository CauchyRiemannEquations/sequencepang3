export const PROGRESS_KEY='sequencepang3-coconut-progress-v1';
export type Progress={version:1;cleared:number[]};
export function readProgress(raw:string|null,total:number):Progress{
 try{
  const value=JSON.parse(raw||'null');
  if(value?.version!==1||!Array.isArray(value.cleared))return {version:1,cleared:[]};
  const cleared:number[]=[...new Set<number>(value.cleared.filter((n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=1&&n<=total))].sort((a,b)=>a-b);
  return {version:1,cleared};
 }catch{return {version:1,cleared:[]};}
}
export function nextStage(progress:Progress,total:number){
 for(let id=1;id<=total;id++)if(!progress.cleared.includes(id))return id;
 return total;
}
export function completeStage(progress:Progress,id:number,total:number):Progress{
 if(!Number.isInteger(id)||id<1||id>total)return progress;
 return {version:1,cleared:[...new Set([...progress.cleared,id])].sort((a,b)=>a-b)};
}

// A separate immutable key for each completion makes concurrent tab writes commute.
// Keep the legacy snapshot readable, but never overwrite it with a stale snapshot.
export const COMPLETION_PREFIX=`${PROGRESS_KEY}:cleared:`;
type ProgressStorage=Pick<Storage,'getItem'|'setItem'>;
export function mergeProgress(...items:Progress[]):Progress{
 return {version:1,cleared:[...new Set(items.flatMap(item=>item.cleared))].sort((a,b)=>a-b)};
}
export function loadStoredProgress(storage:ProgressStorage|undefined,total:number):Progress{
 let progress=readProgress(null,total);
 try{
  progress=readProgress(storage?.getItem(PROGRESS_KEY)??null,total);
  for(let id=1;id<=total;id++)if(storage?.getItem(`${COMPLETION_PREFIX}${id}`)==='1')progress=completeStage(progress,id,total);
 }catch{/* Storage is optional; retain every record successfully read. */}
 return progress;
}
export function saveCompletion(storage:ProgressStorage|undefined,progress:Progress,id:number,total:number):Progress{
 const completed=completeStage(mergeProgress(progress,loadStoredProgress(storage,total)),id,total);
 // Also migrate known legacy completions and retry any earlier failed writes.
 for(const clearedId of completed.cleared){
  try{storage?.setItem(`${COMPLETION_PREFIX}${clearedId}`,'1');}catch{/* Keep in-memory progress when storage is unavailable. */}
 }
 return completed;
}
export function isProgressKey(key:string|null){return key===null||key===PROGRESS_KEY||key.startsWith(COMPLETION_PREFIX);}
