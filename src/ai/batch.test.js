import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  IDLE_PROGRESS, batchUpdates, newestFirst, parseScope, pickBatchModel, progressAfter, progressStarted,
} from './batch.js';

const models = [{ name: 'gemini-nano' }, { name: 'llama3.2' }];

test('pickBatchModel keeps an installed saved model, else falls back to the first', () => {
  assert.equal(pickBatchModel('llama3.2', models), 'llama3.2');
  assert.equal(pickBatchModel('gone', models), 'gemini-nano');
  assert.equal(pickBatchModel('', models), 'gemini-nano');
  assert.equal(pickBatchModel('llama3.2', null), '');
  assert.equal(pickBatchModel('', []), '');
});

test('newestFirst sorts by publishedAt descending without mutating', () => {
  const input = [
    { id: 1, publishedAt: '2026-01-01' },
    { id: 2, publishedAt: '2026-03-01' },
    { id: 3, publishedAt: '2026-02-01' },
  ];
  assert.deepEqual(newestFirst(input).map((a) => a.id), [2, 3, 1]);
  assert.deepEqual(input.map((a) => a.id), [1, 2, 3]);
});

test('batchUpdates saves the fields the features setting asks for', () => {
  const parsed = { summary: 'S', sentiment: 'positive', topics: ['ai'] };
  const analysis = JSON.stringify({ sentiment: 'positive', topics: ['ai'] });
  assert.deepEqual(batchUpdates(parsed, 'both'), { aiStatus: 'done', aiSummary: 'S', aiAnalysis: analysis });
  assert.deepEqual(batchUpdates(parsed), { aiStatus: 'done', aiSummary: 'S', aiAnalysis: analysis });
  assert.deepEqual(batchUpdates(parsed, 'summary'), { aiStatus: 'done', aiSummary: 'S' });
  assert.deepEqual(batchUpdates(parsed, 'analysis'), { aiStatus: 'done', aiAnalysis: analysis });
});

test('parseScope reads all, feed, and folder scopes', () => {
  assert.deepEqual(parseScope('all'), { type: 'all', id: null });
  assert.deepEqual(parseScope(undefined), { type: 'all', id: null });
  assert.deepEqual(parseScope('feed:12'), { type: 'feed', id: 12 });
  assert.deepEqual(parseScope('folder:3'), { type: 'folder', id: 3 });
});

test('progress tracks started, done, failed, and drained', () => {
  let p = progressStarted(IDLE_PROGRESS, 3);
  assert.deepEqual(p, { total: 3, done: 0, failed: 0, running: true });
  p = progressAfter(p, 'done');
  p = progressStarted(p, 2);
  assert.equal(p.total, 3);
  p = progressAfter(p, 'failed');
  assert.deepEqual(p, { total: 3, done: 1, failed: 1, running: true });
  assert.deepEqual(progressAfter(p, 'empty'), { ...p, running: false });
});
