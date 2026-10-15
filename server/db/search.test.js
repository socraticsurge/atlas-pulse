import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let reader;
before(async () => {
  // Point the db layer at a throwaway directory before it opens anything.
  process.env.ATLAS_DATA_DIR = mkdtempSync(join(tmpdir(), 'atlas-search-'));
  reader = await import('./reader.js');
  const feed = reader.createFeed({ title: 'Feed', url: 'https://example.com/rss' });
  reader.bulkInsertArticles(feed.id, [
    { guid: 'k8s', title: 'Ops notes', summary: '', content: '<p>Running <b>Kubernetes</b> clusters at scale.</p>' },
    { guid: 'cloud', title: 'Cloud', summary: 'Clouds and costs', content: '' },
    { guid: 'oss', title: 'Licensing', summary: '', content: 'Thoughts on open source licensing.' },
  ]);
});

const titlesFor = (ids) => ids.map((id) => reader.getArticleById(id).title).sort();

test('finds terms anywhere in the article body, including inside HTML', () => {
  const { matches } = reader.searchArticleBodies('kubernetes');
  assert.deepEqual(titlesFor(matches.kubernetes), ['Ops notes']);
});

test('single words match as prefixes; phrases match exactly', () => {
  assert.deepEqual(titlesFor(reader.searchArticleBodies('cloud').matches.cloud), ['Cloud']);
  assert.deepEqual(titlesFor(reader.searchArticleBodies('"open source"').matches['open source']), ['Licensing']);
  assert.deepEqual(reader.searchArticleBodies('"source open"').matches['source open'], []);
});

test('quotes and FTS syntax in queries are treated as plain text', () => {
  assert.doesNotThrow(() => reader.searchArticleBodies('AND OR NOT ( ) * "unterminated'));
});

test('deleted articles leave the index', () => {
  const feed = reader.createFeed({ title: 'Temp', url: 'https://temp.example/rss' });
  reader.bulkInsertArticles(feed.id, [{ guid: 'gone', title: 'Gone', content: 'zeppelin' }]);
  assert.equal(reader.searchArticleBodies('zeppelin').matches.zeppelin.length, 1);
  reader.removeFeed(feed.id);
  assert.deepEqual(reader.searchArticleBodies('zeppelin').matches.zeppelin, []);
});
