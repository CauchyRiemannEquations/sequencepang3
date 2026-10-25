import {describe,it,expect} from 'vitest';
import {appHarness} from './helpers/app-harness';
import stages from '../src/coconut/stages.json';
import {PROGRESS_KEY,COMPLETION_PREFIX,loadStoredProgress} from '../src/coconut/progress';
function solve(app:ReturnType<typeof appHarness>,number:number,mode:'keyboard'|'pointer'='pointer'){
 for(const move of stages[number-1].solution){for(const id of move)app.click(node=>node.props?.['data-tile']===id,mode);app.flush();}
}
const saved=(data:Map<string,string>)=>loadStoredProgress({getItem:key=>data.get(key)??null,setItem(){}},50);
describe('actual App handler regression checks (mocked DOM)',()=>{
 it('preserves progress when stale B clears 1 after A clears 1 and 2, and refreshes B on storage events',()=>{
  const data=new Map<string,string>(),a=appHarness(data),b=appHarness(data);a.start();solve(a,1);a.next();solve(a,2);b.start();solve(b,1);
  expect(saved(data).cleared).toEqual([1,2]);
  data.set(COMPLETION_PREFIX+'3','1');b.storageChanged(COMPLETION_PREFIX+'3');
  b.click(node=>node.props?.className==='exit');
  expect(b.nodes().find(node=>node.props?.className==='primary start')?.props.children.flat()).toContain('4단계 시작');
 });
 it('clears all 50 official solutions through selection and timer handlers',()=>{
  for(let n=1;n<=50;n++){
   const data=new Map([[PROGRESS_KEY,JSON.stringify({version:1,cleared:Array.from({length:n-1},(_,i)=>i+1)})]]),app=appHarness(data);
   app.start();solve(app,n);expect(saved(data).cleared).toContain(n);
   expect(app.nodes().some(node=>node.props?.className==='clear-content')).toBe(true);
  }
 });
 it('moves keyboard focus on start, match, clear and next stage',()=>{
  const app=appHarness();app.start('keyboard');expect(app.focused).toHaveLength(1);
  solve(app,1,'keyboard');expect(app.focused.at(-1)).toBe('primary');
  app.next('keyboard');expect(app.document.activeElement?.props['data-tile']).toBeTruthy();
 });
 it('never steals pointer focus during start, match or clear',()=>{
  const app=appHarness();app.start();solve(app,1);expect(app.focused).toHaveLength(0);
 });
 it('defers clear-screen keyboard focus until an open dialog closes',()=>{
  const app=appHarness();app.start('keyboard');
  const solution=stages[0].solution;
  for(const move of solution.slice(0,-1)){for(const id of move)app.click(node=>node.props?.['data-tile']===id,'keyboard');app.flush();}
  for(const id of solution.at(-1)!)app.click(node=>node.props?.['data-tile']===id,'keyboard');
  app.click(node=>node.props?.['aria-label']==='게임 방법','keyboard');const count=app.focused.length;app.flush();
  expect(app.focused).toHaveLength(count);app.closeHelp();expect(app.focused.at(-1)).toBe('primary');
 });
 it('does not steal focus when the user moves to another control during a match',()=>{
  const app=appHarness();app.start('keyboard');for(const id of stages[0].solution[0])app.click(node=>node.props?.['data-tile']===id,'keyboard');
  app.document.activeElement=app.nodes().find(node=>node.props?.className==='exit')!;
  const count=app.focused.length;app.flush();expect(app.focused).toHaveLength(count);
 });
});
