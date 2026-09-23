import {rulesFor} from '../game/solitaire';
export const BOARD_SIZE=9;
export const GOAL_STEP=30;
export type Card={id:number;value:number};
export type Game={phase:'ready'|'playing'|'goal';layout:number;cards:Card[];selected:number[];score:number;goal:number;pangs:number;longest:number;seed:number;nextId:number;repairs:number;repaired:boolean};
export type Action={type:'start'|'pick'|'undo'|'cancel'|'pang'|'continue';id?:number};
function random(seed:number):[number,number]{const next=(Math.imul(seed,1664525)+1013904223)>>>0;return [next,next/4294967296];}
export function values(g:Game):number[]{return g.selected.map(id=>g.cards.find(c=>c.id===id)!.value);}
export function findTriple(cards:Card[]):number[]|null {
 for(const a of cards)for(const b of cards)if(a.id!==b.id&&a.value!==b.value)for(const c of cards)
  if(c.id!==a.id&&c.id!==b.id&&rulesFor([a.value,b.value,c.value]).length)return [a.id,b.id,c.id];
 return null;
}
export function ensurePlayable(cards:Card[],seed:number,nextId:number):{cards:Card[];seed:number;nextId:number;repaired:boolean}{
 if(findTriple(cards))return {cards,seed,nextId,repaired:false};
 const slots=cards.map((_,i)=>i);
 for(let i=slots.length-1;i>0;i--){let r;[seed,r]=random(seed);const j=Math.floor(r*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
 const triples=[[1,2,4],[2,4,8],[3,6,12],[12,9,6],[1,4,7],[4,7,10],[2,5,8],[4,6,8]];
 let r;[seed,r]=random(seed);const triple=triples[Math.floor(r*triples.length)];
 const next=[...cards];slots.slice(0,3).forEach((slot,i)=>{next[slot]={id:nextId++,value:triple[i]}});
 return {cards:next,seed,nextId,repaired:true};
}
function fill(g:Game,slots:number[]):Game {
 let seed=g.seed,nextId=g.nextId;const cards=[...g.cards];
 for(const slot of slots){let r;[seed,r]=random(seed);cards[slot]={id:nextId++,value:1+Math.floor(r*12)};}
 const result=ensurePlayable(cards,seed,nextId);
 return {...g,...result,repairs:g.repairs+(result.repaired?1:0)};
}
export function newGame(layout=0):Game {
 const index=((layout%3)+3)%3;
 return {phase:'ready',layout:index,cards:[],selected:[],score:0,goal:GOAL_STEP,pangs:0,longest:0,seed:(20260923+index*8191)>>>0,nextId:1,repairs:0,repaired:false};
}
export function canPick(g:Game,id:number):boolean {
 const card=g.cards.find(c=>c.id===id);
 if(g.phase!=='playing'||!card||g.selected.includes(id))return false;
 return !g.selected.length||rulesFor([...values(g),card.value]).length>0;
}
export function reduceGame(g:Game,a:Action):Game {
 if(a.type==='start')return g.phase==='ready'?fill({...g,phase:'playing'},Array.from({length:BOARD_SIZE},(_,i)=>i)):g;
 if(a.type==='continue')return g.phase==='goal'?{...g,phase:'playing',goal:g.goal+GOAL_STEP,repaired:false}:g;
 if(g.phase!=='playing')return g;
 switch(a.type){
  case 'pick':{
   const position=g.selected.indexOf(a.id!);
   if(position>=0)return {...g,selected:g.selected.slice(0,position),repaired:false};
   return a.id!==undefined&&canPick(g,a.id)?{...g,selected:[...g.selected,a.id],repaired:false}:g;
  }
  case 'undo':return {...g,selected:g.selected.slice(0,-1),repaired:false};
  case 'cancel':return {...g,selected:[],repaired:false};
  case 'pang':{
   if(g.selected.length<3)return g;
   const score=g.score+g.selected.length;
   const next=fill({...g,score,pangs:g.pangs+1,longest:Math.max(g.longest,g.selected.length)},g.cards.flatMap((c,i)=>g.selected.includes(c.id)?[i]:[]));
   return {...next,selected:[],phase:score>=g.goal?'goal':'playing'};
  }
  default:return g;
 }
}
