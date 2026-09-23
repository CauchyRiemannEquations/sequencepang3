import {describe,it,expect,vi,afterEach} from 'vitest';
import {newRace,startRace,elapsedMs,finishRace,formatTime,readBest,saveBest} from './race';
afterEach(()=>vi.unstubAllGlobals());
describe('elapsed-time race',()=>{
 it('starts only explicitly, counts all time between start and finish, and freezes at completion',()=>{
   const ready=newRace();expect(elapsedMs(ready,9000)).toBe(0);
   const running=startRace(ready,1000);expect(startRace(running,5000)).toBe(running);
   expect(elapsedMs(running,11111)).toBe(10111);
   const finished=finishRace(running,12345);expect(elapsedMs(finished,90000)).toBe(11345);
   expect(finishRace(finished,95000)).toBe(finished);
 });
 it('does not lose elapsed time to throttled ticks or reset on undo',()=>{
   const race=startRace(newRace(),1000);
   expect(elapsedMs(race,301000)).toBe(300000);
   // Undo changes only Game, never Race.
   expect(elapsedMs(race,305000)).toBe(304000);
   expect(newRace().phase).toBe('ready');
 });
 it('formats minutes, seconds and tenths without a one-minute rollover',()=>{
   expect(formatTime(0)).toBe('00:00.0');expect(formatTime(61234)).toBe('01:01.2');expect(formatTime(6000000)).toBe('100:00.0');
 });
 it('stores separate records and keeps only the fastest time',()=>{
   const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});
   expect(saveBest('pool:A',30000)).toBe(30000);expect(saveBest('pool:A',40000)).toBe(30000);expect(saveBest('pool:A',20000)).toBe(20000);
   expect(readBest('pool:B')).toBeNull();data.set('pool:B','corrupt');expect(readBest('pool:B')).toBeNull();data.set('pool:B','-1');expect(readBest('pool:B')).toBeNull();
 });
 it('works without storage access',()=>{
   vi.stubGlobal('localStorage',{getItem:()=>{throw Error()},setItem:()=>{throw Error()}});
   expect(readBest('a')).toBeNull();expect(saveBest('a',12000)).toBe(12000);
 });
});
