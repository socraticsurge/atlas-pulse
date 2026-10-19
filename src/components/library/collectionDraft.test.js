import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionDraft, DRAFT_MAX_ARTICLES } from './collectionDraft.js';

const sourceOf = () => 'Field Notes';

test('a draft has the collection as headline and one section per article', () => {
  const draft = collectionDraft(
    { name: 'Local-first stack', description: 'Databases that ship inside the app' },
    [
      { id: 1, title: 'PGlite in the browser', note: 'could replace our SQLite server', excerpt: 'Postgres,\n embedded.', link: 'https://n.example/a' },
      { id: 2, title: 'No note', note: null, excerpt: '', link: null },
    ],
    sourceOf,
  );
  assert.equal(draft.kind, 'newsletter');
  assert.equal(draft.title, 'Local-first stack');
  assert.equal(draft.bodyMd, [
    '# Local-first stack',
    'Databases that ship inside the app',
    '## PGlite in the browser\n\n**Why it matters:** could replace our SQLite server\n\nPostgres, embedded.\n\n[Read at Field Notes](https://n.example/a)',
    '## No note\n\n**Why it matters:** _Your take here._',
  ].join('\n\n') + '\n');
  assert.deepEqual(draft.sources[0], { articleId: 1, url: 'https://n.example/a', title: 'PGlite in the browser', source: 'Field Notes' });
});

test('without a description the opening asks for one; long collections are capped', () => {
  const many = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, title: `A${i}` }));
  const draft = collectionDraft({ name: 'Evals' }, many, sourceOf);
  assert.match(draft.bodyMd, /^# Evals\n\nA draft from your Evals collection\. Write the opening here\./);
  assert.equal(draft.sources.length, DRAFT_MAX_ARTICLES);
});
