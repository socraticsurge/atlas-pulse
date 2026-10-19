import { test } from 'node:test';
import assert from 'node:assert/strict';
import { styleLabel, titleFromMarkdown, TITLE_MAX } from './newsletter.js';

const now = new Date(2026, 9, 19, 10, 0);

test('the title is the first heading as plain text', () => {
  assert.equal(titleFromMarkdown('Intro line\n\n# The **Daily** Digest #\n## Story'), 'The Daily Digest');
  assert.equal(titleFromMarkdown('## [AI](https://x.example) this `week`'), 'AI this week');
  assert.match(titleFromMarkdown('#### Too deep', now), /^Newsletter · /, 'only # to ### count');
});

test('without a heading the title falls back to the date, and is capped', () => {
  assert.match(titleFromMarkdown('Just text', now), /^Newsletter · /);
  assert.match(titleFromMarkdown(null, now), /^Newsletter · /);
  assert.equal(titleFromMarkdown(`# ${'x'.repeat(300)}`).length, TITLE_MAX);
});

test('style labels by id', () => {
  assert.equal(styleLabel('roundup'), 'Weekly Roundup');
  assert.equal(styleLabel('nope'), undefined);
});
