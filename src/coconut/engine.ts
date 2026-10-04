import data from './board.json';
export type Tile = {id:string;layer:number;row:number;col:number;x:number;y:number;value:number};
export const TILES:Tile[]=data.tiles;
export const SOLUTION=data.solution;
export const WIDTH=48,HEIGHT=66;
export const overlaps=(a:Tile,b:Tile)=>Math.abs(a.x-b.x)<WIDTH&&Math.abs(a.y-b.y)<HEIGHT;
export function blockedReason(tile:Tile,remaining:string[]):'above'|null {
 const active=TILES.filter(t=>remaining.includes(t.id));
 if(active.some(t=>t.layer>tile.layer&&overlaps(t,tile))) return 'above';
 return null;
}
export function classify(values:number[]):'arithmetic'|'geometric'|null{
 if(values.length!==3||new Set(values).size!==3)return null;
 const [a,b,c]=[...values].sort((a,b)=>a-b);
 return b-a===c-b?'arithmetic':b*b===a*c?'geometric':null;
}
export function legalMove(ids:string[],remaining:string[]){return ids.length===3&&new Set(ids).size===3&&ids.every(id=>remaining.includes(id)&&!blockedReason(TILES.find(t=>t.id===id)!,remaining))&&!!classify(ids.map(id=>TILES.find(t=>t.id===id)!.value));}
export function hasMove(remaining:string[]){const ids=remaining.filter(id=>!blockedReason(TILES.find(t=>t.id===id)!,remaining));for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)for(let k=j+1;k<ids.length;k++)if(legalMove([ids[i],ids[j],ids[k]],remaining))return true;return false;}
