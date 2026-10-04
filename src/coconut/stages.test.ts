import {describe,it,expect} from 'vitest';
import {STAGES,boardBounds} from './stages';
import {availableMoves,legalMove,WIDTH,HEIGHT} from './engine';
import {readProgress,nextStage,completeStage} from './progress';

describe('twenty-stage coconut journey',()=>{
 it('has twenty contiguous, distinct fixed boards',()=>{
  expect(STAGES.map(s=>s.id)).toEqual(Array.from({length:20},(_,i)=>i+1));
  expect(new Set(STAGES.map(s=>JSON.stringify(s.tiles)))).toHaveLength(20);
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
 it('rejects absent, unknown, and duplicate tile ids',()=>{
  const s=STAGES[0],remaining=s.tiles.map(t=>t.id);
  expect(legalMove(['bad','bad','bad'],remaining,s.tiles)).toBe(false);
  expect(legalMove(['bad',remaining[0],remaining[1]],remaining,s.tiles)).toBe(false);
  expect(legalMove(s.solution[0],remaining.filter(id=>id!==s.solution[0][0]),s.tiles)).toBe(false);
 });
});

describe('local stage progress',()=>{
 it('recovers from missing or malformed storage',()=>{
  for(const raw of [null,'bad','{"version":2,"cleared":[20]}','{"version":1,"cleared":false}'])expect(readProgress(raw,20)).toEqual({version:1,cleared:[]});
 });
 it('filters invalid entries and keeps completed stage ids unique',()=>{
  expect(readProgress('{"version":1,"cleared":[2,1,2,0,21,"3",1.5]}',20)).toEqual({version:1,cleared:[1,2]});
 });
 it('unlocks the next unfinished stage and stops at twenty',()=>{
  let progress=readProgress(null,20);expect(nextStage(progress,20)).toBe(1);
  for(let id=1;id<=20;id++){progress=completeStage(progress,id,20);expect(nextStage(progress,20)).toBe(Math.min(id+1,20));}
  expect(progress.cleared).toHaveLength(20);expect(completeStage(progress,20,20).cleared).toHaveLength(20);
 });
});
