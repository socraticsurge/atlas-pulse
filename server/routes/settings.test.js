import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { serveRouter } from './testServer.js';

let dataDir;
let api;
before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'atlas-settings-routes-'));
  process.env.ATLAS_DATA_DIR = dataDir;
  const { default: router } = await import('./settings.js');
  api = await serveRouter(router);
});
after(() => api.close());

test('before the first save there are no settings, and the file is in the data directory', async () => {
  assert.deepEqual((await api.get('/')).body, { values: {}, path: join(dataDir, 'settings.json') });
});

test('saved settings are written to the file and read back; null removes one', async () => {
  const saved = await api.put('/', { values: { 'atlas-pulse-theme': 'dark', 'atlas-pulse-font': 'serif' } });
  assert.deepEqual(saved.body, { values: { 'atlas-pulse-theme': 'dark', 'atlas-pulse-font': 'serif' } });
  assert.deepEqual(JSON.parse(readFileSync(join(dataDir, 'settings.json'), 'utf8')), saved.body.values);

  const removed = await api.put('/', { values: { 'atlas-pulse-font': null } });
  assert.deepEqual(removed.body, { values: { 'atlas-pulse-theme': 'dark' } });
  assert.deepEqual((await api.get('/')).body.values, { 'atlas-pulse-theme': 'dark' });
});

test('unknown keys, wrong types and a missing change set are 400s that change nothing', async () => {
  const unknown = await api.put('/', { values: { 'atlas-pulse-theme': 'light', 'not-a-setting': 'x' } });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.error, 'Unknown setting: not-a-setting');
  const wrongType = await api.put('/', { values: { 'atlas-pulse-theme': 3 } });
  assert.equal(wrongType.status, 400);
  assert.equal(wrongType.body.error, 'atlas-pulse-theme must be a string');
  assert.deepEqual((await api.put('/', {})).body, { error: 'values must be an object' });
  assert.deepEqual((await api.get('/')).body.values, { 'atlas-pulse-theme': 'dark' });
});
