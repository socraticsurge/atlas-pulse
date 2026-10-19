import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIssue } from './parseIssue.js';

const md = `## Executive Briefing: Open Source AI

**Date:** October 16, 2026

**Summary:** Hacktoberfest showcased open-source AI tools. **Decision Point:** Assess the impact on talent.

---

## Key Takeaways:

* **Open source wins:** Power shifts to individuals.
* **Markets grow:** Listing tools address pain.

## Deeper Dive

These projects are fueled by autonomy.

**Whose Task is This?** It’s a societal shift.

**Adlerian Read:**

George Herbert Mead’s concept is relevant here.`;

test('headline, meta lines and the labelled opening come off the front', () => {
  const issue = parseIssue(md);
  assert.equal(issue.headline, 'Executive Briefing: Open Source AI');
  assert.deepEqual(issue.meta, [{ label: 'Date', md: 'October 16, 2026' }]);
  assert.equal(issue.standfirst.label, 'Summary');
  assert.match(issue.standfirst.md, /^Hacktoberfest/);
});

test('a bold label mid-paragraph starts its own block; bold-only lines are headings', () => {
  const issue = parseIssue(md);
  assert.deepEqual(issue.sections.map((s) => s.heading), [null, 'Key Takeaways', 'Deeper Dive', 'Adlerian Read']);
  assert.equal(issue.sections[0].blocks[0].label, 'Decision Point');
  assert.deepEqual(issue.sections[1].blocks[0].items.map((i) => i.label), ['Open source wins', 'Markets grow']);
  assert.equal(issue.sections[2].blocks[1].label, 'Whose Task is This?');
});

test('section stats count words, paragraphs and list share', () => {
  const [, list, deep] = parseIssue(md).sections;
  assert.equal(list.stats.listItems, 2);
  assert.equal(list.stats.listShare, 1);
  assert.equal(deep.stats.paragraphs, 2);
});

test('without a heading the fallback title is the headline; nothing is dropped', () => {
  const issue = parseIssue('Just one paragraph.\n\nAnd another.', 'Fallback');
  assert.equal(issue.headline, 'Fallback');
  assert.equal(issue.standfirst.md, 'Just one paragraph.');
  assert.equal(issue.sections[0].blocks[0].md, 'And another.');
  assert.deepEqual(parseIssue('').sections, []);
});
