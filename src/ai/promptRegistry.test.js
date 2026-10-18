import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getPrompt, PROMPTS, savePrompt } from './promptRegistry.js';
import { getLimit, saveLimit } from './limits.js';
import { multiArticleMessages } from './multiArticle.js';
import { BASE_SUMMARY, NEWSLETTER_STYLES } from './prompts.js';

// In-memory localStorage for the registries.
beforeEach(() => {
  const data = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) },
  });
});

test('every prompt has a unique id and default text', () => {
  assert.equal(new Set(PROMPTS.map((p) => p.id)).size, PROMPTS.length);
  for (const p of PROMPTS) assert.ok(p.defaultText.length > 20, p.id);
});

test('an edit replaces the default; empty or default text goes back to it', () => {
  assert.equal(getPrompt('summary'), BASE_SUMMARY);
  savePrompt('summary', 'Two sentences, please.');
  assert.equal(getPrompt('summary'), 'Two sentences, please.');
  savePrompt('summary', '   ');
  assert.equal(getPrompt('summary'), BASE_SUMMARY);
  savePrompt('summary', BASE_SUMMARY);
  assert.deepEqual(JSON.parse(localStorage.getItem('atlas-pulse-prompts')), {});
});

test('newsletter styles are filled into the edited newsletter prompt', () => {
  savePrompt('newsletter', 'Newsletter. {style} End.');
  savePrompt('newsletter-roundup', 'Chatty roundup.');
  const system = (template) => multiArticleMessages({ operation: 'newsletter', template, articles: [] }, 100, {})[0].content;
  assert.ok(system('roundup').startsWith('Newsletter. Chatty roundup. End.'));
  assert.ok(system('nonsense').startsWith(`Newsletter. ${NEWSLETTER_STYLES.digest} End.`));
});

test('limits use the default until edited, and stay within their range', () => {
  assert.equal(getLimit('article'), 6000);
  saveLimit('article', 12000);
  assert.equal(getLimit('article'), 12000);
  saveLimit('article', 5);
  assert.equal(getLimit('article'), 1000);
  saveLimit('article', null);
  assert.equal(getLimit('article'), 6000);
});
