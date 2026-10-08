import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {STAGES} from '../src/coconut/stages';

it('preserves all original thirty boards, lessons, and solutions',()=>{
 // First thirty stages at main commit 2f3febc, before this chapter was added.
 expect(createHash('sha256').update(JSON.stringify(STAGES.slice(0,30))).digest('hex'))
  .toBe('d8ed426fbc9b10ebce4e1585253332d37d2c3015da868422974fb576d6a289ad');
});
