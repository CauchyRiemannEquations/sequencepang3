import {describe,it,expect} from 'vitest';
import {createGame,moveCard,solutionFor,rulesFor,runCards,canMove,availableMoves,canPartition,canFinishRemaining,POOL,TOTAL_CARDS,type Game,type Card} from './solitaire';
const c=(value:number,linked=false):Card=>({id:String(value),value,linked});
const fixture=(piles:Card[][]):Game=>({piles,cells:[null,null],collected:[],moves:0,deal:0});
describe('sequence rules',()=>{
 it('accepts positive and negative nonzero arithmetic differences',()=>{expect(rulesFor([1,3,5,7,9])).toContainEqual({kind:'arithmetic',step:2});expect(rulesFor([9,7,5,3,1])).toContainEqual({kind:'arithmetic',step:-2});expect(rulesFor([3,3,3])).toEqual([])});
 it('accepts integer and fractional geometric ratios, rejects a changed rule',()=>{expect(rulesFor([3,6,12,24,48])).toEqual([{kind:'geometric',step:2}]);expect(rulesFor([16,8,4,2,1])).toEqual([{kind:'geometric',step:.5}]);expect(rulesFor([1,3,9,27,81])).toEqual([{kind:'geometric',step:3}]);expect(rulesFor([81,27,9,3,1])).toEqual([{kind:'geometric',step:1/3}]);expect(rulesFor([1,2,4,7])).toEqual([])});
});
describe('single card solitaire',()=>{
 it.each([0,1,2])('finishes authored deal %i using only legal single-card moves',deal=>{
   let game=createGame(deal);
   const all=game.piles.flat().map(c=>c.id).sort();expect(new Set(all).size).toBe(40);
   for(const action of solutionFor(deal)){
     const before=structuredClone(game);const next=moveCard(game,action.from,action.to);expect(next,JSON.stringify(action)).not.toBeNull();expect(game).toEqual(before);game=next!;
     expect([...game.piles.flat(),...game.cells.filter((c):c is Card=>!!c),...game.collected.flatMap(r=>r.cards)].map(c=>c.id).sort()).toEqual(all);
   }
   expect(game.collected).toHaveLength(8);expect(game.moves).toBe(42);expect(game.piles.flat()).toHaveLength(0);expect(game.cells).toEqual([null,null]);expect(availableMoves(game)).toEqual([]);
 });
 it('moves only the top card; removing it reveals the next one',()=>{
   const game=fixture([[c(1),c(3) ],[]]);const next=moveCard(game,{kind:'pile',index:0},{kind:'pile',index:1})!;
   expect(next.piles.map(p=>p.map(c=>c.value))).toEqual([[1],[3]]);expect(next.moves).toBe(1);expect(next.piles[1][0].linked).toBe(false);
 });
 it('locks the rule only for the connected suffix, not the original dealt pile',()=>{
   const game=fixture([[c(48),c(1),c(3,true)],[c(5)],[c(4)]]);
   expect(canMove(game,{kind:'pile',index:1},{kind:'pile',index:0})).toBe(true);
   expect(canMove(game,{kind:'pile',index:2},{kind:'pile',index:0})).toBe(false);
   expect(runCards(game.piles[0]).map(c=>c.value)).toEqual([1,3]);
 });
 it('allows either rule while two cards are ambiguous',()=>{
   const game=fixture([[c(1),c(2,true)],[c(3)],[c(4)]]);
   expect(canMove(game,{kind:'pile',index:1},{kind:'pile',index:0})).toBe(true);expect(canMove(game,{kind:'pile',index:2},{kind:'pile',index:0})).toBe(true);
 });
 it('refuses occupied cells, identical locations, empty sources, and invalid destinations without consuming a turn',()=>{
   const game=fixture([[c(1)],[]]);game.cells[0]=c(3);
   for(const to of [{kind:'cell' as const,index:0},{kind:'pile' as const,index:0},{kind:'pile' as const,index:7}])expect(moveCard(game,{kind:'pile',index:0},to)).toBeNull();
   expect(moveCard(game,{kind:'pile',index:1},{kind:'cell',index:1})).toBeNull();expect(game.moves).toBe(0);
 });
 it('clears exactly five connected cards and keeps the buried card',()=>{
   const game=fixture([[c(48),c(1),c(3,true),c(5,true),c(7,true)],[c(9)]]);
   const next=moveCard(game,{kind:'pile',index:1},{kind:'pile',index:0})!;
   expect(next.collected[0].cards.map(c=>c.value)).toEqual([1,3,5,7,9]);expect(next.piles[0].map(c=>c.value)).toEqual([48]);
 });
 it('breaks and rebuilds a run through a cell, without moving a packet',()=>{
   const game=fixture([[c(1),c(3,true),c(5,true)],[]]);
   const parked=moveCard(game,{kind:'pile',index:0},{kind:'cell',index:0})!;
   expect(runCards(parked.piles[0])).toHaveLength(2);expect(parked.cells[0]?.linked).toBe(false);
   const returned=moveCard(parked,{kind:'cell',index:0},{kind:'pile',index:0})!;
   expect(runCards(returned.piles[0])).toHaveLength(3);
 });
});

describe('fixed pool and impossible leftovers',()=>{
 it('uses identical 40-card inventory across all layouts, with 4 and 8 as shared cards',()=>{
   const expected=POOL.flatMap(({value,count})=>Array(count).fill(value)).sort((a,b)=>a-b);
   expect(expected).toHaveLength(TOTAL_CARDS);
   for(const deal of [0,1,2])expect(createGame(deal).piles.flat().map(c=>c.value).sort((a,b)=>a-b)).toEqual(expected);
   expect(POOL.filter(p=>p.count===4).map(p=>p.value)).toEqual([4,8]);
 });
 it('detects impossible leftovers despite legal card movements',()=>{
   expect(canPartition([1,1,1,1,1])).toBe(false);
   expect(canPartition([1,3,5,7,9,2,4,8,16,32])).toBe(true);
   expect(canPartition([1,2,3,4])).toBe(false);
   expect(canPartition([])).toBe(true);
   expect(canFinishRemaining(createGame())).toBe(true);
 });
});
