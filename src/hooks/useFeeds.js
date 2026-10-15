import { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api.js';
import { getFaviconUrl, canonicalizeUrl } from '../utils/helpers.js';
import { getBatchSettings } from '../utils/batchSettings.js';
import { parseScope } from '../ai/batch.js';

const REFRESH_CONCURRENCY = 5;

// Optional text fields of a feed item, stored as '' when missing.
const OPTIONAL_ITEM_FIELDS = ['content', 'summary', 'author', 'imageUrl'];

// Article record for the server from a parsed feed item.
function toArticle(item) {
  const { link } = item;
  return {
    ...Object.fromEntries(OPTIONAL_ITEM_FIELDS.map((key) => [key, item[key] || ''])),
    guid: item.guid || link,
    canonicalLink: canonicalizeUrl(link) || link || '',
    title: item.title,
    link,
    publishedAt: item.publishedAt || new Date().toISOString(),
  };
}

// Whether new articles in `feedId` fall inside the batch AI scope.
async function inBatchScope(scope, feedId) {
  const { type, id } = parseScope(scope);
  if (type === 'all') return true;
  if (type === 'feed') return id === feedId;
  if (type !== 'folder' || id === null) return false;
  const feed = await api.fetchFeed(feedId).catch(() => null);
  return feed?.folderId === id;
}

// Queues a feed's new articles for batch AI, up to the per-cycle limit.
async function queueArticlesForBatch(feedId) {
  const settings = getBatchSettings();
  if (!settings.enabled || !(await inBatchScope(settings.scope, feedId))) return;

  const queueCount = await api.fetchQueueCount().catch(() => 0);
  const remaining = settings.maxPerCycle - queueCount;
  if (remaining <= 0) return;

  const candidates = await api.fetchUnprocessedForFeed(feedId, remaining).catch(() => []);
  if (candidates.length === 0) return;
  await api.bulkUpdateArticles(candidates.map(a => a.id), { aiStatus: 'queued' }).catch(() => {});
}

// Parses and stores a new feed with its current articles; resolves to the saved feed.
async function createFeed(feedUrl, folderId) {
  const feedData = await api.parseFeed(feedUrl);
  const saved = await api.storeFeed({
    title: feedData.title,
    url: feedUrl,
    siteUrl: feedData.link || '',
    description: feedData.description || '',
    favicon: getFaviconUrl(feedData.link),
    folderId,
    lastRefreshed: new Date().toISOString(),
  });
  if (feedData.items?.length > 0) {
    await api.bulkInsertArticles(saved.id, feedData.items.map(toArticle)).catch(() => {});
  }
  return saved;
}

// Fetches a feed's latest items, stores new ones, and queues them for batch AI.
async function refreshOne(feed) {
  const feedData = await api.parseFeed(feed.url);
  const { inserted } = await api.bulkInsertArticles(feed.id, (feedData.items || []).map(toArticle));
  if (inserted > 0) await queueArticlesForBatch(feed.id);
  const updated = await api.patchFeed(feed.id, {
    lastRefreshed: new Date().toISOString(),
    title: feedData.title || feed.title,
  });
  return { inserted, updated };
}

// Stores one OPML entry (creating its folder if needed); resolves to whether it was saved.
async function importFeed(feed) {
  let folderId = null;
  if (feed.folderName) {
    const folder = await api.findOrCreateFolder(feed.folderName).catch(() => null);
    folderId = folder?.id ?? null;
  }
  const saved = await api.storeFeed({
    title: feed.title,
    url: feed.url,
    siteUrl: feed.siteUrl || '',
    description: '',
    favicon: getFaviconUrl(feed.siteUrl || feed.url),
    folderId,
    lastRefreshed: null,
  }).catch(() => null);
  return Boolean(saved);
}

// Imports the OPML entries not already subscribed; resolves to how many were saved.
async function importNewFeeds(parsedFeeds, feeds) {
  const existingUrls = new Set(feeds.map(f => f.url));
  let importedCount = 0;
  for (const feed of parsedFeeds) {
    if (existingUrls.has(feed.url) || !(await importFeed(feed))) continue;
    existingUrls.add(feed.url);
    importedCount++;
  }
  return importedCount;
}

// Refreshes feeds a few at a time; resolves to the total number of new articles.
async function refreshInChunks(feeds, refreshFeed) {
  let totalNew = 0;
  for (let i = 0; i < feeds.length; i += REFRESH_CONCURRENCY) {
    const chunk = feeds.slice(i, i + REFRESH_CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(f => refreshFeed(f.id)));
    for (const r of results) totalNew += r.status === 'fulfilled' ? r.value || 0 : 0;
  }
  return totalNew;
}

// Refresh and OPML import for the current feed list.
function useFeedSync({ feeds, setFeeds, replaceFeed, onDataChanged }) {
  const refreshFeed = useCallback(async (feedId) => {
    const feed = feeds.find(f => f.id === feedId);
    if (!feed) return 0;

    try {
      const { inserted, updated } = await refreshOne(feed);
      replaceFeed(updated);
      return inserted;
    } catch (err) {
      console.error(`Failed to refresh feed ${feed.title}:`, err);
      return 0;
    }
  }, [feeds, replaceFeed]);

  const refreshAllFeeds = useCallback(async () => {
    if (feeds.length === 0) return 0;
    const totalNew = await refreshInChunks(feeds, refreshFeed);
    if (totalNew > 0) onDataChanged?.();
    return totalNew;
  }, [feeds, refreshFeed, onDataChanged]);

  const importFeedsFromOPML = useCallback(async (parsedFeeds) => {
    const importedCount = await importNewFeeds(parsedFeeds, feeds);
    if (importedCount > 0) {
      setFeeds(await api.fetchFeeds().catch(() => feeds));
      onDataChanged?.();
    }
    return importedCount;
  }, [feeds, setFeeds, onDataChanged]);

  return { refreshFeed, refreshAllFeeds, importFeedsFromOPML };
}

export function useFeeds(onDataChanged) {
  const [feeds, setFeeds] = useState([]);

  useEffect(() => {
    api.fetchFeeds().then(setFeeds).catch(() => {});
  }, []);

  const replaceFeed = useCallback((updated) => {
    setFeeds(prev => prev.map(f => f.id === updated.id ? updated : f));
  }, []);

  const addFeed = useCallback(async (feedUrl, folderId = null) => {
    if (feeds.some(f => f.url === feedUrl)) throw new Error('This feed is already added');

    const saved = await createFeed(feedUrl, folderId);
    setFeeds(prev => [...prev, saved]);
    onDataChanged?.();
    return saved.id;
  }, [feeds, onDataChanged]);

  const removeFeed = useCallback(async (feedId) => {
    await api.removeFeed(feedId);
    setFeeds(prev => prev.filter(f => f.id !== feedId));
    onDataChanged?.();
  }, [onDataChanged]);

  const updateFeedFolder = useCallback(async (feedId, folderId) => {
    replaceFeed(await api.patchFeed(feedId, { folderId }));
  }, [replaceFeed]);

  const sync = useFeedSync({ feeds, setFeeds, replaceFeed, onDataChanged });
  return { feeds, addFeed, removeFeed, updateFeedFolder, ...sync };
}
