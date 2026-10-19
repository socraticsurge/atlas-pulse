import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, parseEdit, parseNewItem } from './studioInput.js';

const valid = { kind: 'newsletter', title: ' Weekly ', bodyMd: '# Hi' };

test('a new item keeps only known fields and trims the title', () => {
  const { value } = parseNewItem({ ...valid, extra: 'ignored', sources: [{ articleId: 3, url: 'u', title: 't', source: 's', junk: 1 }] });
  assert.equal(value.title, 'Weekly');
  assert.equal('extra' in value, false);
  assert.deepEqual(value.sources, [{ articleId: 3, url: 'u', title: 't', source: 's' }]);
  assert.equal(value.style, null);
  assert.equal(value.aiSettings, null);
});

test('a new item is rejected for an unknown kind, an empty title or a body that is too long', () => {
  assert.match(parseNewItem({ ...valid, kind: 'tweet' }).error, /kind/);
  assert.match(parseNewItem({ ...valid, title: '  ' }).error, /title/);
  assert.match(parseNewItem({ ...valid, bodyMd: 'x'.repeat(LIMITS.body + 1) }).error, /bodyMd/);
  assert.match(parseNewItem({ ...valid, bodyMd: 42 }).error, /bodyMd/);
  assert.match(parseNewItem().error, /kind/);
});

test('sources and settings must have the right shape', () => {
  assert.match(parseNewItem({ ...valid, sources: 'nope' }).error, /sources/);
  assert.match(parseNewItem({ ...valid, sources: Array(LIMITS.sources + 1).fill({}) }).error, /sources/);
  assert.match(parseNewItem({ ...valid, sources: [{ url: 5 }] }).error, /sources/);
  assert.match(parseNewItem({ ...valid, aiSettings: ['a'] }).error, /aiSettings/);
  assert.match(parseNewItem({ ...valid, model: 'm'.repeat(201) }).error, /model/);
});

test('an edit needs a title or a body, each valid', () => {
  assert.match(parseEdit({}).error, /nothing/);
  assert.match(parseEdit({ title: '' }).error, /title/);
  assert.deepEqual(parseEdit({ bodyMd: '' }).value, { title: undefined, bodyMd: '' });
  assert.deepEqual(parseEdit({ title: ' New ' }).value, { title: 'New', bodyMd: undefined });
});
