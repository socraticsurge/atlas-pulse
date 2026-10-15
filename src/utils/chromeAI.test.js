import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fitToNanoContext, streamNanoChat } from './chromeAI.js';

// Minimal stand-in for Chrome's LanguageModel: 1 token per 4 characters.
function installFakeModel({ contextWindow = 4000, chunks = ['Hello', ' world'], promptError = null } = {}) {
  const sessions = [];
  globalThis.self = globalThis;
  globalThis.LanguageModel = {
    availability: async () => 'available',
    create: async ({ initialPrompts = [] } = {}) => {
      const tokens = (text) => Math.ceil(text.length / 4);
      const session = {
        contextWindow,
        contextUsage: initialPrompts.reduce((n, m) => n + tokens(m.content), 0),
        destroyed: false,
        measureContextUsage: async (text) => tokens(text),
        promptStreaming: () => {
          if (promptError) throw promptError;
          return (async function* () { yield* chunks; })();
        },
        destroy() { this.destroyed = true; },
      };
      sessions.push(session);
      return session;
    },
  };
  return sessions;
}

const article = 'x'.repeat(5000);
const buildUser = (n) => Array.from({ length: 15 }, () => article.slice(0, n)).join('\n');

beforeEach(() => { delete globalThis.LanguageModel; });

test('keeps the full limit when everything fits', async () => {
  const sessions = installFakeModel({ contextWindow: 20000 });
  const result = await fitToNanoContext('system', buildUser, { maxChars: 1200 });
  assert.deepEqual(result, { chars: 1200, trimmed: false });
  assert.ok(sessions.every((s) => s.destroyed), 'measuring session is released');
});

test('shortens every article evenly until the prompt fits', async () => {
  installFakeModel({ contextWindow: 4000 });
  const { chars, trimmed } = await fitToNanoContext('system', buildUser, { maxChars: 1200 });
  assert.equal(trimmed, true);
  assert.ok(chars < 1200 && chars >= 200, `chars=${chars}`);
  const budget = 4000 - Math.ceil('system'.length / 4) - 1536;
  assert.ok(Math.ceil(buildUser(chars).length / 4) <= budget, 'result fits the budget');
});

test('reports a clear error when even the minimum does not fit', async () => {
  installFakeModel({ contextWindow: 1600 });
  await assert.rejects(
    fitToNanoContext('system', buildUser, { maxChars: 1200 }),
    /too long for Gemini Nano/,
  );
});

test('streams chunks from the model', async () => {
  installFakeModel({ chunks: ['A concise summary ', 'of the article.'] });
  let out = '';
  for await (const t of streamNanoChat([{ role: 'system', content: 's' }, { role: 'user', content: 'u' }])) out += t;
  assert.equal(out, 'A concise summary of the article.');
});

test("detects Chromium's model-less stub instead of echoing the prompt", async () => {
  installFakeModel({ chunks: ['On-device model is not available in Chromium, ', 'this API is just echoing back the input'] });
  const run = async () => { for await (const _ of streamNanoChat([{ role: 'user', content: 'u' }])) { /* drain */ } };
  await assert.rejects(run, /needs Google Chrome/);
});

test('turns a context overflow into a readable error', async () => {
  const quota = Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
  installFakeModel({ promptError: quota });
  const run = async () => { for await (const _ of streamNanoChat([{ role: 'user', content: 'u' }])) { /* drain */ } };
  await assert.rejects(run, /too long for Gemini Nano/);
});
