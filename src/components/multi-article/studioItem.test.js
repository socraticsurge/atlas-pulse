import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newsletterItem } from './studioItem.js';

test('a generated newsletter becomes an item with its sources in order', () => {
  const item = newsletterItem({
    output: '# Monday\n\nText',
    style: 'digest',
    model: 'gemini-nano',
    aiSettings: { personas: ['analyst'] },
    articles: [
      { id: 7, link: 'https://a.example', title: 'A', feedTitle: 'Feed A', content: 'dropped' },
      { id: 9, title: 'B' },
    ],
  });
  assert.equal(item.kind, 'newsletter');
  assert.equal(item.title, 'Monday');
  assert.deepEqual(item.sources, [
    { articleId: 7, url: 'https://a.example', title: 'A', source: 'Feed A' },
    { articleId: 9, url: null, title: 'B', source: null },
  ]);
});
