import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capBadge, folderUnread, groupFeeds, isActive } from './sidebarModel.js';

test('groupFeeds keeps feed order within folders and collects uncategorized feeds', () => {
  const feeds = [{ id: 1, folderId: 7 }, { id: 2 }, { id: 3, folderId: 7 }, { id: 4, folderId: 8 }];
  const { byFolder, uncategorized } = groupFeeds(feeds);
  assert.deepEqual(byFolder[7].map((f) => f.id), [1, 3]);
  assert.deepEqual(byFolder[8].map((f) => f.id), [4]);
  assert.deepEqual(uncategorized.map((f) => f.id), [2]);
});

test('folderUnread, capBadge, isActive', () => {
  assert.equal(folderUnread([{ id: 1 }, { id: 3 }], { 1: 5, 3: 2, 9: 100 }), 7);
  assert.equal(folderUnread(undefined, {}), 0);
  assert.equal(capBadge(99), 99);
  assert.equal(capBadge(100), '99+');
  assert.equal(isActive({ type: 'folder', id: 7 }, 'folder', 7), true);
  assert.equal(isActive({ type: 'folder', id: 7 }, 'folder', 8), false);
  assert.equal(isActive({ type: 'all' }, 'all'), true);
});
