import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editedLabel, wordCount } from './studioModel.js';

const now = new Date(2026, 9, 19, 10, 0);

test('word count ignores Markdown punctuation', () => {
  assert.equal(wordCount('# Title\n\n- one **two**\n\n---\n'), 3);
  assert.equal(wordCount(''), 0);
});

test('edited label is a time today and a date otherwise', () => {
  assert.match(editedLabel(new Date(2026, 9, 19, 8, 5).toISOString(), now), /8|08/);
  assert.match(editedLabel(new Date(2026, 8, 3).toISOString(), now), /3/);
  assert.equal(editedLabel(null, now), '');
});
