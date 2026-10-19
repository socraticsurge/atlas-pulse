import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIssue } from './parseIssue.js';
import { presentation, roleOf } from './rules.js';

const rolesOf = (md) => Object.values(presentation(parseIssue(md)).roles);
const para = (n) => Array.from({ length: n }, (_, i) => `Sentence number ${i} adds a few more words here.`).join(' ');

test('a list under a takeaways heading, or of short items, is a takeaways panel', () => {
  assert.deepEqual(rolesOf('# T\n\nOpen.\n\n## Key Takeaways\n\n- One long point that goes on\n- Two'), ['takeaways']);
  assert.deepEqual(rolesOf('# T\n\nOpen.\n\n## Odds\n\n- a b\n- c d\n- e f'), ['takeaways']);
});

test('a story told in long bullets stays a story', () => {
  const bullets = Array.from({ length: 2 }, () => `- **Item** ${para(4)}`).join('\n');
  assert.deepEqual(rolesOf(`# T\n\nOpen.\n\n## Security & Privacy\n\n${bullets}`), ['story']);
});

test('callouts match whole words only', () => {
  assert.deepEqual(rolesOf('# T\n\nOpen.\n\n## Decision Point\n\nAct now on this.\n\n## AI Agents Gaining Traction\n\nText.\n\n## More\n\nText.'), ['callout', 'story', 'story']);
});

test('long, multi-paragraph sections are essays; a short last line closes; an unheaded short first section introduces', () => {
  const md = `# T\n\nOpen.\n\n---\n\nWelcome to this week.\n\n## Deep\n\n${para(10)}\n\n${para(10)}\n\n${para(10)}\n\n---\n\nSee you next week.`;
  assert.deepEqual(rolesOf(md), ['intro', 'essay', 'closing']);
});

test('roleOf handles a section with no blocks', () => {
  assert.equal(roleOf({ heading: 'Empty', blocks: [], stats: { words: 0, paragraphs: 0, listItems: 0, listShare: 0 } }, 1, 3), 'story');
});
