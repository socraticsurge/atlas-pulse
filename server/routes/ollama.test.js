import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnOllama } from './ollama.js';

test('a missing ollama binary is a rejected promise, not a server crash', async () => {
  // Before, spawn() errors were emitted as an unhandled 'error' event, which
  // terminated the process; reaching the assertion at all proves otherwise.
  await assert.rejects(spawnOllama('/nonexistent/path/to/ollama'), /ENOENT/);
});
