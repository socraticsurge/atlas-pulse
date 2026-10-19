import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageMeta } from './pageMeta.js';

const item = { id: 7, style: 'brief', model: 'gemma3:4b', createdAt: '2026-10-19T08:00:00Z', sources: [{}, {}] };

test('masthead lines come from the item, preferring a date written in the newsletter', () => {
  const meta = pageMeta(item, { meta: [{ label: 'Date', md: 'October 16, 2026' }] });
  assert.equal(meta.issueLabel, 'No. 7');
  assert.equal(meta.edition, 'Executive Brief edition');
  assert.equal(meta.sourceLine, 'Curated from 2 articles');
  assert.equal(meta.date, 'October 16, 2026');
  assert.equal(meta.byline, 'Written with gemma3');
});

test('missing pieces fall back quietly', () => {
  const meta = pageMeta({ id: 1, createdAt: '2026-10-19T08:00:00Z' }, { meta: [] });
  assert.equal(meta.edition, 'Newsletter edition');
  assert.equal(meta.sourceLine, '');
  assert.equal(meta.byline, '');
  assert.match(meta.date, /2026/);
});
