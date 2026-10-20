import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRefresher, DEFAULT_MINUTES, isDue, refreshMinutes } from './scheduler.js';

const MIN = 60 * 1000;
const quiet = { log() {}, error() {} };

// A refresh run the test finishes by hand.
function controlledRun() {
  const calls = [];
  const refreshAll = () => new Promise((resolve) => { calls.push(resolve); });
  return { refreshAll, calls, finish: (tally) => calls.at(-1)(tally) };
}

test('refreshMinutes reads the setting: 0 is off, missing or unreadable is the default', () => {
  assert.equal(refreshMinutes({ 'atlas-pulse-auto-refresh': '15' }), 15);
  assert.equal(refreshMinutes({ 'atlas-pulse-auto-refresh': '0' }), 0);
  assert.equal(refreshMinutes({}), DEFAULT_MINUTES);
  assert.equal(refreshMinutes({ 'atlas-pulse-auto-refresh': 'soon' }), DEFAULT_MINUTES);
  assert.equal(refreshMinutes({ 'atlas-pulse-auto-refresh': '-5' }), 0);
});

test('isDue: never while off or running; at once before the first run; then after the interval', () => {
  const base = { minutes: 15, running: false, lastStartedAt: null, now: 100 * MIN };
  assert.equal(isDue(base), true);
  assert.equal(isDue({ ...base, minutes: 0 }), false);
  assert.equal(isDue({ ...base, running: true }), false);
  assert.equal(isDue({ ...base, lastStartedAt: 90 * MIN }), false);
  assert.equal(isDue({ ...base, lastStartedAt: 85 * MIN }), true);
  assert.equal(isDue({ ...base, lastStartedAt: 10 * MIN }), true, 'catches up after the computer sleeps');
});

test('tick starts a run only when one is due', async () => {
  let clock = 0;
  const run = controlledRun();
  const refresher = createRefresher({ refreshAll: run.refreshAll, readMinutes: () => 15, now: () => clock, log: quiet });
  refresher.tick();
  await Promise.resolve();
  assert.equal(run.calls.length, 1);
  refresher.tick();
  await Promise.resolve();
  assert.equal(run.calls.length, 1, 'not while running');
  run.finish({ inserted: 2, failed: [] });
  await new Promise((r) => setImmediate(r));
  clock = 10 * MIN;
  refresher.tick();
  await Promise.resolve();
  assert.equal(run.calls.length, 1, 'not before the interval');
  clock = 15 * MIN;
  refresher.tick();
  await Promise.resolve();
  assert.equal(run.calls.length, 2);
});

test('runAll joins a run in progress and reports it in status', async () => {
  let clock = 5 * MIN;
  const run = controlledRun();
  const refresher = createRefresher({ refreshAll: run.refreshAll, readMinutes: () => 0, now: () => clock, log: quiet });
  assert.deepEqual(refresher.status(), { running: false, lastStartedAt: null, lastFinishedAt: null, lastInserted: 0, lastFailed: [] });
  const a = refresher.runAll();
  const b = refresher.runAll();
  assert.equal(a, b);
  await Promise.resolve();
  assert.equal(run.calls.length, 1);
  assert.equal(refresher.status().running, true);
  clock = 6 * MIN;
  run.finish({ inserted: 4, failed: ['Techmeme'] });
  assert.deepEqual(await a, { inserted: 4, failed: ['Techmeme'] });
  assert.deepEqual(refresher.status(), {
    running: false,
    lastStartedAt: new Date(5 * MIN).toISOString(),
    lastFinishedAt: new Date(6 * MIN).toISOString(),
    lastInserted: 4,
    lastFailed: ['Techmeme'],
  });
});

test('a run that fails rejects, logs from tick, and lets the next run start', async () => {
  const errors = [];
  let attempts = 0;
  let clock = 0;
  const refreshAll = () => { attempts += 1; throw new Error('database is locked'); };
  const refresher = createRefresher({ refreshAll, readMinutes: () => 15, now: () => clock, log: { log() {}, error: (...a) => errors.push(a) } });
  await assert.rejects(refresher.runAll(), /database is locked/);
  assert.equal(refresher.status().running, false);
  assert.equal(refresher.status().lastFinishedAt, null);
  await assert.rejects(refresher.runAll(), /database is locked/);
  assert.equal(attempts, 2);
  clock = 15 * MIN;
  refresher.tick();
  await new Promise((r) => setImmediate(r));
  assert.equal(attempts, 3);
  assert.equal(errors.length, 1, 'tick logs the failure instead of crashing the server');
});
