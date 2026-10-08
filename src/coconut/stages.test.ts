import {describe,it,expect} from 'vitest';
import {STAGES,boardBounds} from './stages';
import {availableMoves,legalMove,blockedReason,classify,WIDTH,HEIGHT} from './engine';
import {readProgress,nextStage,completeStage} from './progress';

describe('forty-stage coconut journey',()=>{
 it('has forty contiguous, distinct fixed boards',()=>{
  expect(STAGES.map(s=>s.id)).toEqual(Array.from({length:40},(_,i)=>i+1));
  expect(new Set(STAGES.map(s=>JSON.stringify(s.tiles)))).toHaveLength(40);
 });
 it.each(STAGES)('stage $id has a valid complete solution',stage=>{
  const tiles=stage.tiles,bounds=boardBounds(tiles);
  expect(tiles.length%3).toBe(0);expect(new Set(tiles.map(t=>t.id)).size).toBe(tiles.length);
  expect(tiles.every(t=>Number.isInteger(t.value)&&t.value>=1&&t.value<=9)).toBe(true);
  for(const tile of tiles){
   expect(tile.x-bounds.minX).toBeGreaterThanOrEqual(0);expect(tile.y-bounds.minY).toBeGreaterThanOrEqual(0);
   expect(tile.x-bounds.minX+WIDTH).toBeLessThanOrEqual(bounds.width);
   expect(tile.y-bounds.minY+HEIGHT).toBeLessThanOrEqual(bounds.height);
  }
  for(let a=0;a<tiles.length;a++)for(let b=a+1;b<tiles.length;b++){
   if(tiles[a].layer===tiles[b].layer)expect(Math.abs(tiles[a].x-tiles[b].x)>=WIDTH||Math.abs(tiles[a].y-tiles[b].y)>=HEIGHT).toBe(true);
  }
  let remaining=tiles.map(t=>t.id);
  expect(availableMoves(remaining,tiles)).toHaveLength(stage.validation.initialMoves);
  for(const move of stage.solution){expect(legalMove(move,remaining,tiles)).toBe(true);remaining=remaining.filter(id=>!move.includes(id));}
  expect(remaining).toEqual([]);expect(stage.solution).toHaveLength(tiles.length/3);
 });
 it.each(STAGES.slice(0,10))('every legal removal path in tutorial $id can finish',stage=>{
  const seen=new Set<string>();
  function visit(remaining:string[]){
   if(!remaining.length)return;
   const key=[...remaining].sort().join(',');if(seen.has(key))return;seen.add(key);
   const moves=availableMoves(remaining,stage.tiles);expect(moves.length).toBeGreaterThan(0);
   for(const move of moves)visit(remaining.filter(id=>!move.includes(id)));
  }
  visit(stage.tiles.map(t=>t.id));expect(stage.validation.allChoicesSolvable).toBe(true);
 });
 it.each(STAGES.slice(20))('stage $id has same-number choices that open different lower tiles',stage=>{
  const remaining=stage.tiles.map(t=>t.id),groups=new Map<string,Set<string>>();
  for(const move of availableMoves(remaining,stage.tiles)){
   const key=move.map(id=>stage.tiles.find(t=>t.id===id)!.value).sort((a,b)=>a-b).join(',');
   const after=remaining.filter(id=>!move.includes(id));
   const opened=stage.tiles.filter(tile=>after.includes(tile.id)&&blockedReason(tile,remaining,stage.tiles)&&!blockedReason(tile,after,stage.tiles)).map(t=>t.id).sort().join(',');
   if(!groups.has(key))groups.set(key,new Set());groups.get(key)!.add(opened);
  }
  expect([...groups.values()].some(choices=>choices.size>1)).toBe(true);
 });
 it.each(STAGES.slice(30))('stage $id requires preserving a scarce number for a covered partner',stage=>{
  const proof=stage.validation.numberPreservation!;
  expect(proof).toBeDefined();expect(stage.focus).toBe('필요한 숫자 남기기');
  expect(stage.tiles.length).toBeGreaterThanOrEqual(24);expect(stage.tiles.length).toBeLessThanOrEqual(30);
  expect(new Set(stage.tiles.map(t=>t.layer))).toEqual(new Set([0,1]));
  const scarce=stage.tiles.find(t=>t.id===proof.scarceTile)!;
  expect(scarce.value).toBe(proof.scarceValue);
  expect(stage.tiles.filter(t=>t.value===scarce.value)).toHaveLength(1);
  const remaining=stage.tiles.map(t=>t.id);
  expect(blockedReason(scarce,remaining,stage.tiles)).toBeNull();
  expect(legalMove(proof.trapMove,remaining,stage.tiles)).toBe(true);
  expect(proof.trapMove).toContain(scarce.id);
  const savedStep=stage.solution.findIndex(move=>move.includes(scarce.id));
  expect(savedStep).toBeGreaterThanOrEqual(2);expect(savedStep+1).toBe(proof.savedUntilMove);
  expect(stage.solution[savedStep].some(id=>id!==scarce.id&&!!blockedReason(stage.tiles.find(t=>t.id===id)!,remaining,stage.tiles))).toBe(true);
  // Ignore all covers: if even these numbers cannot be partitioned into legal
  // triples, no physical removal order can rescue the tempting first move.
  const after=stage.tiles.filter(t=>!proof.trapMove.includes(t.id)).map(t=>t.value);
  expect(canPartitionNumbers(after)).toBe(false);
  expect(canPartitionNumbers(stage.tiles.map(t=>t.value))).toBe(true);
 });
 it('rejects absent, unknown, and duplicate tile ids',()=>{
  const s=STAGES[0],remaining=s.tiles.map(t=>t.id);
  expect(legalMove(['bad','bad','bad'],remaining,s.tiles)).toBe(false);
  expect(legalMove(['bad',remaining[0],remaining[1]],remaining,s.tiles)).toBe(false);
  expect(legalMove(s.solution[0],remaining.filter(id=>id!==s.solution[0][0]),s.tiles)).toBe(false);
 });
});

function canPartitionNumbers(values:number[]){
 const seen=new Map<string,boolean>();
 function visit(numbers:number[]):boolean{
  if(!numbers.length)return true;
  const key=numbers.join(',');if(seen.has(key))return seen.get(key)!;
  const first=numbers[0];
  for(let j=1;j<numbers.length;j++)for(let k=j+1;k<numbers.length;k++){
   if(!classify([first,numbers[j],numbers[k]]))continue;
   if(visit(numbers.filter((_,index)=>index!==0&&index!==j&&index!==k))){seen.set(key,true);return true;}
  }
  seen.set(key,false);return false;
 }
 return visit([...values].sort((a,b)=>a-b));
}

describe('local stage progress',()=>{
 it('recovers from missing or malformed storage',()=>{
  for(const raw of [null,'bad','{"version":2,"cleared":[20]}','{"version":1,"cleared":false}'])expect(readProgress(raw,30)).toEqual({version:1,cleared:[]});
 });
 it('filters invalid entries and keeps completed stage ids unique',()=>{
  expect(readProgress('{"version":1,"cleared":[2,1,2,0,31,"3",1.5]}',30)).toEqual({version:1,cleared:[1,2]});
 });
 it('preserves twenty cleared stages and unlocks twenty-one after the update',()=>{
  const progress=readProgress(JSON.stringify({version:1,cleared:Array.from({length:20},(_,i)=>i+1)}),30);
  expect(progress.cleared).toHaveLength(20);expect(nextStage(progress,30)).toBe(21);
 });
 it('preserves thirty cleared stages and unlocks thirty-one after the update',()=>{
  const progress=readProgress(JSON.stringify({version:1,cleared:Array.from({length:30},(_,i)=>i+1)}),40);
  expect(progress.cleared).toHaveLength(30);expect(nextStage(progress,40)).toBe(31);
 });
 it('unlocks the next unfinished stage and stops at forty',()=>{
  let progress=readProgress(null,40);expect(nextStage(progress,40)).toBe(1);
  for(let id=1;id<=40;id++){progress=completeStage(progress,id,40);expect(nextStage(progress,40)).toBe(Math.min(id+1,40));}
  expect(progress.cleared).toHaveLength(40);expect(completeStage(progress,40,40).cleared).toHaveLength(40);
 });
});
