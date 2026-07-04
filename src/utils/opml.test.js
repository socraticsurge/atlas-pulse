import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeHttpUrl } from './opml.js';

// Regression guard for OPML import: only http(s) URLs may be stored, so a
// crafted OPML file can't slip a javascript:/data: URL into a feed's siteUrl.
test('safeHttpUrl keeps http(s) URLs', () => {
  assert.equal(safeHttpUrl('https://example.com/feed.xml'), 'https://example.com/feed.xml');
  assert.equal(safeHttpUrl('http://news.example.org/rss'), 'http://news.example.org/rss');
});

test('safeHttpUrl drops dangerous or malformed URLs', () => {
  assert.equal(safeHttpUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(safeHttpUrl('file:///etc/passwd'), '');
  assert.equal(safeHttpUrl('not a url'), '');
  assert.equal(safeHttpUrl(''), '');
  assert.equal(safeHttpUrl(null), '');
  assert.equal(safeHttpUrl(undefined), '');
});
