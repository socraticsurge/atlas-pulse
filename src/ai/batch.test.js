import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batchStatus, batchUpdates, hasManualSummary, IDLE_PROGRESS, newestFirst, parseScope, pickBatchModel, progressAfter, progressStarted } from './batch.js';

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
  const fromBatch = { aiSummary: 'S', aiSummarySource: 'batch' };
  assert.deepEqual(batchUpdates(parsed, 'both'), { aiStatus: 'done', ...fromBatch, aiAnalysis: analysis });
  assert.deepEqual(batchUpdates(parsed), { aiStatus: 'done', ...fromBatch, aiAnalysis: analysis });
  assert.deepEqual(batchUpdates(parsed, 'summary'), { aiStatus: 'done', ...fromBatch });
  assert.deepEqual(batchUpdates(parsed, 'analysis'), { aiStatus: 'done', aiAnalysis: analysis });
});

test('batchUpdates keeps a summary the reader asked for and adds only the analysis', () => {
  const parsed = { summary: 'S', sentiment: 'positive' };
  const mine = { aiSummary: 'Mine', aiSummarySource: 'manual' };
  assert.deepEqual(batchUpdates(parsed, 'both', mine), { aiStatus: 'done', aiAnalysis: JSON.stringify({ sentiment: 'positive' }) });
  assert.deepEqual(batchUpdates(parsed, 'summary', mine), { aiStatus: 'done' });
  assert.equal(hasManualSummary(mine), true);
  assert.equal(hasManualSummary({ aiSummarySource: 'batch' }), false);
  assert.equal(hasManualSummary(undefined), false);
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

test('batchStatus pauses a queue that nothing will process, and says why', () => {
  const models = [{ name: 'gemini-nano' }];
  assert.deepEqual(batchStatus({ queuedCount: 0, enabled: false, manualRun: false, models }), { status: 'idle', reason: null });
  assert.deepEqual(batchStatus({ queuedCount: 40, enabled: false, manualRun: false, models }), { status: 'paused', reason: 'off' });
  assert.deepEqual(batchStatus({ queuedCount: 40, enabled: false, manualRun: true, models }), { status: 'running', reason: null });
  assert.deepEqual(batchStatus({ queuedCount: 5, enabled: true, manualRun: false, models }), { status: 'running', reason: null });
  assert.deepEqual(batchStatus({ queuedCount: 5, enabled: true, manualRun: false, models: [] }), { status: 'paused', reason: 'no-model' });
  // Models still loading: don't flash "paused".
  assert.deepEqual(batchStatus({ queuedCount: 5, enabled: true, manualRun: false, models: null }), { status: 'running', reason: null });
});

test('progressAfter leaves progress unchanged when the server was unreachable', () => {
  const p = { total: 5, done: 2, failed: 1, running: true };
  assert.deepEqual(progressAfter(p, 'unavailable'), p);
});
