import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {STAGES} from '../src/coconut/stages';

it('preserves all original thirty boards, lessons, and solutions',()=>{
 // First thirty stages at main commit 2f3febc, before this chapter was added.
 expect(createHash('sha256').update(JSON.stringify(STAGES.slice(0,30))).digest('hex'))
  .toBe('d8ed426fbc9b10ebce4e1585253332d37d2c3015da868422974fb576d6a289ad');
});

it('preserves the first forty stages when adding the third-layer chapter',()=>{
 // First forty stages at PR #8 commit 6291b0d.
 expect(createHash('sha256').update(JSON.stringify(STAGES.slice(0,40))).digest('hex'))
  .toBe('8fa9e45364113567bbf66707e56725c7b6c296c3b37cb63c5966486bf073e6d1');
});
