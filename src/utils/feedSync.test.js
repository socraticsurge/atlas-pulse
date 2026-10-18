import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkBySize, firstOf, fulfilledTotal, importNewFeeds, inBatchScope, toArticle } from './feedSync.js';

test('firstOf matches a || b || c, including the last-value fallback', () => {
  assert.equal(firstOf('', 'b', 'c'), 'b');
  assert.equal(firstOf(0, null, ''), '');
  assert.equal(firstOf(undefined, undefined), undefined);
  assert.deepEqual(firstOf(null, []), []);
});

test('toArticle fills defaults and canonicalizes the link', () => {
  const a = toArticle({ title: 'T', link: 'https://e.com/a?utm_source=x', guid: 'g', publishedAt: '2026-01-01' });
  assert.deepEqual(
    { ...a, canonicalLink: undefined },
    { content: '', summary: '', author: '', imageUrl: '', guid: 'g', canonicalLink: undefined, title: 'T', link: 'https://e.com/a?utm_source=x', publishedAt: '2026-01-01' },
  );
  assert.ok(a.canonicalLink.startsWith('https://e.com/a'));
  const bare = toArticle({ title: 'U', link: 'https://e.com/b' });
  assert.equal(bare.guid, 'https://e.com/b');
  assert.ok(!Number.isNaN(Date.parse(bare.publishedAt)));
});

test('fulfilledTotal sums fulfilled values and ignores rejections and empties', () => {
  assert.equal(fulfilledTotal([
    { status: 'fulfilled', value: 3 },
    { status: 'rejected', reason: new Error('x') },
    { status: 'fulfilled', value: undefined },
    { status: 'fulfilled', value: 2 },
  ]), 5);
});

test('inBatchScope handles all, feed, and unknown scopes without network', async () => {
  assert.equal(await inBatchScope('all', 4), true);
  assert.equal(await inBatchScope(undefined, 4), true);
  assert.equal(await inBatchScope('feed:4', 4), true);
  assert.equal(await inBatchScope('feed:5', 4), false);
  assert.equal(await inBatchScope('bogus:1', 4), false);
});

test('importNewFeeds skips known and duplicate URLs and returns the saved feeds', async () => {
  const parsed = [
    { title: 'Known', url: 'https://a.example/rss' },
    { title: 'New', url: 'https://b.example/rss' },
    { title: 'New again', url: 'https://b.example/rss' },
    { title: 'Rejected', url: 'https://c.example/rss' },
    { title: 'Other', url: 'https://d.example/rss' },
  ];
  let nextId = 10;
  const store = async (feed) => (feed.title === 'Rejected' ? null : { id: nextId++, url: feed.url });
  const saved = await importNewFeeds(parsed, [{ id: 1, url: 'https://a.example/rss' }], store);
  assert.deepEqual(saved, [{ id: 10, url: 'https://b.example/rss' }, { id: 11, url: 'https://d.example/rss' }]);
});

test('chunkBySize keeps order, respects the limit, and isolates oversized items', () => {
  const item = (n) => ({ body: 'x'.repeat(n) });
  const sizes = (chunks) => chunks.map((c) => c.map((i) => i.body.length));
  assert.deepEqual(sizes(chunkBySize([item(30), item(30), item(30)], 100)), [[30, 30], [30]]);
  assert.deepEqual(sizes(chunkBySize([item(10), item(500), item(10)], 100)), [[10], [500], [10]]);
  assert.deepEqual(chunkBySize([], 100), []);
});
