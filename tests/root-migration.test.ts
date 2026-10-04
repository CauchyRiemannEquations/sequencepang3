import {readFileSync,existsSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {PROGRESS_KEY} from '../src/coconut/progress';

const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

describe('canonical coconut entry',()=>{
 it('loads the current coconut game at the root with matching metadata',()=>{
  const html=read('index.html');
  expect(html).toContain('src="/src/coconut/main.tsx"');
  expect(html).toContain('시퀀스팡3 · 코코넛 수열 마작');
  expect(html).toContain('href="/coconut/icons/favicon-32.png"');
  expect(html).toContain('href="/manifest.webmanifest"');
  expect(html).not.toMatch(/Sequence Solitaire|용과|src="\/src\/main.tsx"/);
 });
 it('redirects only old page URLs, leaving coconut assets available',()=>{
  const config=JSON.parse(read('vercel.json'));
  expect(config.redirects).toEqual(['/coconut','/coconut/','/coconut/index.html'].map(source=>({source,destination:'/',permanent:true})));
  expect(config.redirects.some((r:{source:string})=>r.source==='/coconut/mascot.webp')).toBe(false);
  const fallback=read('coconut/index.html');
  expect(fallback).toContain("window.location.replace('/' + window.location.search + window.location.hash)");
  expect(fallback).not.toContain('/src/coconut/main.tsx');
 });
 it('removes the obsolete game and dragon-fruit icon from the current tree',()=>{
  for(const path of ['src/App.tsx','src/main.tsx','src/style.css','public/favicon.svg'])
   expect(existsSync(new URL('../'+path,import.meta.url))).toBe(false);
 });
 it('uses coconut install branding and preserves existing origin-wide progress',()=>{
  const manifest=JSON.parse(read('public/manifest.webmanifest'));
  expect(manifest.name).toContain('코코넛');
  expect(manifest.start_url).toBe('/');
  expect(manifest.scope).toBe('/');
  expect(manifest.icons[0].src).toBe('/coconut/icons/icon-192.png');
  expect(existsSync(new URL('../public'+manifest.icons[0].src,import.meta.url))).toBe(true);
  expect(PROGRESS_KEY).toBe('sequencepang3-coconut-progress-v1');
 });
});
