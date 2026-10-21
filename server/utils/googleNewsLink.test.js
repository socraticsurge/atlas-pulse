import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeRequestBody, decodingParams, googleNewsArticleId, publisherUrl, urlFromResponse } from './googleNewsLink.js';

const PUBLISHER = 'https://www.wsj.com/tech/ai/anthropic-revenue-growth-ipo-accaf0f1';

// The tag on a Google News article page that carries the decoding params
// (captured 2026-10-21; the signature here is made up).
const articlePage = (id) => `<html><body><c-wiz><div jscontroller="aLI87" data-n-a-id="${id}" data-n-a-ts="1792602246" data-n-a-sg="AbIaSL-test-signature" data-n-dnlg="false"></div></c-wiz></body></html>`;

// A batchexecute response, as captured on 2026-10-21.
const answerFor = (url) => `)]}'\n\n${JSON.stringify([
  ['wrb.fr', 'Fbv4je', JSON.stringify(['garturlres', url, 1]), null, null, null, 'generic'],
  ['di', 10],
  ['af.httprm', 10, '-5540622190401232481', 19],
])}`;

// A fetchText stand-in that answers like Google and records each request.
function googleStub(answer = answerFor(PUBLISHER)) {
  const calls = [];
  const fetchPage = async (url, options = {}) => {
    calls.push({ url, ...options });
    const id = url.split('/rss/articles/')[1];
    return { text: id ? articlePage(id) : answer, url };
  };
  return { calls, fetchPage };
}

test('googleNewsArticleId reads the id from Google News article links only', () => {
  assert.equal(googleNewsArticleId('https://news.google.com/rss/articles/CBMic0FVX3lx_-9?oc=5'), 'CBMic0FVX3lx_-9');
  assert.equal(googleNewsArticleId('https://news.google.com/articles/CBMiabc?hl=en-IN'), 'CBMiabc');
  assert.equal(googleNewsArticleId('https://news.google.com/rss/search?q=AI'), '');
  assert.equal(googleNewsArticleId('https://news.google.com/rss/articles/a.b'), '');
  assert.equal(googleNewsArticleId('https://example.com/rss/articles/CBMiabc'), '');
  assert.equal(googleNewsArticleId('not a url'), '');
});

test('decodingParams finds the signature and timestamp, or null', () => {
  assert.deepEqual(decodingParams(articlePage('CBMiabc')), { signature: 'AbIaSL-test-signature', timestamp: 1792602246 });
  assert.equal(decodingParams('<html>consent page</html>'), null);
  assert.equal(decodingParams('<div data-n-a-sg="x" data-n-a-ts="soon">'), null);
});

test('decodeRequestBody asks Fbv4je for the id with its signature and timestamp', () => {
  const body = decodeRequestBody('CBMiabc', { signature: 'sig', timestamp: 42 });
  const [[[rpc, request, , kind]]] = JSON.parse(new URLSearchParams(body).get('f.req'));
  assert.deepEqual([rpc, kind], ['Fbv4je', 'generic']);
  const [label, , id, timestamp, signature] = JSON.parse(request);
  assert.deepEqual([label, id, timestamp, signature], ['garturlreq', 'CBMiabc', 42, 'sig']);
});

test('urlFromResponse reads the publisher URL, and nothing else', () => {
  assert.equal(urlFromResponse(answerFor(PUBLISHER)), PUBLISHER);
  assert.equal(urlFromResponse(answerFor('javascript:alert(1)')), '');
  assert.equal(urlFromResponse(`)]}'\n\n${JSON.stringify([['di', 10]])}`), '');
  assert.equal(urlFromResponse('<html>Sorry, unusual traffic</html>'), '');
  assert.equal(urlFromResponse(''), '');
});

test('publisherUrl decodes a Google News link in two requests, then from memory', async () => {
  const { calls, fetchPage } = googleStub();
  const link = 'https://news.google.com/rss/articles/CBMiFirst?oc=5';
  assert.equal(await publisherUrl(link, fetchPage), PUBLISHER);
  assert.deepEqual(calls.map((c) => [c.method ?? 'GET', c.url]), [
    ['GET', 'https://news.google.com/rss/articles/CBMiFirst'],
    ['POST', 'https://news.google.com/_/DotsSplashUi/data/batchexecute'],
  ]);
  assert.match(new URLSearchParams(calls[1].body).get('f.req'), /CBMiFirst/);
  assert.equal(await publisherUrl(link, fetchPage), PUBLISHER);
  assert.equal(calls.length, 2);
});

test('publisherUrl leaves other links alone, and falls back when decoding fails', async () => {
  const { calls, fetchPage } = googleStub();
  assert.equal(await publisherUrl('https://www.wsj.com/a', fetchPage), 'https://www.wsj.com/a');
  assert.equal(calls.length, 0);

  const refused = googleStub('<html>Sorry, unusual traffic</html>');
  const link = 'https://news.google.com/rss/articles/CBMiRefused';
  assert.equal(await publisherUrl(link, refused.fetchPage), link);

  const consent = async (url) => ({ text: '<html>consent page</html>', url });
  assert.equal(await publisherUrl('https://news.google.com/rss/articles/CBMiConsent', consent), 'https://news.google.com/rss/articles/CBMiConsent');

  const offline = async () => { throw new Error('fetch failed'); };
  assert.equal(await publisherUrl('https://news.google.com/rss/articles/CBMiOffline', offline), 'https://news.google.com/rss/articles/CBMiOffline');
});

test('a failed decode is not remembered, so the next open tries again', async () => {
  const link = 'https://news.google.com/rss/articles/CBMiRetry';
  assert.equal(await publisherUrl(link, async () => { throw new Error('fetch failed'); }), link);
  assert.equal(await publisherUrl(link, googleStub().fetchPage), PUBLISHER);
});
