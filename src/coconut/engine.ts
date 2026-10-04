import data from './board.json';
export type Tile = {id:string;layer:number;row:number;col:number;x:number;y:number;value:number};
export const TILES:Tile[]=data.tiles;
export const SOLUTION=data.solution;
export const WIDTH=48,HEIGHT=66;
export const overlaps=(a:Tile,b:Tile)=>Math.abs(a.x-b.x)<WIDTH&&Math.abs(a.y-b.y)<HEIGHT;
export function blockedReason(tile:Tile,remaining:string[],tiles:Tile[]=TILES):'above'|null {
 const active=tiles.filter(t=>remaining.includes(t.id));
 if(active.some(t=>t.layer>tile.layer&&overlaps(t,tile))) return 'above';
 return null;
}
export function classify(values:number[]):'arithmetic'|'geometric'|null{
 if(values.length!==3||new Set(values).size!==3)return null;
 const [a,b,c]=[...values].sort((a,b)=>a-b);
 return b-a===c-b?'arithmetic':b*b===a*c?'geometric':null;
}
export function legalMove(ids:string[],remaining:string[],tiles:Tile[]=TILES){
 if(ids.length!==3||new Set(ids).size!==3)return false;
 const chosen=ids.map(id=>tiles.find(t=>t.id===id));
 return chosen.every(t=>t&&remaining.includes(t.id)&&!blockedReason(t,remaining,tiles))&&!!classify(chosen.map(t=>t!.value));
}
export function availableMoves(remaining:string[],tiles:Tile[]=TILES):string[][]{
 const exposed=tiles.filter(t=>remaining.includes(t.id)&&!blockedReason(t,remaining,tiles));
 const moves:string[][]=[];
 for(let i=0;i<exposed.length;i++)for(let j=i+1;j<exposed.length;j++)for(let k=j+1;k<exposed.length;k++){
  const group=[exposed[i],exposed[j],exposed[k]];
  if(classify(group.map(t=>t.value)))moves.push(group.map(t=>t.id));
 }
 return moves;
}
export function hasMove(remaining:string[],tiles:Tile[]=TILES){return availableMoves(remaining,tiles).length>0;}
