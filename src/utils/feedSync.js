// Feed operations behind useFeeds: parse, store, refresh, queue for batch AI,
// and OPML import. No React; every server call goes through api.js.
import * as api from './api.js';
import { getFaviconUrl, canonicalizeUrl } from './helpers.js';
import { getBatchSettings } from './batchSettings.js';
import { parseScope } from '../ai/batch.js';

const REFRESH_CONCURRENCY = 5;
// Keeps each bulk-insert request well under the server's JSON body limit.
const INSERT_CHUNK_BYTES = 1024 * 1024;

// Optional text fields of a feed item, stored as '' when missing.
const OPTIONAL_ITEM_FIELDS = ['content', 'summary', 'author', 'imageUrl'];

/** Same as `a || b || …`: the first truthy value, else the last value. */
export function firstOf(...values) {
  return values.find(Boolean) ?? values[values.length - 1];
}

const orEmpty = (value) => firstOf(value, '');

/** Article record for the server from a parsed feed item. */
export function toArticle(item) {
  const { link } = item;
  return {
    ...Object.fromEntries(OPTIONAL_ITEM_FIELDS.map((key) => [key, orEmpty(item[key])])),
    guid: firstOf(item.guid, link),
    canonicalLink: firstOf(canonicalizeUrl(link), link, ''),
    title: item.title,
    link,
    publishedAt: firstOf(item.publishedAt, new Date().toISOString()),
  };
}

async function feedFolderId(feedId) {
  const feed = await api.fetchFeed(feedId).catch(() => null);
  return feed?.folderId;
}

// One check per batch scope type; unknown types are out of scope.
const SCOPE_CHECKS = {
  all: async () => true,
  feed: async (id, feedId) => id === feedId,
  folder: async (id, feedId) => id !== null && (await feedFolderId(feedId)) === id,
};

/** Whether new articles in `feedId` fall inside the batch AI scope. */
export async function inBatchScope(scope, feedId) {
  const { type, id } = parseScope(scope);
  const check = SCOPE_CHECKS[type];
  return check ? check(id, feedId) : false;
}

// How many of this feed's articles may still be queued this cycle.
async function batchSlots(feedId) {
  const settings = getBatchSettings();
  if (!settings.enabled || !(await inBatchScope(settings.scope, feedId))) return 0;
  const queueCount = await api.fetchQueueCount().catch(() => 0);
  return settings.maxPerCycle - queueCount;
}

/** Queues a feed's new articles for batch AI, up to the per-cycle limit. */
export async function queueArticlesForBatch(feedId) {
  const remaining = await batchSlots(feedId);
  if (remaining <= 0) return;
  const candidates = await api.fetchUnprocessedForFeed(feedId, remaining).catch(() => []);
  if (candidates.length === 0) return;
  await api.bulkUpdateArticles(candidates.map((a) => a.id), { aiStatus: 'queued' }).catch(() => {});
}

/** Parses and stores a new feed with its current articles; resolves to the saved feed. */
export async function createFeed(feedUrl, folderId) {
  const feedData = await api.parseFeed(feedUrl);
  const saved = await api.storeFeed({
    title: feedData.title,
    url: feedUrl,
    siteUrl: orEmpty(feedData.link),
    description: orEmpty(feedData.description),
    favicon: getFaviconUrl(feedData.link),
    folderId,
    lastRefreshed: new Date().toISOString(),
  });
  if (feedData.items?.length > 0) {
    await api.bulkInsertArticles(saved.id, feedData.items.map(toArticle)).catch(() => {});
  }
  return saved;
}

/**
 * Splits items into consecutive chunks whose JSON stays under maxBytes. An item
 * larger than maxBytes on its own gets a chunk to itself.
 */
export function chunkBySize(items, maxBytes) {
  const chunks = [];
  let current = [];
  let size = 0;
  for (const item of items) {
    const itemSize = JSON.stringify(item).length;
    if (current.length > 0 && size + itemSize > maxBytes) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += itemSize;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

// Stores articles in size-bounded requests; resolves to how many were new.
async function insertInChunks(feedId, articles) {
  let inserted = 0;
  for (const chunk of chunkBySize(articles, INSERT_CHUNK_BYTES)) {
    inserted += (await api.bulkInsertArticles(feedId, chunk)).inserted;
  }
  return inserted;
}

/** Fetches a feed's latest items, stores new ones, and queues them for batch AI. */
export async function refreshOne(feed) {
  const feedData = await api.parseFeed(feed.url);
  const inserted = await insertInChunks(feed.id, firstOf(feedData.items, []).map(toArticle));
  if (inserted > 0) await queueArticlesForBatch(feed.id);
  const updated = await api.patchFeed(feed.id, {
    lastRefreshed: new Date().toISOString(),
    title: firstOf(feedData.title, feed.title),
    lastError: null, // a success clears an earlier failure
    lastErrorAt: null,
  });
  return { inserted, updated };
}

const ERROR_MAX = 300;

/** Remembers why a feed failed to refresh (shown in the sidebar); resolves to the updated feed. */
export async function recordRefreshError(feed, error) {
  const message = String(error?.message || error).slice(0, ERROR_MAX);
  return api.patchFeed(feed.id, { lastError: message, lastErrorAt: new Date().toISOString() });
}

async function folderIdFor(folderName) {
  if (!folderName) return null;
  const folder = await api.findOrCreateFolder(folderName).catch(() => null);
  return folder?.id ?? null;
}

// Stores one OPML entry (creating its folder if needed); resolves to the saved feed, or null.
async function importFeed(feed) {
  return api.storeFeed({
    title: feed.title,
    url: feed.url,
    siteUrl: orEmpty(feed.siteUrl),
    description: '',
    favicon: getFaviconUrl(firstOf(feed.siteUrl, feed.url)),
    folderId: await folderIdFor(feed.folderName),
    lastRefreshed: null,
  }).catch(() => null);
}

/** Imports the OPML entries not already subscribed; resolves to the saved feeds. */
export async function importNewFeeds(parsedFeeds, feeds, store = importFeed) {
  const existingUrls = new Set(feeds.map((f) => f.url));
  const saved = [];
  for (const feed of parsedFeeds) {
    if (existingUrls.has(feed.url)) continue;
    const stored = await store(feed);
    if (!stored) continue;
    existingUrls.add(feed.url);
    saved.push(stored);
  }
  return saved;
}

/**
 * Adds Promise.allSettled results of refreshFeed ({ inserted, failed }) to a
 * running tally { inserted, failed: [feed titles] }. A rejection counts as a
 * failure of that feed.
 */
export function tallyRefreshes(tally, results, chunk) {
  results.forEach((r, i) => {
    const value = r.status === 'fulfilled' ? r.value : { inserted: 0, failed: true };
    tally.inserted += value?.inserted || 0;
    if (value?.failed) tally.failed.push(chunk[i].title);
  });
  return tally;
}

/** Refreshes feeds a few at a time; resolves to { inserted, failed: [feed titles] }. */
export async function refreshInChunks(feeds, refreshFeed) {
  const tally = { inserted: 0, failed: [] };
  for (let i = 0; i < feeds.length; i += REFRESH_CONCURRENCY) {
    const chunk = feeds.slice(i, i + REFRESH_CONCURRENCY);
    tallyRefreshes(tally, await Promise.allSettled(chunk.map((f) => refreshFeed(f.id))), chunk);
  }
  return tally;
}

const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`;

/** The toast after refreshing every feed: new articles, and which feeds failed. */
export function refreshSummary({ inserted, failed }) {
  const found = `Refreshed: ${plural(inserted, 'new article')}`;
  if (failed.length === 0) return { message: found, type: 'success' };
  const which = failed.length <= 2 ? failed.join(' and ') : `${failed.length} feeds`;
  return { message: `${found}. ${which} couldn't be refreshed; the sidebar shows why.`, type: 'error' };
}
