import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countHint, countOk, OPERATIONS, placeholderText } from './operations.js';

test('countOk respects per-operation limits', () => {
  assert.equal(countOk(OPERATIONS.compare, 5), true);
  assert.equal(countOk(OPERATIONS.compare, 6), false);
  assert.equal(countOk(OPERATIONS.newsletter, 2), false);
});

test('countHint covers too many, too few, and normal counts', () => {
  assert.equal(countHint('compare', 7), 'Compare works best with up to 5 articles — remove 2 chips');
  assert.equal(countHint('compare', 6), 'Compare works best with up to 5 articles — remove 1 chip');
  assert.equal(countHint('newsletter', 2), 'Select at least 3 articles for Newsletter');
  assert.equal(countHint('briefing', 1), 'Select at least 2 articles for Briefing');
  assert.equal(countHint('briefing', 4), '4 articles · 2–15 articles');
});

test('placeholderText', () => {
  assert.equal(placeholderText('briefing'), 'Enter your prompt above and click Generate');
  assert.equal(placeholderText('newsletter'), 'Click Generate to generate newsletter');
});
