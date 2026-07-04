import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicHttpUrl, safeFetch } from './urlGuard.js';

afterEach(() => mock.restoreAll());

test('assertPublicHttpUrl rejects loopback, private, link-local, and non-http URLs', async () => {
  const blocked = [
    'http://127.0.0.1/',
    'http://169.254.169.254/latest/meta-data/', // cloud metadata
    'http://10.0.0.1/',
    'http://192.168.1.1/',
    'http://172.16.0.1/',
    'http://[::1]/',
    'file:///etc/passwd',
    'ftp://example.com/',
  ];
  for (const url of blocked) {
    await assert.rejects(() => assertPublicHttpUrl(url), `expected ${url} to be rejected`);
  }
});

test('assertPublicHttpUrl allows a public literal IP', async () => {
  const url = await assertPublicHttpUrl('http://93.184.216.34/');
  assert.equal(url.hostname, '93.184.216.34');
});

// The core regression guard: a public URL must not be able to redirect the
// server into a private/metadata address. If someone removes the per-hop
// re-validation from safeFetch, this test fails.
test('safeFetch blocks a redirect that points at a private address', async () => {
  mock.method(globalThis, 'fetch', async () =>
    new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } }));
  await assert.rejects(
    () => safeFetch('http://93.184.216.34/'), // literal public IP — no DNS needed
    /Blocked private or loopback address/,
  );
});

test('safeFetch returns a non-redirect response unchanged', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('ok', { status: 200 }));
  const res = await safeFetch('http://93.184.216.34/');
  assert.equal(res.status, 200);
});

test('safeFetch follows a redirect to another public address', async () => {
  let calls = 0;
  mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return calls === 1
      ? new Response(null, { status: 301, headers: { location: 'http://93.184.216.35/' } })
      : new Response('final', { status: 200 });
  });
  const res = await safeFetch('http://93.184.216.34/');
  assert.equal(res.status, 200);
  assert.equal(calls, 2);
});
