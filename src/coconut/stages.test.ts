import {describe,it,expect} from 'vitest';
import {STAGES,boardBounds} from './stages';
import {availableMoves,legalMove,blockedReason,classify,overlaps,WIDTH,HEIGHT} from './engine';
import {readProgress,nextStage,completeStage} from './progress';

describe('sixty-stage coconut journey',()=>{
 it('has sixty contiguous, distinct fixed boards',()=>{
  expect(STAGES.map(s=>s.id)).toEqual(Array.from({length:60},(_,i)=>i+1));
  expect(new Set(STAGES.map(s=>JSON.stringify(s.tiles)))).toHaveLength(60);
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
 it.each(STAGES.slice(30,40))('stage $id requires preserving a scarce number for a covered partner',stage=>{
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
 it.each([...STAGES.slice(40,50), ...STAGES.filter(stage=>stage.id===60)])('stage $id has a real top-to-middle-to-lower unlock sequence',stage=>{
  const proof=stage.validation.layerUnlock!;
  expect(proof).toBeDefined();
  expect(stage.focus).toBe(stage.id===60?'나뉜 구역 연결':'여러 겹의 해방');
  expect(stage.tiles.length).toBeGreaterThanOrEqual(24);expect(stage.tiles.length).toBeLessThanOrEqual(30);
  expect(new Set(stage.tiles.map(t=>t.layer))).toEqual(new Set([0,1,2]));
  const middle=stage.tiles.find(t=>t.id===proof.middleTile)!,lower=stage.tiles.find(t=>t.id===proof.lowerTile)!;
  expect(middle.layer).toBe(1);expect(lower.layer).toBe(0);expect(overlaps(middle,lower)).toBe(true);
  expect(proof.middleOpenedAfterMove).toBeGreaterThan(0);
  expect(proof.lowerOpenedAfterMove).toBeGreaterThan(proof.middleOpenedAfterMove);
  let remaining=stage.tiles.map(t=>t.id);
  expect(blockedReason(middle,remaining,stage.tiles)).toBe('above');
  expect(blockedReason(lower,remaining,stage.tiles)).toBe('above');
  for(const [index,move] of stage.solution.entries()){
   const after=remaining.filter(id=>!move.includes(id));
   if(index+1===proof.middleOpenedAfterMove){
    expect(after).toContain(middle.id);expect(after).toContain(lower.id);
    expect(blockedReason(middle,remaining,stage.tiles)).toBe('above');
    expect(blockedReason(middle,after,stage.tiles)).toBeNull();
    expect(blockedReason(lower,after,stage.tiles)).toBe('above');
   }
   if(index+1===proof.lowerOpenedAfterMove){
    expect(move).toContain(middle.id);expect(after).toContain(lower.id);
    expect(blockedReason(lower,remaining,stage.tiles)).toBe('above');
    expect(blockedReason(lower,after,stage.tiles)).toBeNull();
   }
   remaining=after;
  }
 });
 it.each(STAGES.slice(40))('stage $id leaves at least one printed corner of every covered tile readable',stage=>{
  for(const tile of stage.tiles){
   const corners=[{x:tile.x+4,y:tile.y+4},{x:tile.x+WIDTH-12,y:tile.y+HEIGHT-16}];
   expect(corners.some(corner=>!stage.tiles.some(upper=>upper.layer>tile.layer&&
    upper.x<corner.x+8&&upper.x+WIDTH>corner.x&&upper.y<corner.y+12&&upper.y+HEIGHT>corner.y))).toBe(true);
  }
 });
 it.each(STAGES.slice(50,60))('stage $id requires a sequence across its two islands',stage=>{
  expect(stage.focus).toBe('나뉜 구역 연결');
  expect([24,27,30]).toContain(stage.tiles.length);
  expect([2,3]).toContain(new Set(stage.tiles.map(tile=>tile.layer)).size);
  const ordered=[...stage.tiles].sort((a,b)=>a.x-b.x);
  let split=0,channelWidth=0;
  for(let i=1;i<ordered.length;i++){
   const gap=ordered[i].x-(ordered[i-1].x+WIDTH);
   if(gap>channelWidth){channelWidth=gap;split=i;}
  }
  expect(channelWidth).toBeGreaterThanOrEqual(32);
  const left=new Set(ordered.slice(0,split).map(tile=>tile.id));
  // Local moves remove three tiles, so neither island can empty independently.
  expect(left.size%3).not.toBe(0);
  expect((ordered.length-left.size)%3).not.toBe(0);
  const crosses=(move:string[])=>move.some(id=>left.has(id))&&move.some(id=>!left.has(id));
  expect(stage.solution.some(crosses)).toBe(true);
  let remaining=stage.tiles.map(tile=>tile.id);
  if(stage.id===51){
   // Every nonempty stack exposes its own number. Removing 1, 2 and 3
   // leaves equal counts, so every valid choice can continue to an empty board.
   for(const value of [1,2,3])expect(stage.tiles.filter(tile=>tile.value===value)).toHaveLength(8);
   for(const tile of stage.tiles){
    const covers=stage.tiles.filter(upper=>upper.layer>tile.layer&&overlaps(upper,tile));
    expect(covers.every(upper=>upper.value===tile.value)).toBe(true);
    if(tile.value===1)expect(left.has(tile.id)).toBe(true);
    if(tile.value===3)expect(left.has(tile.id)).toBe(false);
   }
   expect(stage.validation.allChoicesSolvable).toBe(true);
   expect(availableMoves(remaining,stage.tiles).every(crosses)).toBe(true);
  }
  if(stage.id===60){
   let justOpened:string[]=[];
   let usedNewTileAcrossIslands=false;
   for(const move of stage.solution){
    if(crosses(move)&&move.some(id=>justOpened.includes(id)))usedNewTileAcrossIslands=true;
    const after=remaining.filter(id=>!move.includes(id));
    justOpened=stage.tiles.filter(tile=>after.includes(tile.id)&&
     blockedReason(tile,remaining,stage.tiles)&&!blockedReason(tile,after,stage.tiles)).map(tile=>tile.id);
    remaining=after;
   }
   expect(usedNewTileAcrossIslands).toBe(true);
  }
 });
 it('introduces the third layer with a simple roof, middle, then lower solution',()=>{
  const stage=STAGES[40];expect(stage.tiles).toHaveLength(24);
  expect(stage.solution[0].every(id=>stage.tiles.find(t=>t.id===id)!.layer===2)).toBe(true);
  expect(stage.solution[1].every(id=>stage.tiles.find(t=>t.id===id)!.layer===1)).toBe(true);
  expect(new Set(stage.tiles.map(t=>t.value))).toEqual(new Set([1,2,3]));
 });
 it('requires removing both roofs when a middle tile overlaps two top tiles',()=>{
  const stage=STAGES[45],remaining=stage.tiles.map(t=>t.id);
  const middle=stage.tiles.find(tile=>tile.layer===1&&stage.tiles.filter(upper=>upper.layer===2&&overlaps(upper,tile)).length>=2)!;
  expect(middle).toBeDefined();
  const roofs=stage.tiles.filter(tile=>tile.layer===2&&overlaps(tile,middle));
  for(const roof of roofs)expect(blockedReason(middle,remaining.filter(id=>!roofs.some(other=>other.id!==roof.id&&other.id===id)),stage.tiles)).toBe('above');
  expect(blockedReason(middle,remaining.filter(id=>!roofs.some(roof=>roof.id===id)),stage.tiles)).toBeNull();
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
 it('preserves forty cleared stages and unlocks forty-one after the update',()=>{
  const progress=readProgress(JSON.stringify({version:1,cleared:Array.from({length:40},(_,i)=>i+1)}),50);
  expect(progress.cleared).toHaveLength(40);expect(nextStage(progress,50)).toBe(41);
 });
 it('resumes a fifty-stage save at the first island board',()=>{
  const cleared=Array.from({length:50},(_,i)=>i+1);
  const progress=readProgress(JSON.stringify({version:1,cleared}),STAGES.length);
  expect(progress.cleared).toEqual(cleared);
  expect(nextStage(progress,STAGES.length)).toBe(51);
 });
 it('unlocks the next unfinished stage and stops at sixty',()=>{
  const total=STAGES.length;
  let progress=readProgress(null,total);expect(nextStage(progress,total)).toBe(1);
  for(let id=1;id<=total;id++){
   progress=completeStage(progress,id,total);
   expect(nextStage(progress,total)).toBe(Math.min(id+1,total));
  }
  expect(progress.cleared).toHaveLength(total);
  expect(completeStage(progress,total,total).cleared).toHaveLength(total);
 });
});
