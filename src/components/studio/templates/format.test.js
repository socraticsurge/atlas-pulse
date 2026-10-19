import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameLinks, present, siteOf, typeset } from './format.js';

test('typesetting curls quotes and apostrophes and dashes spaced hyphens', () => {
  assert.equal(typeset('The "side hustle" isn\'t it - really'), 'The “side hustle” isn’t it – really');
  assert.equal(typeset('He said "done." and \'quoted\''), 'He said “done.” and ‘quoted’');
  assert.equal(typeset('self-directed, e-mail'), 'self-directed, e-mail');
});

test('typesetting leaves link targets alone', () => {
  assert.equal(typeset('[x](https://a.com/b-c)'), '[x](https://a.com/b-c)');
});

test('links whose text is an address show the site name', () => {
  assert.equal(nameLinks('See [dev.to/brian_a/x-y](https://dev.to/brian_a/x-y).'), 'See [dev.to](https://dev.to/brian_a/x-y).');
  assert.equal(nameLinks('[Read more](https://wired.com/x)'), '[Read more](https://wired.com/x)', 'real link text is kept');
});

test('bare addresses become named links, keeping trailing punctuation', () => {
  assert.equal(nameLinks('Source: https://www.openai.com/index/a.'), 'Source: [openai.com](https://www.openai.com/index/a).');
  assert.equal(nameLinks('Source: dev.to/tom/post-1'), 'Source: [dev.to](https://dev.to/tom/post-1)');
  assert.equal(nameLinks('Node.js and e.g. U.S. stay text'), 'Node.js and e.g. U.S. stay text');
});

test('siteOf and present', () => {
  assert.equal(siteOf('https://www.wired.com/story'), 'wired.com');
  assert.equal(siteOf('not a url at all'), '');
  assert.equal(present('"Hi" https://a.com/x'), '“Hi” [a.com](https://a.com/x)');
  assert.equal(present(undefined), '');
});
