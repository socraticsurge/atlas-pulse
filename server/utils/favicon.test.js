import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iconLinksInHtml, isValidHostname } from './favicon.js';

test('isValidHostname accepts DNS names and rejects everything else', () => {
  assert.ok(isValidHostname('www.theverge.com'));
  assert.ok(isValidHostname('news.ycombinator.com'));
  for (const bad of ['localhost', '127.0.0.1', '[::1]', 'example.com:8080', 'a/b.com', 'user@example.com', '', '..', 'x'.repeat(260) + '.com']) {
    assert.equal(isValidHostname(bad), false, bad);
  }
});

test('iconLinksInHtml resolves icon links and prefers ones near 32px', () => {
  const html = `<head>
    <link rel="apple-touch-icon" href="/apple.png">
    <link rel="icon" sizes="192x192" href="/big.png">
    <link rel="shortcut icon" href="https://cdn.example.com/fav.ico">
    <link rel="icon" sizes="32x32" href="icons/32.png">
    <link rel="stylesheet" href="/site.css">
  </head>`;
  assert.deepEqual(iconLinksInHtml(html, 'https://example.com/blog/'), [
    'https://example.com/blog/icons/32.png',
    'https://cdn.example.com/fav.ico',
    'https://example.com/big.png',
    'https://example.com/apple.png',
  ]);
});

test('iconLinksInHtml returns nothing for a page without icons', () => {
  assert.deepEqual(iconLinksInHtml('<html><head></head></html>', 'https://example.com/'), []);
});
