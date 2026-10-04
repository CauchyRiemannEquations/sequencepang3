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
