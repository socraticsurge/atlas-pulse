import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let studio;
before(async () => {
  process.env.ATLAS_DATA_DIR = mkdtempSync(join(tmpdir(), 'atlas-studio-'));
  studio = await import('./studio.js');
});

const newsletter = (title, extra = {}) => ({
  kind: 'newsletter',
  title,
  bodyMd: `# ${title}\n\n## Story\n\nText.`,
  style: 'digest',
  model: 'gemini-nano',
  aiSettings: { personas: ['analyst'] },
  sources: [
    { articleId: 4, url: 'https://a.example/1', title: 'First', source: 'A' },
    { articleId: null, url: 'https://b.example/2', title: 'Second', source: 'B' },
  ],
  ...extra,
});

test('saves an item with its sources in order and reads it back', () => {
  const item = studio.createStudioItem(newsletter('Monday'));
  assert.equal(item.title, 'Monday');
  assert.equal(item.bodyMd.startsWith('# Monday'), true);
  assert.deepEqual(item.aiSettings, { personas: ['analyst'] });
  assert.deepEqual(item.sources.map((s) => s.title), ['First', 'Second']);
  assert.equal(item.sources[1].articleId, null);
  assert.equal(item.createdAt, item.updatedAt);
});

test('lists items newest edit first, with excerpt and source count but no body', async () => {
  const a = studio.createStudioItem(newsletter('A'));
  const b = studio.createStudioItem(newsletter('B', { sources: [] }));
  await new Promise((r) => setTimeout(r, 5));
  studio.updateStudioItem(a.id, { bodyMd: 'edited' });
  const list = studio.listStudioItems();
  assert.equal(list[0].id, a.id);
  assert.equal(list.find((i) => i.id === b.id).sourceCount, 0);
  assert.equal(list[0].excerpt, 'edited');
  assert.equal('bodyMd' in list[0], false);
});

test('edits keep fields that were not sent and bump updatedAt', async () => {
  const item = studio.createStudioItem(newsletter('Keep'));
  await new Promise((r) => setTimeout(r, 5));
  const edited = studio.updateStudioItem(item.id, { title: 'Renamed' });
  assert.equal(edited.title, 'Renamed');
  assert.equal(edited.bodyMd, item.bodyMd);
  assert.ok(edited.updatedAt > item.updatedAt);
  assert.equal(studio.updateStudioItem(999_999, { title: 'x' }), null);
});

test('deleting an item removes its sources too', () => {
  const item = studio.createStudioItem(newsletter('Gone'));
  const before = studio.listStudioItems().length;
  assert.equal(studio.deleteStudioItem(item.id), true);
  assert.equal(studio.getStudioItem(item.id), null);
  assert.equal(studio.listStudioItems().length, before - 1);
  assert.equal(studio.deleteStudioItem(item.id), false);
});
