import {describe,it,expect} from 'vitest';
import {TILES,SOLUTION,blockedReason,classify,legalMove,hasMove} from './engine';
describe('coconut mahjong',()=>{
 it('contains 24 unique tiles on precisely two layers',()=>{expect(TILES).toHaveLength(24);expect(new Set(TILES.map(t=>t.id)).size).toBe(24);expect([...new Set(TILES.map(t=>t.layer))]).toEqual([0,1]);expect(TILES.every(t=>t.value>=1&&t.value<=9)).toBe(true)});
 it.each([[[1,3,5],'arithmetic'],[[2,4,8],'geometric'],[[8,2,4],'geometric'],[[2,4,7],null],[[2,2,2],null],[[1,1,2],null]])('classifies %j',(values,expected)=>expect(classify(values as number[])).toBe(expected));
 it('completes the fixed board with 8 simultaneous valid removals',()=>{let remaining=TILES.map(t=>t.id);for(const move of SOLUTION){expect(legalMove(move,remaining)).toBe(true);remaining=remaining.filter(id=>!move.includes(id))}expect(remaining).toEqual([])});
 it('does not allow a blocked upper middle tile or covered lower tile',()=>{const ids=TILES.map(t=>t.id);expect(blockedReason(TILES.find(t=>t.id==='U12')!,ids)).toBe('sides');expect(blockedReason(TILES.find(t=>t.id==='L12')!,ids)).toBe('above')});
 it('unlocks side neighbors only when tiles are removed',()=>{const ids=TILES.map(t=>t.id);expect(blockedReason(TILES.find(t=>t.id==='U12')!,ids)).toBe('sides');expect(blockedReason(TILES.find(t=>t.id==='U12')!,ids.filter(id=>id!=='U11'))).toBe(null)});
 it('duplicate two choices have different consequences',()=>{const ids=TILES.map(t=>t.id);const a=ids.filter(id=>!['U11','L21','L26'].includes(id));const b=ids.filter(id=>!['L11','L21','L26'].includes(id));expect(legalMove(['U11','L21','L26'],ids)).toBe(true);expect(legalMove(['L11','L21','L26'],ids)).toBe(true);expect(blockedReason(TILES.find(t=>t.id==='U12')!,a)).toBe(null);expect(blockedReason(TILES.find(t=>t.id==='U12')!,b)).toBe('sides')});
 it('initial board has moves and empty board does not',()=>{expect(hasMove(TILES.map(t=>t.id))).toBe(true);expect(hasMove([])).toBe(false)});
});
