import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDITIONS, buildQuery, defaultEdition, googleNewsUrl, siteFilter } from './googleNews.js';

test('defaultEdition matches the browser locale, falling back to the language, then US English', () => {
  assert.equal(defaultEdition('en-IN').id, 'IN:en');
  assert.equal(defaultEdition('en-US').id, 'US:en');
  assert.equal(defaultEdition('en').id, 'US:en');
  assert.equal(defaultEdition('en-ZA').id, 'US:en');
  assert.equal(defaultEdition('hi-IN').id, 'IN:hi');
  assert.equal(defaultEdition('fr-CA').id, 'FR:fr');
  assert.equal(defaultEdition('pt-PT').id, 'BR:pt-419');
  assert.equal(defaultEdition('zh-TW').id, 'TW:zh-Hant');
  assert.equal(defaultEdition('sw-KE').id, 'US:en');
  assert.equal(defaultEdition('').id, 'US:en');
  assert.equal(defaultEdition().id, 'US:en');
});

test('every edition has a unique ceid that names its country', () => {
  assert.equal(new Set(EDITIONS.map((e) => e.id)).size, EDITIONS.length);
  for (const e of EDITIONS) assert.ok(e.id.startsWith(`${e.gl}:`), e.id);
});

test('siteFilter reduces a URL or host to a bare host', () => {
  assert.equal(siteFilter('https://www.reuters.com/world/?x=1'), 'reuters.com');
  assert.equal(siteFilter('  WSJ.com '), 'wsj.com');
  assert.equal(siteFilter('theverge.com/ai'), 'theverge.com');
  assert.equal(siteFilter('   '), '');
  assert.equal(siteFilter(), '');
});

test('buildQuery adds site: only when a site is given', () => {
  assert.equal(buildQuery({ query: ' "Anthropic" ' }), '"Anthropic"');
  assert.equal(buildQuery({ query: 'Anthropic', site: 'https://www.reuters.com' }), 'Anthropic site:reuters.com');
});

test('googleNewsUrl encodes the search for the chosen edition', () => {
  assert.equal(googleNewsUrl({ query: 'climate & ai' }), 'https://news.google.com/rss/search?q=climate%20%26%20ai&hl=en&gl=US&ceid=US:en');
  assert.equal(
    googleNewsUrl({ query: '"Anthropic"', site: 'reuters.com', edition: 'IN:en' }),
    'https://news.google.com/rss/search?q=%22Anthropic%22%20site%3Areuters.com&hl=en-IN&gl=IN&ceid=IN:en',
  );
  assert.equal(googleNewsUrl({ query: 'AI', edition: 'nowhere' }), 'https://news.google.com/rss/search?q=AI&hl=en&gl=US&ceid=US:en');
  assert.equal(googleNewsUrl({ query: '  ', site: 'reuters.com' }), '');
});
