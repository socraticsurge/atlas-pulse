// Feed operations behind useFeeds: parse, store, refresh, queue for batch AI,
// and OPML import. No React; every server call goes through api.js.
import * as api from './api.js';
import { getFaviconUrl, canonicalizeUrl } from './helpers.js';
import { getBatchSettings } from './batchSettings.js';
import { parseScope } from '../ai/batch.js';

const REFRESH_CONCURRENCY = 5;

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

/** Fetches a feed's latest items, stores new ones, and queues them for batch AI. */
export async function refreshOne(feed) {
  const feedData = await api.parseFeed(feed.url);
  const { inserted } = await api.bulkInsertArticles(feed.id, firstOf(feedData.items, []).map(toArticle));
  if (inserted > 0) await queueArticlesForBatch(feed.id);
  const updated = await api.patchFeed(feed.id, {
    lastRefreshed: new Date().toISOString(),
    title: firstOf(feedData.title, feed.title),
  });
  return { inserted, updated };
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

/** Sum of the fulfilled values in Promise.allSettled results. */
export function fulfilledTotal(results) {
  return results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value || 0 : 0), 0);
}

/** Refreshes feeds a few at a time; resolves to the total number of new articles. */
export async function refreshInChunks(feeds, refreshFeed) {
  let totalNew = 0;
  for (let i = 0; i < feeds.length; i += REFRESH_CONCURRENCY) {
    const chunk = feeds.slice(i, i + REFRESH_CONCURRENCY);
    totalNew += fulfilledTotal(await Promise.allSettled(chunk.map((f) => refreshFeed(f.id))));
  }
  return totalNew;
}
