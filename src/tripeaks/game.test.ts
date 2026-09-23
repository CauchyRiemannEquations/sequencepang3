import {describe,it,expect} from 'vitest';
import {buildBoard,newGame,reduceGame,canPick,isOpen,chainValues,remainingMs,VALUES,DURATION_MS,REFRESH_COST_MS,type Game} from './game';
const start=()=>reduceGame(newGame(),{type:'start',now:1000});
const pick=(g:Game,id:number)=>reduceGame(g,{type:'pick',id,now:2000});
describe('tripeaks sequence prototype',()=>{
 it('exposes only the nine bottom cards at the start',()=>{const g=start();expect(g.cards.filter(c=>isOpen(g,c.id))).toHaveLength(9);expect(canPick(g,0)).toBe(false);expect(pick(g,0)).toBe(g)});
 it.each([0,1,2])('keeps the same inventory and a real clear path in layout %i',layout=>{
  let g=reduceGame(newGame(layout),{type:'start',now:1000});
  for(let round=1;round<=3;round++){
   const b=buildBoard(round,layout);expect(b.cards.map(c=>c.value).sort((a,b)=>a-b)).toEqual([...VALUES].sort((a,b)=>a-b));
   for(let i=0;i<18;i++){expect(canPick(g,b.solution[i])).toBe(true);g=pick(g,b.solution[i]);if(i%3===2)g=reduceGame(g,{type:'pang',now:2000});}
   expect(g.score).toBe(round*18);expect(g.round).toBe(round+1);expect(g.removed).toEqual([]);
  }
 });
 it('undo and cancel restore the covered-card dependency without awarding points',()=>{
  let g=start();const ids=buildBoard(1,0).solution;
  g=pick(pick(g,ids[0]),ids[1]);expect(g.score).toBe(0);expect(g.chain).toHaveLength(2);
  g=reduceGame(g,{type:'undo',now:2001});expect(g.chain).toEqual([ids[0]]);expect(isOpen(g,ids[1])).toBe(true);
  g=reduceGame(g,{type:'cancel',now:2002});expect(g.chain).toEqual([]);expect(g.score).toBe(0);expect(g.cards.filter(c=>isOpen(g,c.id))).toHaveLength(9);
 });
 it('rejects a changed rule and only banks chains of at least three',()=>{
  let g=start();const ids=buildBoard(1,0).solution;g=pick(pick(g,ids[0]),ids[1]);
  expect(chainValues(g)).toEqual([2,5]);expect(reduceGame(g,{type:'pang',now:2000})).toBe(g);
  const invalid=g.cards.find(c=>isOpen(g,c.id)&&c.value!==8)!;expect(pick(g,invalid.id)).toBe(g);
  g=pick(g,ids[2]);const scored=reduceGame(g,{type:'pang',now:2000});expect(scored.score).toBe(3);expect(scored.removed).toEqual(ids.slice(0,3));expect(scored.chain).toEqual([]);
 });
 it('counts a valid pending sequence at timeout once, but not a pair',()=>{
  let g=start();const ids=buildBoard(1,0).solution;
  for(const id of ids.slice(0,3))g=pick(g,id);
  const over=reduceGame(g,{type:'tick',now:61000});expect(over.phase).toBe('over');expect(over.score).toBe(3);expect(over.chain).toEqual([]);expect(reduceGame(over,{type:'pang',now:62000})).toBe(over);
  const pair=pick(pick(start(),ids[0]),ids[1]);expect(reduceGame(pair,{type:'tick',now:61000}).score).toBe(0);
 });
 it('settles timeout before late taps can add cards',()=>{const g=start(),id=buildBoard(1,0).solution[0];const next=reduceGame(g,{type:'pick',id,now:61000});expect(next.phase).toBe('over');expect(next.score).toBe(0);expect(next.chain).toEqual([])});
 it('refresh costs three seconds, banks valid pending cards, and does not extend time',()=>{
  let g=start();for(const id of buildBoard(1,0).solution.slice(0,3))g=pick(g,id);
  const n=reduceGame(g,{type:'refresh',now:2000});expect(n.deadline).toBe(g.deadline-REFRESH_COST_MS);expect(n.score).toBe(3);expect(n.round).toBe(2);expect(n.chain).toEqual([]);
  expect(reduceGame(start(),{type:'refresh',now:60000}).phase).toBe('over');
 });
 it('uses real elapsed time, including time between ticks, and preserves immutable states',()=>{const g=start(),copy=structuredClone(g);expect(remainingMs(g,31000)).toBe(DURATION_MS-30000);pick(g,buildBoard(1,0).solution[0]);expect(g).toEqual(copy)});
});
