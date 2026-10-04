import data from './stages.json';
import {WIDTH,HEIGHT,type Tile} from './engine';

export type Stage={
 id:number;name:string;lesson:string;focus:string;tiles:Tile[];solution:string[][];
 validation:{initialMoves:number;allChoicesSolvable:boolean|null;verifiedStates:number};
};
export const STAGES:Stage[]=data;
export function boardBounds(tiles:Tile[]){
 const minX=Math.min(...tiles.map(t=>t.x)),minY=Math.min(...tiles.map(t=>t.y));
 return {minX,minY,width:Math.max(...tiles.map(t=>t.x))+WIDTH-minX,
  height:Math.max(...tiles.map(t=>t.y))+HEIGHT-minY};
}
