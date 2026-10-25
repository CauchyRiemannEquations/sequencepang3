import {describe,it,expect,vi} from 'vitest';
import {focusDestination,shouldRestoreMatchFocus} from '../src/coconut/focus';
const tile=(id:string)=>({getAttribute:(key:string)=>key==='data-tile'?id:null}) as Element;
describe('keyboard transition focus policy',()=>{
 it('repairs only the removed keyboard tile, not pointer or moved focus',()=>{
  expect(shouldRestoreMatchFocus(true,tile('third'),['first','second','third'])).toBe(true);
  expect(shouldRestoreMatchFocus(false,tile('third'),['third'])).toBe(false);
  expect(shouldRestoreMatchFocus(true,tile('other'),['third'])).toBe(false);
  expect(shouldRestoreMatchFocus(true,null,['third'])).toBe(false);
 });
 it.each(['game','clear','stages','main'])('sets an intentional %s destination without scrolling',screen=>{
  const focus=vi.fn(),querySelector=vi.fn((selector:string)=>selector==='dialog[open]'?null:{focus});
  focusDestination({querySelector} as unknown as HTMLElement,screen);
  expect(focus).toHaveBeenCalledWith({preventScroll:true});
  const selector=querySelector.mock.calls[1][0];
  expect(selector).toContain({game:'.tile.available',clear:'.clear-content .primary',stages:'.chapter:not([inert])',main:'.home-content .start'}[screen]);
 });
 it.each([true,false])('prefers the current stage before falling back (current visible: %s)',visible=>{
  const current=vi.fn(),fallback=vi.fn();
  const querySelector=vi.fn((selector:string)=>selector==='dialog[open]'?null:selector.includes('.current')?(visible?{focus:current}:null):{focus:fallback});
  focusDestination({querySelector} as unknown as HTMLElement,'stages');
  expect(current).toHaveBeenCalledTimes(visible?1:0);expect(fallback).toHaveBeenCalledTimes(visible?0:1);
 });
 it('never moves focus out of an open dialog',()=>{
  const querySelector=vi.fn(()=>({}));focusDestination({querySelector} as unknown as HTMLElement,'clear');
  expect(querySelector).toHaveBeenCalledTimes(1);
 });
});
