import { fetchText } from './fetchText.js';

// Google News feeds link every item to news.google.com/rss/articles/<id>, a
// page that sends the browser on with script, so it holds no article to
// extract. Google's own pages turn the id into the publisher's URL in two
// steps: the article page carries a signature and a timestamp for the id,
// and the batchexecute endpoint trades the three for the URL. Neither step is
// documented, so any failure means "can't decode" and the caller goes on
// with the link it had. Both requests go through fetchText, so safeFetch and
// its limits apply as for any other page.

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ARTICLE_PATH = /^\/(?:rss\/)?articles\/([A-Za-z0-9_-]+)$/;
const BATCH_URL = 'https://news.google.com/_/DotsSplashUi/data/batchexecute';
const TIMEOUT_MS = 10000;

/** The article id in a Google News article link, or ''. */
export function googleNewsArticleId(rawUrl) {
  const url = URL.parse(rawUrl);
  if (url?.hostname !== 'news.google.com') return '';
  return ARTICLE_PATH.exec(url.pathname)?.[1] ?? '';
}

/** The signature and timestamp an article page carries for its id, or null. */
export function decodingParams(html) {
  const signature = /data-n-a-sg="([^"]+)"/.exec(html)?.[1];
  const timestamp = /data-n-a-ts="(\d+)"/.exec(html)?.[1];
  return signature && timestamp ? { signature, timestamp: Number(timestamp) } : null;
}

/** The form body that asks batchexecute for an article's URL. */
export function decodeRequestBody(id, { signature, timestamp }) {
  const context = [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0];
  const request = JSON.stringify(['garturlreq', context, id, timestamp, signature]);
  return new URLSearchParams({ 'f.req': JSON.stringify([[['Fbv4je', request, null, 'generic']]]) }).toString();
}

const isWebUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);

/**
 * The publisher URL in a batchexecute response, or ''. The response is
 * `)]}'`, a blank line, then JSON rows; the Fbv4je row holds, as a JSON
 * string, ["garturlres", "<url>", …].
 */
export function urlFromResponse(text) {
  try {
    const rows = JSON.parse(text.slice(text.indexOf('\n\n') + 2));
    const row = rows.find(([kind, rpc]) => kind === 'wrb.fr' && rpc === 'Fbv4je');
    const [label, url] = JSON.parse(row[2]);
    return label === 'garturlres' && isWebUrl(url) ? url : '';
  } catch {
    return '';
  }
}

// Decoded ids, newest last; an id always points at the same article.
const decoded = new Map();
const CACHE_LIMIT = 500;

function remember(id, url) {
  decoded.set(id, url);
  if (decoded.size > CACHE_LIMIT) decoded.delete(decoded.keys().next().value);
}

async function decode(id, fetchPage) {
  const page = await fetchPage(`https://news.google.com/rss/articles/${id}`, { headers: { 'User-Agent': USER_AGENT }, timeoutMs: TIMEOUT_MS });
  const params = decodingParams(page.text);
  if (!params) return '';
  const answer = await fetchPage(BATCH_URL, {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: decodeRequestBody(id, params),
    timeoutMs: TIMEOUT_MS,
  });
  return urlFromResponse(answer.text);
}

/**
 * The publisher's URL for a Google News article link; any other URL, or a
 * link that can't be decoded, comes back unchanged. `fetchPage` is
 * fetchText's signature (tests pass a stub).
 */
export async function publisherUrl(rawUrl, fetchPage = fetchText) {
  const id = googleNewsArticleId(rawUrl);
  if (!id) return rawUrl;
  if (decoded.has(id)) return decoded.get(id);
  const url = await decode(id, fetchPage).catch(() => '');
  if (url) remember(id, url);
  return url || rawUrl;
}
