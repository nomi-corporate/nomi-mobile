import assert from 'node:assert/strict';
import test from 'node:test';
import { SPEECH_SILENCE_MS, shouldEndOnSilence } from '../src/features/capture/speechRules.ts';

test('capture ends only after speech followed by silence', () => {
  assert.equal(SPEECH_SILENCE_MS, 2500);
  assert.equal(shouldEndOnSilence(false, 1000, 9000), false, 'nothing recognized yet');
  assert.equal(shouldEndOnSilence(true, 0, 9000), false, 'no speech timestamp');
  assert.equal(shouldEndOnSilence(true, 1000, 3400), false, 'still within the pause');
  assert.equal(shouldEndOnSilence(true, 1000, 3500), true, 'pause long enough');
});
