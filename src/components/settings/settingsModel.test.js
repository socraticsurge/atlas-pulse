import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importResultMessage, togglePersona } from './settingsModel.js';

test('togglePersona adds, removes, and always keeps at least one', () => {
  assert.deepEqual(togglePersona(['analyst'], 'skeptic'), ['analyst', 'skeptic']);
  assert.deepEqual(togglePersona(['analyst', 'skeptic'], 'analyst'), ['skeptic']);
  assert.deepEqual(togglePersona(['analyst'], 'analyst'), ['analyst']);
});

test('importResultMessage pluralizes and flags empty imports', () => {
  assert.equal(importResultMessage(1).text, 'Imported 1 feed! Articles are downloading in the background.');
  assert.equal(importResultMessage(3).text, 'Imported 3 feeds! Articles are downloading in the background.');
  assert.deepEqual(importResultMessage(0), { text: 'No new feeds found — all are already added.', type: 'error' });
});
