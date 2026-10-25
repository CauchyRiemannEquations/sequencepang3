import {describe,it,expect} from 'vitest';
import {PROGRESS_KEY,COMPLETION_PREFIX,loadStoredProgress,saveCompletion,mergeProgress,isProgressKey} from '../src/coconut/progress';
function store(){const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};}
describe('monotonic cross-tab progress',()=>{
 it('never lets a stale tab erase a newer completion',()=>{
  const storage=store(),a=loadStoredProgress(storage,50),b=loadStoredProgress(storage,50);
  const advanced=saveCompletion(storage,saveCompletion(storage,a,1,50),2,50);
  expect(saveCompletion(storage,b,1,50)).toEqual(advanced);
  expect(loadStoredProgress(storage,50).cleared).toEqual([1,2]);
 });
 it('preserves two writes even if both contexts read before either write',()=>{
  const storage=store(),pending:Array<[string,string]>=[];
  const racing={getItem:storage.getItem,setItem:(k:string,v:string)=>{pending.push([k,v]);}};
  const empty=loadStoredProgress(racing,50);
  saveCompletion(racing,empty,2,50);saveCompletion(racing,empty,3,50);
  for(const [k,v] of pending.reverse())storage.setItem(k,v);
  expect(loadStoredProgress(storage,50).cleared).toEqual([2,3]);
 });
 it('reads the old snapshot, migrates known records, and leaves the snapshot untouched',()=>{
  const storage=store(),legacy=JSON.stringify({version:1,cleared:[1,2]});storage.setItem(PROGRESS_KEY,legacy);
  saveCompletion(storage,loadStoredProgress(storage,50),3,50);
  expect(storage.getItem(PROGRESS_KEY)).toBe(legacy);
  storage.setItem(PROGRESS_KEY,JSON.stringify({version:1,cleared:[1]}));
  expect(loadStoredProgress(storage,50).cleared).toEqual([1,2,3]);
 });
 it('sanitizes legacy and journal values',()=>{
  const storage=store();storage.setItem(PROGRESS_KEY,JSON.stringify({version:1,cleared:[-1,1,1,2.2,51,'3']}));
  storage.setItem(COMPLETION_PREFIX+'2','1');storage.setItem(COMPLETION_PREFIX+'3','true');storage.setItem(COMPLETION_PREFIX+'51','1');
  expect(loadStoredProgress(storage,50).cleared).toEqual([1,2]);
 });
 it('keeps playing with unavailable storage or quota errors',()=>{
  const denied={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};
  expect(loadStoredProgress(denied,50).cleared).toEqual([]);
  expect(saveCompletion(denied,{version:1,cleared:[1]},2,50).cleared).toEqual([1,2]);
  expect(saveCompletion(undefined,{version:1,cleared:[]},1,50).cleared).toEqual([1]);
 });
 it('merges storage notifications without dropping local-only completions',()=>{
  expect(mergeProgress({version:1,cleared:[3,1]},{version:1,cleared:[2,1]}).cleared).toEqual([1,2,3]);
  expect(isProgressKey(PROGRESS_KEY)).toBe(true);expect(isProgressKey(COMPLETION_PREFIX+'2')).toBe(true);
  expect(isProgressKey(null)).toBe(true);expect(isProgressKey('audio')).toBe(false);
 });
 it('rejects invalid completion IDs',()=>{
  const storage=store();saveCompletion(storage,{version:1,cleared:[]},51,50);
  expect(storage.data.size).toBe(0);
 });
});
