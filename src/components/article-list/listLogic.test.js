import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFilters, articlesToCSV, availableFilters, emptyStateText, viewTitle } from './listLogic.js';

const analyzed = (id, analysis, extra = {}) => ({ id, aiStatus: 'done', aiAnalysis: JSON.stringify(analysis), ...extra });
const articles = [
  analyzed(1, { sentiment: 'positive', urgency: 'breaking' }),
  analyzed(2, { sentiment: 'negative', urgency: 'breaking' }),
  { id: 3, aiStatus: 'none' },
  { id: 4, aiStatus: 'done', aiAnalysis: '{not json' },
];

test('availableFilters collects values per dimension and skips malformed analyses', () => {
  const f = availableFilters(articles);
  assert.deepEqual([...f.sentiment].sort(), ['negative', 'positive']);
  assert.deepEqual([...f.urgency], ['breaking']);
  assert.equal(f.tone.size, 0);
});

test('applyFilters: AI-only toggle and dimension filters', () => {
  assert.deepEqual(applyFilters(articles).map((a) => a.id), [1, 2, 3, 4]);
  assert.deepEqual(applyFilters(articles, { aiOnly: true }).map((a) => a.id), [1, 2, 4]);
  assert.deepEqual(applyFilters(articles, { activeFilters: { urgency: 'breaking', sentiment: 'negative' } }).map((a) => a.id), [2]);
  assert.deepEqual(applyFilters(articles, { activeFilters: { sentiment: null } }).map((a) => a.id), [1, 2, 3, 4]);
});

test('viewTitle and emptyStateText', () => {
  assert.equal(viewTitle({ type: 'all' }), 'All Articles');
  assert.equal(viewTitle({ type: 'feed', name: 'HN' }), 'HN');
  assert.equal(viewTitle({ type: 'folder' }), 'Folder');
  assert.equal(viewTitle({ type: 'other' }), 'Articles');
  assert.equal(emptyStateText({ hasActiveFilters: true, searchQuery: 'x', viewType: 'saved' }).body, 'No articles match the active filters');
  assert.equal(emptyStateText({ searchQuery: 'ai', viewType: 'saved' }).body, 'No articles match "ai"');
  assert.equal(emptyStateText({ viewType: 'saved' }).title, 'Nothing saved yet');
  assert.equal(emptyStateText({ viewType: 'all' }).title, 'Your feed is empty');
});

test('articlesToCSV quotes text fields and escapes quotes', () => {
  const csv = articlesToCSV(
    [{ title: 'Say "hi"', link: 'https://e.com/a', publishedAt: '2026-10-01T00:00:00Z', isRead: 1, isBookmarked: 0 }],
    () => 'Src, Inc',
  );
  assert.equal(csv, 'Title,Source,Published,URL,Read,Bookmarked\n"Say ""hi""","Src, Inc",2026-10-01T00:00:00.000Z,"https://e.com/a",yes,no');
});
