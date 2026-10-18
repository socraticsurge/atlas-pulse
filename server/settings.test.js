import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSettings, updateSettings } from './settings.js';

const tempFile = () => join(mkdtempSync(join(tmpdir(), 'atlas-settings-')), 'settings.json');

test('a missing or broken file reads as no settings', () => {
  const path = tempFile();
  assert.deepEqual(readSettings(path), {});
  writeFileSync(path, '{ not json');
  assert.deepEqual(readSettings(path), {});
});

test('changes merge, null removes, and the file is readable JSON', () => {
  const path = tempFile();
  updateSettings({ 'atlas-pulse-theme': 'dark', 'atlas-pulse-font': 'plex' }, path);
  const values = updateSettings({ 'atlas-pulse-theme': 'light', 'atlas-pulse-font': null }, path);
  assert.deepEqual(values, { 'atlas-pulse-theme': 'light' });
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { 'atlas-pulse-theme': 'light' });
});

test('unknown keys, non-strings and oversized values are rejected', () => {
  const path = tempFile();
  assert.throws(() => updateSettings({ 'atlas-pulse-sidebar-width': '300' }, path), /Unknown setting/);
  assert.throws(() => updateSettings({ 'atlas-pulse-theme': 3 }, path), /must be a string/);
  assert.throws(() => updateSettings({ 'atlas-pulse-prompts': 'x'.repeat(70000) }, path), /too long/);
  assert.throws(() => updateSettings(['atlas-pulse-theme'], path), /must be an object/);
  assert.deepEqual(readSettings(path), {});
});
