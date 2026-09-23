import { rulesFor } from '../game/solitaire';
export const DURATION_MS = 60_000;
export const REFRESH_COST_MS = 3_000;
export const VALUES = [2,5,8, 3,6,9, 1,2,4, 4,7,10, 12,9,6, 2,4,8];
export type PeakCard = {id:number;value:number;peak:number;row:number;x:number;covers:number[]};
export type Game = {phase:'ready'|'playing'|'over';layout:number;round:number;cards:PeakCard[];removed:number[];chain:number[];score:number;longest:number;pangs:number;refreshes:number;deadline:number};
export type Action = {type:'start'|'pick'|'undo'|'cancel'|'pang'|'refresh'|'tick';now:number;id?:number};
function geometry():PeakCard[] {
  return Array.from({length:3},(_,peak)=>[
    {row:0,x:1,covers:[1,2]}, {row:1,x:.5,covers:[3,4]}, {row:1,x:1.5,covers:[4,5]},
    {row:2,x:0,covers:[]}, {row:2,x:1,covers:[]}, {row:2,x:2,covers:[]},
  ].map((c,i)=>({...c,peak,id:peak*6+i,value:0,covers:c.covers.map(n=>peak*6+n)}))).flat();
}
export function buildBoard(round:number,layout:number):{cards:PeakCard[];solution:number[]} {
  const cards=geometry(),taken=new Set<number>(),solution:number[]=[];
  let seed=(0x531a+round*101+layout*7919)>>>0;
  for(let i=0;i<cards.length;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const available=cards.filter(c=>!taken.has(c.id)&&c.covers.every(n=>taken.has(n)));
    const chosen=available[seed%available.length];
    chosen.value=VALUES[i];taken.add(chosen.id);solution.push(chosen.id);
  }
  return {cards,solution};
}
export function newGame(layout=0):Game {
  return {phase:'ready',layout:((layout%3)+3)%3,round:1,cards:[],removed:[],chain:[],score:0,longest:0,pangs:0,refreshes:0,deadline:0};
}
export function remainingMs(g:Game,now:number):number {return g.phase==='ready'?DURATION_MS:g.phase==='over'?0:Math.max(0,g.deadline-now);}
export function isOpen(g:Game,id:number):boolean {
  const card=g.cards.find(c=>c.id===id);const taken=new Set([...g.removed,...g.chain]);
  return !!card&&!taken.has(id)&&card.covers.every(n=>taken.has(n));
}
export function chainValues(g:Game):number[] {return g.chain.map(id=>g.cards.find(c=>c.id===id)!.value);}
export function canPick(g:Game,id:number):boolean {
  if(g.phase!=='playing'||!isOpen(g,id))return false;
  const values=[...chainValues(g),g.cards.find(c=>c.id===id)!.value];
  return values.length===1||rulesFor(values).length>0;
}
function bank(g:Game):Game {
  return {...g,removed:[...g.removed,...g.chain],score:g.score+g.chain.length,longest:Math.max(g.longest,g.chain.length),pangs:g.pangs+1,chain:[]};
}
function expire(g:Game):Game {
  const settled=g.chain.length>=3?bank(g):{...g,chain:[]};
  return {...settled,phase:'over'};
}
export function reduceGame(g:Game,a:Action):Game {
  if(a.type==='start')return g.phase==='ready'?{...g,phase:'playing',deadline:a.now+DURATION_MS,cards:buildBoard(1,g.layout).cards}:g;
  if(g.phase!=='playing')return g;
  if(a.now>=g.deadline)return expire(g);
  switch(a.type) {
    case 'pick':return a.id!==undefined&&canPick(g,a.id)?{...g,chain:[...g.chain,a.id]}:g;
    case 'undo':return g.chain.length?{...g,chain:g.chain.slice(0,-1)}:g;
    case 'cancel':return g.chain.length?{...g,chain:[]}:g;
    case 'pang':{
      if(g.chain.length<3)return g;
      const next=bank(g);
      return next.removed.length===next.cards.length?{...next,round:next.round+1,cards:buildBoard(next.round+1,next.layout).cards,removed:[]}:next;
    }
    case 'refresh':{
      const next={...g,deadline:g.deadline-REFRESH_COST_MS,refreshes:g.refreshes+1};
      // A refresh never throws away a pending valid sequence: bank it first.
      const settled=next.chain.length>=3?bank(next):{...next,chain:[]};
      if(a.now>=next.deadline)return {...settled,phase:'over'};
      return {...settled,round:g.round+1,cards:buildBoard(g.round+1,g.layout).cards,removed:[]};
    }
    default:return g;
  }
}
export function hasOpening(g:Game):boolean {
  const search=(current:Game):boolean=>current.chain.length>=3||current.cards.some(c=>canPick(current,c.id)&&search({...current,chain:[...current.chain,c.id]}));
  return g.phase==='playing'&&search({...g,chain:[]});
}
