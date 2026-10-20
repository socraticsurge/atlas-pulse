import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeUrl, firstOf, orEmpty, toArticle } from './feedItems.js';

test('firstOf matches a || b || c, including the last-value fallback', () => {
  assert.equal(firstOf('', 'b', 'c'), 'b');
  assert.equal(firstOf(0, null, ''), '');
  assert.equal(firstOf(undefined, undefined), undefined);
  assert.deepEqual(firstOf(null, []), []);
  assert.equal(orEmpty(undefined), '');
  assert.equal(orEmpty('x'), 'x');
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

test('canonicalizeUrl drops tracking, www and a trailing slash, sorts params, keeps the fragment', () => {
  assert.equal(canonicalizeUrl('https://WWW.News.example/story/?utm_source=rss&b=2&a=1'), 'https://news.example/story?a=1&b=2');
  assert.equal(canonicalizeUrl('https://e.com/changelog#v1.3'), 'https://e.com/changelog#v1.3');
  assert.equal(canonicalizeUrl('not a url'), 'not a url');
  assert.equal(canonicalizeUrl(''), '');
});
