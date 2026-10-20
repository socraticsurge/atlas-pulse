import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { byArea, toMarkdown } from './coverage-summary.js';

const ROOT = path.resolve('repo');
const file = (...parts) => path.join(ROOT, ...parts);
const counts = (covered, total) => ({ statements: { covered, total } });

const SUMMARY = {
  total: counts(70, 200),
  [file('server', 'index.js')]: counts(30, 40),
  [file('server', 'routes', 'reader.js')]: counts(0, 60),
  [file('src', 'App.jsx')]: counts(0, 50),
  [file('src', 'utils', 'api.js')]: counts(40, 50),
};

test('byArea totals statements per top-level folder and counts untested files', () => {
  assert.deepEqual(byArea(SUMMARY, ROOT), [
    { area: 'server/', files: 2, untested: 1, covered: 30, total: 100 },
    { area: 'src/', files: 2, untested: 1, covered: 40, total: 100 },
    { area: 'Total', files: 4, untested: 2, covered: 70, total: 200 },
  ]);
});

test('toMarkdown shows each area and how far the total is from 80%', () => {
  const markdown = toMarkdown(byArea(SUMMARY, ROOT));
  assert.match(markdown, /\| server\/ \| 2 \| 1 \| 30 \/ 100 \| 30\.0% \|/);
  assert.match(markdown, /\| Total \| 4 \| 2 \| 70 \/ 200 \| 35\.0% \|/);
  assert.match(markdown, /45\.0 points under the 80%/);
});

test('toMarkdown says when the total meets the target', () => {
  const markdown = toMarkdown(byArea({ [file('shared', 'a.js')]: counts(9, 10) }, ROOT));
  assert.match(markdown, /Meets the 80%/);
});
