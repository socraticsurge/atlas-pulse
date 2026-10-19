import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocalHostname, localOrigin } from './loopback.js';

test('loopback hostnames', () => {
  for (const host of ['localhost', '127.0.0.1', '::1', 'app.localhost']) assert.equal(isLocalHostname(host), true, host);
  for (const host of ['example.com', 'localhost.example.com', '10.0.0.1']) assert.equal(isLocalHostname(host), false, host);
});

test('localOrigin keeps only http(s) origins on this machine', () => {
  assert.equal(localOrigin('http://localhost:5173/some/path'), 'http://localhost:5173');
  assert.equal(localOrigin('http://127.0.0.1:4317'), 'http://127.0.0.1:4317');
  assert.equal(localOrigin('https://evil.example'), null);
  assert.equal(localOrigin('file:///etc/passwd'), null);
  assert.equal(localOrigin('javascript:alert(1)'), null);
  assert.equal(localOrigin(undefined), null);
});
