import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editToSave } from './useStudio.js';

test('edits are sent as typed, except a blank title', () => {
  assert.deepEqual(editToSave({ bodyMd: '' }), { bodyMd: '' });
  assert.deepEqual(editToSave({ title: '  Weekly  ' }), { title: 'Weekly' });
  assert.equal(editToSave({ title: '   ' }), null);
});
