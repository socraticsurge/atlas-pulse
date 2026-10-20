import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { serveRouter } from './testServer.js';

let api;
before(async () => {
  process.env.ATLAS_DATA_DIR = mkdtempSync(join(tmpdir(), 'atlas-studio-routes-'));
  const { default: router } = await import('./studio.js');
  api = await serveRouter(router);
});
after(() => api.close());

const newsletter = (title) => ({
  kind: 'newsletter',
  title,
  bodyMd: `# ${title}\n\nText.`,
  sources: [{ articleId: 3, url: 'https://a.example/1', title: 'First', source: 'A' }],
});

test('save an item, read it back and list it without its body', async () => {
  const created = await api.post('/', newsletter('  Monday  '));
  assert.equal(created.status, 201);
  assert.equal(created.body.title, 'Monday');
  assert.deepEqual(created.body.sources.map((s) => s.title), ['First']);

  const read = await api.get(`/${created.body.id}`);
  assert.equal(read.body.bodyMd, '#   Monday  \n\nText.');
  const listed = (await api.get('/')).body.find((item) => item.id === created.body.id);
  assert.equal(listed.sourceCount, 1);
  assert.equal('bodyMd' in listed, false);
});

test('a new item is checked before it is stored', async () => {
  assert.match((await api.post('/', { ...newsletter('x'), kind: 'tweet' })).body.error, /kind must be one of/);
  assert.match((await api.post('/', { ...newsletter('x'), title: ' ' })).body.error, /title is required/);
  assert.deepEqual((await api.post('/', { ...newsletter('x'), sources: 'none' })).body, { error: 'invalid sources' });
  assert.equal((await api.post('/', {})).status, 400);
});

test('edit an item; bad edits are 400s and unknown items 404s', async () => {
  const item = (await api.post('/', newsletter('Draft'))).body;
  const edited = await api.put(`/${item.id}`, { title: 'Final', template: 'quarterly' });
  assert.equal(edited.body.title, 'Final');
  assert.equal(edited.body.template, 'quarterly');
  assert.equal(edited.body.bodyMd, item.bodyMd);

  assert.deepEqual((await api.put(`/${item.id}`, {})).body, { error: 'nothing to change' });
  assert.match((await api.put(`/${item.id}`, { template: 'Not An Id' })).body.error, /design id/);
  assert.equal((await api.put('/999999', { title: 'Nobody' })).status, 404);
});

test('ids must be positive integers', async () => {
  for (const id of ['abc', '0', '-2', '1.5']) {
    const res = await api.get(`/${id}`);
    assert.equal(res.status, 400, id);
    assert.deepEqual(res.body, { error: 'invalid id' });
  }
  assert.equal((await api.get('/999999')).status, 404);
});

test('an export request is checked first, and an unknown item is a 404', async () => {
  const item = (await api.post('/', newsletter('Export me'))).body;
  assert.match((await api.post(`/${item.id}/export`, { format: 'gif', origin: 'http://localhost' })).body.error, /format/);
  assert.match((await api.post(`/${item.id}/export`, { format: 'pdf', origin: 'https://evil.example' })).body.error, /origin/);
  const missing = await api.post('/999999/export', { format: 'pdf', origin: 'http://localhost:5173' });
  assert.equal(missing.status, 404);
});

test('delete an item', async () => {
  const item = (await api.post('/', newsletter('Gone'))).body;
  assert.deepEqual((await api.delete(`/${item.id}`)).body, { ok: true });
  assert.equal((await api.get(`/${item.id}`)).status, 404);
  assert.equal((await api.delete(`/${item.id}`)).status, 404);
});
