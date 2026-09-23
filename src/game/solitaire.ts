export type Card = { id: string; value: number; linked: boolean };
export type Location = { kind: 'pile' | 'cell'; index: number };
export type Rule = { kind: 'arithmetic' | 'geometric'; step: number };
export type Collection = { cards: Card[]; rule: Rule };
export type Game = { piles: Card[][]; cells: (Card | null)[]; collected: Collection[]; moves: number; deal: number };
export const RUN_LENGTH = 5;
export const TOTAL_RUNS = 4;
const GROUPS = [[1,3,5,7,9], [2,5,8,11,14], [1,2,4,8,16], [3,6,12,24,48]];
const ROUTES = [
  [1,0,2,3,0, 2,1,3,0,1, 0,3,1,2,2, 3,1,0,2,3],
  [0,2,1,3,2, 1,3,0,1,0, 3,2,0,1,3, 2,0,3,2,1],
  [3,1,0,2,1, 0,2,3,0,2, 1,3,2,0,1, 2,0,1,3,3],
];
// A reproducible deal, with a witness solution. The last two cards are parked
// over the opening and must be freed before building their eventual sequences.
export function createGame(deal = 0): Game {
  const piles: Card[][] = Array.from({length: 5}, () => []);
  const cards = GROUPS.flatMap((values,g) => values.map((value,i) => ({id: `${g}-${i}`, value, linked: false})));
  const route = ROUTES[deal % ROUTES.length];
  for (let i = cards.length - 1; i >= 0; i--) {
    if (i === 9 || i === 14) continue;
    piles[route[i]].push(cards[i]);
  }
  piles[route[0]].push(cards[9]);
  piles[route[1]].push(cards[14]);
  return {piles, cells:[null,null], collected:[], moves:0, deal: deal % ROUTES.length};
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
  for (let i=0;i<20;i++) moves.push({from:i===9?{kind:'cell',index:0}:i===14?{kind:'cell',index:1}:{kind:'pile',index:route[i]},to:{kind:'pile',index:4}});
  return moves;
}
