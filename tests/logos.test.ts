import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url));

describe('user-supplied coconut logos',()=>{
 it.each([
  ['home-logo.png','ec4e675164017b9e8c72acff84eb1b1aea0714a7dfd5f91bb37e51b8b30a3561'],
  ['game-logo.png','24dbf3335002b25d72b3967b6506bb36036ad09940c10bb4c0feb2b0391cda01'],
 ])('keeps %s as the original 1536 by 1024 transparent PNG', (name,sha)=>{
  const data=read('public/coconut/logos/'+name);
  expect(createHash('sha256').update(data).digest('hex')).toBe(sha);
  expect(data.readUInt32BE(16)).toBe(1536);expect(data.readUInt32BE(20)).toBe(1024);
  expect(data[25]).toBe(6); // PNG RGBA color type.
 });
 it('replaces the two requested logos without duplicating the home mascot',()=>{
  const source=read('src/coconut/main.tsx').toString();
  expect(source).toContain('className="home-brand"');expect(source).toContain('/coconut/logos/home-logo.png');
  expect(source).toContain('className="game-brand"');expect(source).toContain('/coconut/logos/game-logo.png');
  expect(source).not.toContain('className="mascot home-mascot"');
  expect(source).toContain('className="mascot tiny"');expect(source).toContain('className="mascot clear-mascot"');
 });
 it('includes the logo directory in generated offline precache',()=>{
  const builder=read('scripts/build-coconut-sw.mjs').toString();
  expect(builder).toContain("files('coconut/logos')");expect(builder).toContain('...logos');
 });
});
