import {describe,it,expect} from 'vitest';
import {TILES,SOLUTION,blockedReason,classify,legalMove,hasMove} from './engine';
describe('coconut mahjong',()=>{
 it('contains 24 unique tiles on precisely two layers',()=>{expect(TILES).toHaveLength(24);expect(new Set(TILES.map(t=>t.id)).size).toBe(24);expect([...new Set(TILES.map(t=>t.layer))]).toEqual([0,1]);expect(TILES.every(t=>t.value>=1&&t.value<=9)).toBe(true)});
 it.each([[[1,3,5],'arithmetic'],[[2,4,8],'geometric'],[[8,2,4],'geometric'],[[2,4,7],null],[[2,2,2],null],[[1,1,2],null]])('classifies %j',(values,expected)=>expect(classify(values as number[])).toBe(expected));
 it('completes the fixed board with 8 simultaneous valid removals',()=>{let remaining=TILES.map(t=>t.id);for(const move of SOLUTION){expect(legalMove(move,remaining)).toBe(true);remaining=remaining.filter(id=>!move.includes(id))}expect(remaining).toEqual([])});
 it('allows uncovered middle tiles regardless of side neighbors',()=>{const ids=TILES.map(t=>t.id);for(const id of ['U12','U22','L32','L33'])expect(blockedReason(TILES.find(t=>t.id===id)!,ids)).toBe(null);expect(blockedReason(TILES.find(t=>t.id==='L12')!,ids)).toBe('above')});
 it('only removal of an upper overlapping tile unlocks the lower tile',()=>{const ids=TILES.map(t=>t.id);expect(blockedReason(TILES.find(t=>t.id==='L12')!,ids)).toBe('above');expect(blockedReason(TILES.find(t=>t.id==='L12')!,ids.filter(id=>id!=='L11'))).toBe('above');expect(blockedReason(TILES.find(t=>t.id==='L12')!,ids.filter(id=>id!=='U11'))).toBe(null)});
 it('duplicate two choices expose different lower tiles',()=>{const ids=TILES.map(t=>t.id);const a=ids.filter(id=>!['U11','L21','L26'].includes(id));const b=ids.filter(id=>!['L11','L21','L26'].includes(id));expect(legalMove(['U11','L21','L26'],ids)).toBe(true);expect(legalMove(['L11','L21','L26'],ids)).toBe(true);expect(blockedReason(TILES.find(t=>t.id==='L12')!,a)).toBe(null);expect(blockedReason(TILES.find(t=>t.id==='L12')!,b)).toBe('above')});
 it('initial board has moves and empty board does not',()=>{expect(hasMove(TILES.map(t=>t.id))).toBe(true);expect(hasMove([])).toBe(false)});
});
