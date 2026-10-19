import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postChatWithoutThinking } from './ai.js';

// A stand-in for Ollama's /api/chat that records the bodies it gets.
function fakeOllama(answer) {
  const bodies = [];
  const post = async (body) => { bodies.push(body); return answer(body); };
  return { post, bodies };
}

const request = { model: 'qwen3.5:4b', messages: [{ role: 'user', content: 'hi' }], stream: true };

test('chat asks Ollama for the answer without the reasoning', async () => {
  const ollama = fakeOllama(() => new Response('{}', { status: 200 }));
  const res = await postChatWithoutThinking(request, ollama.post);
  assert.equal(res.status, 200);
  assert.deepEqual(ollama.bodies, [{ ...request, think: false }]);
});

test('an Ollama that refuses think for the model gets the plain request', async () => {
  const ollama = fakeOllama((body) => (body.think === false
    ? new Response('{"error":"\\"llama2\\" does not support thinking"}', { status: 400 })
    : new Response('{}', { status: 200 })));
  const res = await postChatWithoutThinking(request, ollama.post);
  assert.equal(res.status, 200);
  assert.deepEqual(ollama.bodies.map((b) => b.think), [false, undefined]);
});

test('other errors come back as they were, without a retry', async () => {
  const ollama = fakeOllama(() => new Response('model "nope" not found', { status: 400 }));
  const res = await postChatWithoutThinking(request, ollama.post);
  assert.equal(res.status, 400);
  assert.equal(await res.text(), 'model "nope" not found');
  assert.equal(ollama.bodies.length, 1);
});
