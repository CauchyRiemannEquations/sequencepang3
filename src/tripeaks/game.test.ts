import {describe,it,expect} from 'vitest';
import {newGame,reduceGame,findTriple,ensurePlayable,canPick,values,type Game} from './game';
const start=(layout=0)=>reduceGame(newGame(layout),{type:'start'});
function collect(g:Game){for(const id of findTriple(g.cards)!)g=reduceGame(g,{type:'pick',id});return reduceGame(g,{type:'pang'});}
describe('untimed open nine-card game',()=>{
 it('starts with all nine cards exposed and a playable triple',()=>{const g=start();expect(g.cards).toHaveLength(9);expect(new Set(g.cards.map(c=>c.id)).size).toBe(9);expect(findTriple(g.cards)).not.toBeNull();expect(g.phase).toBe('playing');expect('deadline' in g).toBe(false)});
 it.each([0,1,2])('keeps layout %i solvable through 200 collections without raising difficulty',layout=>{
  let g=start(layout);
  for(let i=0;i<200;i++){
   if(g.phase==='goal')g=reduceGame(g,{type:'continue'});
   const old=structuredClone(g);g=collect(g);
   expect(g.cards).toHaveLength(9);expect(new Set(g.cards.map(c=>c.id)).size).toBe(9);expect(g.cards.every(c=>c.value>=1&&c.value<=12)).toBe(true);expect(findTriple(g.cards)).not.toBeNull();expect(g.score).toBe((i+1)*3);expect(old.cards).toHaveLength(9);
  }
 });
 it('repairs a completely impossible board by changing only three slots',()=>{
  const cards=Array.from({length:9},(_,i)=>({id:i+1,value:5}));expect(findTriple(cards)).toBeNull();
  const fixed=ensurePlayable(cards,7,10);expect(fixed.repaired).toBe(true);expect(findTriple(fixed.cards)).not.toBeNull();expect(fixed.cards.filter((c,i)=>c!==cards[i])).toHaveLength(3);expect(cards.every(c=>c.value===5)).toBe(true);
 });
 it('does not alter an already playable board',()=>{const g=start();const fixed=ensurePlayable(g.cards,g.seed,g.nextId);expect(fixed.cards).toBe(g.cards);expect(fixed.repaired).toBe(false)});
 it('keeps selected cards on the board and restores selection freely',()=>{
  let g=start();const ids=findTriple(g.cards)!;const cards=g.cards;
  for(const id of ids)g=reduceGame(g,{type:'pick',id});expect(g.cards).toBe(cards);expect(values(g)).toHaveLength(3);
  g=reduceGame(g,{type:'undo'});expect(g.selected).toHaveLength(2);g=reduceGame(g,{type:'pick',id:ids[0]});expect(g.selected).toEqual([]);expect(g.score).toBe(0);
 });
 it('rejects mismatched cards and prevents scoring pairs or duplicate identities',()=>{
  let g=start();const ids=findTriple(g.cards)!;
  for(const id of ids.slice(0,2))g=reduceGame(g,{type:'pick',id});expect(reduceGame(g,{type:'pang'})).toBe(g);
  const invalid=g.cards.find(c=>!g.selected.includes(c.id)&&!canPick(g,c.id));if(invalid)expect(reduceGame(g,{type:'pick',id:invalid.id})).toBe(g);
  expect(canPick(g,ids[0])).toBe(false);
 });
 it('reaches a positive goal without failure and continues with the same board and score',()=>{
  let g=start();for(let i=0;i<10;i++)g=collect(g);expect(g.score).toBe(30);expect(g.phase).toBe('goal');
  const next=reduceGame(g,{type:'continue'});expect(next.phase).toBe('playing');expect(next.goal).toBe(60);expect(next.score).toBe(30);expect(next.cards).toBe(g.cards);
 });
 it('replenishes only collected slots when a repair is unnecessary',()=>{
  let g=start();const ids=findTriple(g.cards)!;const before=g.cards;
  for(const id of ids)g=reduceGame(g,{type:'pick',id});const next=reduceGame(g,{type:'pang'});
  expect(next.selected).toEqual([]);expect(next.score).toBe(3);
  if(!next.repaired)before.forEach((c,i)=>{if(!ids.includes(c.id))expect(next.cards[i]).toBe(c)});
 });
 it('replays a seed deterministically and does not mutate source state',()=>{const a=start(),b=start();expect(a).toEqual(b);const copy=structuredClone(a);collect(a);expect(a).toEqual(copy)});
});
