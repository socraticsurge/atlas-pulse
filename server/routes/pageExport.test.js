import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportFilename, exportPage, printUrl } from './pageExport.js';
import { parseExport } from './studioInput.js';
import { findChrome } from '../utils/pageRenderer.js';

const item = { id: 7, title: 'The Agent Week: “AI” & You!', template: 'quarterly' };

// A response that records what was sent.
function fakeRes() {
  const res = { headers: {}, statusCode: 200 };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.send = (body) => { res.body = body; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}

test('export requests need a format and this machine\u2019s origin', () => {
  assert.deepEqual(parseExport({ format: 'pdf', origin: 'http://localhost:5173/app' }).value, { format: 'pdf', design: undefined, origin: 'http://localhost:5173' });
  assert.match(parseExport({ format: 'gif', origin: 'http://localhost' }).error, /format/);
  assert.match(parseExport({ format: 'png', origin: 'https://evil.example' }).error, /origin/);
  assert.match(parseExport({ format: 'png', design: 'Bad Id', origin: 'http://localhost' }).error, /design/);
});

test('file names and print addresses', () => {
  assert.equal(exportFilename(item, { format: 'pdf' }), 'the-agent-week-ai-you-quarterly.pdf');
  assert.equal(exportFilename(item, { format: 'png', design: 'evening' }), 'the-agent-week-ai-you-evening.png');
  assert.equal(printUrl(item, { origin: 'http://127.0.0.1:4317', design: 'evening' }), 'http://127.0.0.1:4317/print.html?id=7&design=evening');
});

test('an export renders the print page and sends it as a download', async () => {
  let rendered;
  const res = fakeRes();
  await exportPage(item, { format: 'png', origin: 'http://localhost:5173' }, res, {
    findChrome: () => '/chrome',
    renderPage: async (url, format, opts) => { rendered = { url, format, opts }; return Buffer.from('png!'); },
    launch: () => {},
  });
  assert.equal(rendered.url, 'http://localhost:5173/print.html?id=7');
  assert.equal(rendered.opts.executablePath, '/chrome');
  assert.equal(res.headers['Content-Type'], 'image/png');
  assert.match(res.headers['Content-Disposition'], /attachment; filename="the-agent-week-ai-you-quarterly\.png"/);
  assert.equal(res.body.toString(), 'png!');
});

test('no Chrome means 501; a render failure means 500 and the next export can run', async () => {
  const none = fakeRes();
  await exportPage(item, { format: 'pdf', origin: 'http://localhost' }, none, { findChrome: () => null });
  assert.equal(none.statusCode, 501);
  const failed = fakeRes();
  await exportPage(item, { format: 'pdf', origin: 'http://localhost' }, failed, { findChrome: () => '/c', renderPage: async () => { throw new Error('boom'); } });
  assert.equal(failed.statusCode, 500);
  assert.match(failed.body.error, /boom/);
  const next = fakeRes();
  await exportPage(item, { format: 'pdf', origin: 'http://localhost' }, next, { findChrome: () => '/c', renderPage: async () => Buffer.from('ok') });
  assert.equal(next.statusCode, 200);
});

test('a second export while one runs gets 429', async () => {
  let finish;
  const slow = new Promise((resolve) => { finish = resolve; });
  const first = exportPage(item, { format: 'pdf', origin: 'http://localhost' }, fakeRes(), { findChrome: () => '/c', renderPage: () => slow });
  const second = fakeRes();
  await exportPage(item, { format: 'pdf', origin: 'http://localhost' }, second, { findChrome: () => '/c', renderPage: async () => Buffer.from('x') });
  assert.equal(second.statusCode, 429);
  finish(Buffer.from('done'));
  await first;
});

test('findChrome prefers CHROME_PATH, then a standard install', () => {
  assert.equal(findChrome({ env: { CHROME_PATH: '/my/chrome' }, platform: 'linux', exists: (p) => p === '/my/chrome' }), '/my/chrome');
  assert.equal(findChrome({ env: {}, platform: 'linux', exists: (p) => p === '/usr/bin/chromium' }), '/usr/bin/chromium');
  assert.equal(findChrome({ env: {}, platform: 'darwin', exists: () => false }), null);
  assert.match(findChrome({ env: { PROGRAMFILES: 'C:/PF' }, platform: 'win32', exists: (p) => p.includes('chrome.exe') }), /chrome\.exe$/);
});
