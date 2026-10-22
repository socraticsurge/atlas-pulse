import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionDraft, DRAFT_MAX_ARTICLES } from './collectionDraft.js';

const feedOf = () => ({ title: 'Field Notes', siteUrl: 'https://n.example/' });

test('a draft has the collection as headline, one section per article, and a reference list', () => {
  const draft = collectionDraft(
    { name: 'Local-first stack', description: 'Databases that ship inside the app' },
    [
      { id: 1, title: 'PGlite in the browser', note: 'could replace our SQLite server', excerpt: 'Postgres,\n embedded.', link: 'https://n.example/a', author: 'Ann Lee', publishedAt: '2026-10-01T09:00:00.000Z' },
      { id: 2, title: 'No note', note: null, excerpt: '', link: null },
    ],
    feedOf,
  );
  assert.equal(draft.kind, 'newsletter');
  assert.equal(draft.title, 'Local-first stack');
  assert.equal(draft.bodyMd, [
    '# Local-first stack',
    'Databases that ship inside the app',
    '## PGlite in the browser\n\n**Why it matters:** could replace our SQLite server\n\nPostgres, embedded.\n\n[Read at Field Notes](https://n.example/a)',
    '## No note\n\n**Why it matters:** _Your take here._',
    '## References',
    'Lee, A. (2026, October 1). PGlite in the browser. *Field Notes*. https://n.example/a',
    'No note. (n.d.). *Field Notes*.',
  ].join('\n\n') + '\n');
  assert.deepEqual(draft.sources[0], { articleId: 1, url: 'https://n.example/a', title: 'PGlite in the browser', source: 'Field Notes' });
});

test('without a description the opening asks for one; long collections are capped', () => {
  const many = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, title: `A${i}` }));
  const draft = collectionDraft({ name: 'Evals' }, many, feedOf);
  assert.match(draft.bodyMd, /^# Evals\n\nA draft from your Evals collection\. Write the opening here\./);
  assert.equal(draft.sources.length, DRAFT_MAX_ARTICLES);
  assert.equal(draft.bodyMd.split('\n').filter((line) => /^A\d+\. \(n\.d\.\)/.test(line)).length, DRAFT_MAX_ARTICLES);
});

test('an article whose feed is gone still gets a section and a reference', () => {
  const draft = collectionDraft({ name: 'Solo' }, [{ id: 1, title: 'Orphan', link: 'https://www.example.org/o' }], () => undefined);
  assert.match(draft.bodyMd, /\[Read at the source\]\(https:\/\/www\.example\.org\/o\)/);
  assert.match(draft.bodyMd, /## References\n\nOrphan\. \(n\.d\.\)\. \*example\.org\*\. https:\/\/www\.example\.org\/o\n$/);
  assert.equal(draft.sources[0].source, null);
});
