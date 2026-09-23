export type Card = { id: string; value: number; linked: boolean };
export type Location = { kind: 'pile' | 'cell'; index: number };
export type Rule = { kind: 'arithmetic' | 'geometric'; step: number };
export type Collection = { cards: Card[]; rule: Rule };
export type Game = { piles: Card[][]; cells: (Card | null)[]; collected: Collection[]; moves: number; deal: number };
export const RUN_LENGTH = 5;
export const TOTAL_RUNS = 8;
export const POOL_VERSION = 'pool16-v1';
// Six arithmetic runs and two geometric runs form one witness partition.
// These are not assigned targets: players can collect any valid five-card run.
const GROUPS = [[11,12,13,14,15], [1,3,5,7,9], [2,3,4,5,6], [4,6,8,10,12], [12,13,14,15,16], [7,8,9,10,11], [1,2,4,8,16], [1,2,4,8,16]];
export const POOL = Array.from({length:16},(_,i)=>({value:i+1,count:GROUPS.flat().filter(v=>v===i+1).length}));
export const TOTAL_CARDS = GROUPS.flat().length;
const ROUTES = [
  [1,0,2,3,0, 2,1,3,0,1, 0,3,1,2,2, 3,1,0,2,3],
  [0,2,1,3,2, 1,3,0,1,0, 3,2,0,1,3, 2,0,3,2,1],
  [3,1,0,2,1, 0,2,3,0,2, 1,3,2,0,1, 2,0,1,3,3],
].map(route=>[...route,...route]);
const PARKED = [34,39];
// Every layout uses the exact same multiset. Route + witness stay deterministic.
export function createGame(deal = 0): Game {
  const index=((Math.trunc(deal)%ROUTES.length)+ROUTES.length)%ROUTES.length;
  const piles: Card[][] = Array.from({length: 5}, () => []);
  const cards = GROUPS.flatMap((values,g) => values.map((value,i) => ({id: `${g}-${i}`, value, linked: false})));
  const route = ROUTES[index];
  for (let i = cards.length - 1; i >= 0; i--) {
    if (PARKED.includes(i)) continue;
    piles[route[i]].push(cards[i]);
  }
  piles[route[0]].push(cards[PARKED[0]]);
  piles[route[1]].push(cards[PARKED[1]]);
  return {piles, cells:[null,null], collected:[], moves:0, deal:index};
}
export function topCard(game: Game, at: Location): Card | undefined {
  return at.kind === 'pile' ? game.piles[at.index]?.at(-1) : game.cells[at.index] ?? undefined;
}
export function runCards(pile: Card[]): Card[] {
  if (!pile.length) return [];
  let start = pile.length - 1;
  while (start > 0 && pile[start].linked) start--;
  return pile.slice(start);
}
export function rulesFor(values: number[]): Rule[] {
  if (values.length < 2) return [];
  const d = values[1] - values[0], r = values[1] / values[0];
  const rules: Rule[] = [];
  if (d !== 0 && values.every((v,i) => i === 0 || v - values[i-1] === d)) rules.push({kind:'arithmetic',step:d});
  if ([2,3,0.5,1/3].includes(r) && values.every((v,i) => i === 0 || Math.abs(v - values[i-1]*r) < 1e-9)) rules.push({kind:'geometric',step:r});
  return rules;
}
export function ruleLabel(rule: Rule): string {
  return rule.kind === 'arithmetic' ? `${rule.step > 0 ? '+' : '−'}${Math.abs(rule.step)}` : rule.step < 1 ? `÷${Math.round(1/rule.step)}` : `×${rule.step}`;
}
export function sameLocation(a: Location | null, b: Location): boolean {return a?.kind === b.kind && a.index === b.index;}
export function canMove(game: Game, from: Location, to: Location): boolean {
  if (sameLocation(from,to) || game.collected.length === TOTAL_RUNS) return false;
  const card = topCard(game,from);
  if (!card) return false;
  if (to.kind === 'cell') return to.index >= 0 && to.index < game.cells.length && !game.cells[to.index];
  const pile = game.piles[to.index];
  if (!pile) return false;
  return !pile.length || rulesFor([...runCards(pile).map(c=>c.value),card.value]).length > 0;
}
export function moveCard(game: Game, from: Location, to: Location): Game | null {
  if (!canMove(game,from,to)) return null;
  const next: Game = {...game, piles: game.piles.map(p=>[...p]), cells:[...game.cells], collected:[...game.collected], moves:game.moves+1};
  const card = {...topCard(game,from)!};
  if (from.kind === 'pile') next.piles[from.index].pop(); else next.cells[from.index] = null;
  if (to.kind === 'cell') {card.linked=false; next.cells[to.index]=card;}
  else {
    const pile = next.piles[to.index];
    card.linked = pile.length > 0;
    pile.push(card);
    const run = runCards(pile);
    if (run.length === RUN_LENGTH) {
      next.collected.push({cards:run,rule:rulesFor(run.map(c=>c.value))[0]});
      pile.splice(pile.length-RUN_LENGTH,RUN_LENGTH);
    }
  }
  return next;
}
export function availableMoves(game: Game): {from: Location; to: Location}[] {
  const locations: Location[] = [...game.piles.map((_,index)=>({kind:'pile' as const,index})),...game.cells.map((_,index)=>({kind:'cell' as const,index}))];
  return locations.flatMap(from=>locations.filter(to=>canMove(game,from,to)).map(to=>({from,to})));
}
// Used by tests to prove each authored deal is finishable through the real rules.
export function solutionFor(deal: number): {from: Location; to: Location}[] {
  const route = ROUTES[deal % ROUTES.length];
  const moves: {from:Location;to:Location}[] = [
    {from:{kind:'pile',index:route[0]},to:{kind:'cell',index:0}},
    {from:{kind:'pile',index:route[1]},to:{kind:'cell',index:1}},
  ];
  for (let i=0;i<TOTAL_CARDS;i++) moves.push({from:PARKED.includes(i)?{kind:'cell',index:PARKED.indexOf(i)}:{kind:'pile',index:route[i]},to:{kind:'pile',index:4}});
  return moves;
}

// A mathematical dead end can exist even when single-card moves remain.
// Exact cover ignores pile access; false proves impossibility, true is not a hint.
export function canPartition(values: number[]): boolean {
  if (values.length % RUN_LENGTH !== 0) return false;
  if (!values.length) return true;
  const distinct=[...new Set(values)].sort((a,b)=>a-b);
  const patterns:number[][]=[];
  for (const a of distinct) {
    for (let d=1; a+4*d<=distinct.at(-1)!;d++) {
      const run=Array.from({length:5},(_,i)=>a+i*d);
      if(run.every(v=>distinct.includes(v)))patterns.push(run);
    }
    for(const r of [2,3]) {
      const run=Array.from({length:5},(_,i)=>a*r**i);
      if(run.every(v=>distinct.includes(v)))patterns.push(run);
    }
  }
  const vectors=patterns.map(p=>distinct.map(v=>p.includes(v)?1:0));
  const memo=new Map<string,boolean>();
  function solve(counts:number[]):boolean {
    if(counts.every(c=>c===0))return true;
    const key=counts.join(',');const cached=memo.get(key);if(cached!==undefined)return cached;
    const usable=vectors.filter(p=>p.every((n,i)=>n<=counts[i]));
    const options=counts.flatMap((c,i)=>c?[usable.filter(p=>p[i]>0)]:[]).sort((a,b)=>a.length-b.length)[0];
    const possible=options.some(p=>solve(counts.map((c,i)=>c-p[i])));
    memo.set(key,possible);return possible;
  }
  return solve(distinct.map(v=>values.filter(n=>n===v).length));
}
export function canFinishRemaining(game:Game):boolean {
  return canPartition([...game.piles.flat(),...game.cells.filter((c):c is Card=>!!c)].map(c=>c.value));
}
