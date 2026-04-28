import { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api.js';
import { getFaviconUrl, canonicalizeUrl } from '../utils/helpers.js';
import { getBatchSettings } from '../utils/batchSettings.js';

async function queueArticlesForBatch(feedId) {
  const settings = getBatchSettings();
  if (!settings.enabled) return;

  const [scopeType, scopeIdStr] = (settings.scope || 'all').split(':');
  const scopeId = scopeIdStr ? parseInt(scopeIdStr, 10) : null;

  let shouldQueue = false;
  if (scopeType === 'all') {
    shouldQueue = true;
  } else if (scopeType === 'feed' && scopeId === feedId) {
    shouldQueue = true;
  } else if (scopeType === 'folder' && scopeId !== null) {
    const feed = await api.fetchFeed(feedId).catch(() => null);
    shouldQueue = feed?.folderId === scopeId;
  }

  if (!shouldQueue) return;

  const queueCount = await api.fetchQueueCount().catch(() => 0);
  const remaining = settings.maxPerCycle - queueCount;
  if (remaining <= 0) return;

  const candidates = await api.fetchUnprocessedForFeed(feedId, remaining).catch(() => []);
  if (candidates.length === 0) return;
  await api.bulkUpdateArticles(candidates.map(a => a.id), { aiStatus: 'queued' }).catch(() => {});
}

export function useFeeds(onDataChanged) {
  const [feeds, setFeeds] = useState([]);

  useEffect(() => {
    api.fetchFeeds().then(setFeeds).catch(() => {});
  }, []);

  const addFeed = useCallback(async (feedUrl, folderId = null) => {
    const existing = feeds.find(f => f.url === feedUrl);
    if (existing) throw new Error('This feed is already added');

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

    setFeeds(prev => [...prev, saved]);

    if (feedData.items?.length > 0) {
      const articles = feedData.items.map(item => ({
        guid: item.guid || item.link,
        canonicalLink: canonicalizeUrl(item.link) || item.link || '',
        title: item.title,
        link: item.link,
        content: item.content || '',
        summary: item.summary || '',
        author: item.author || '',
        publishedAt: item.publishedAt || new Date().toISOString(),
        imageUrl: item.imageUrl || '',
      }));
      await api.bulkInsertArticles(saved.id, articles).catch(() => {});
    }

    onDataChanged?.();
    return saved.id;
  }, [feeds, onDataChanged]);

  const removeFeed = useCallback(async (feedId) => {
    await api.removeFeed(feedId);
    setFeeds(prev => prev.filter(f => f.id !== feedId));
    onDataChanged?.();
  }, [onDataChanged]);

  const updateFeedFolder = useCallback(async (feedId, folderId) => {
    const updated = await api.patchFeed(feedId, { folderId });
    setFeeds(prev => prev.map(f => f.id === feedId ? updated : f));
  }, []);

  const refreshFeed = useCallback(async (feedId) => {
    const feed = feeds.find(f => f.id === feedId);
    if (!feed) return 0;

    try {
      const feedData = await api.parseFeed(feed.url);

      const articles = (feedData.items || []).map(item => ({
        guid: item.guid || item.link,
        canonicalLink: canonicalizeUrl(item.link) || item.link || '',
        title: item.title,
        link: item.link,
        content: item.content || '',
        summary: item.summary || '',
        author: item.author || '',
        publishedAt: item.publishedAt || new Date().toISOString(),
        imageUrl: item.imageUrl || '',
      }));

      const { inserted } = await api.bulkInsertArticles(feedId, articles);

      if (inserted > 0) await queueArticlesForBatch(feedId);

      const updated = await api.patchFeed(feedId, {
        lastRefreshed: new Date().toISOString(),
        title: feedData.title || feed.title,
      });
      setFeeds(prev => prev.map(f => f.id === feedId ? updated : f));

      return inserted;
    } catch (err) {
      console.error(`Failed to refresh feed ${feed.title}:`, err);
      return 0;
    }
  }, [feeds]);

  const refreshAllFeeds = useCallback(async () => {
    if (feeds.length === 0) return 0;
    const CONCURRENCY = 5;
    let totalNew = 0;
    for (let i = 0; i < feeds.length; i += CONCURRENCY) {
      const batch = feeds.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map(f => refreshFeed(f.id)));
      totalNew += results.reduce(
        (sum, r) => sum + (r.status === 'fulfilled' ? r.value || 0 : 0), 0
      );
    }
    if (totalNew > 0) onDataChanged?.();
    return totalNew;
  }, [feeds, refreshFeed, onDataChanged]);

  const importFeedsFromOPML = useCallback(async (parsedFeeds) => {
    let importedCount = 0;
    const existingUrls = new Set(feeds.map(f => f.url));

    for (const feed of parsedFeeds) {
      if (existingUrls.has(feed.url)) continue;

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

      if (saved) {
        existingUrls.add(feed.url);
        importedCount++;
      }
    }

    if (importedCount > 0) {
      const freshFeeds = await api.fetchFeeds().catch(() => feeds);
      setFeeds(freshFeeds);
      onDataChanged?.();
    }

    return importedCount;
  }, [feeds, onDataChanged]);

  return {
    feeds,
    addFeed,
    removeFeed,
    updateFeedFolder,
    refreshFeed,
    refreshAllFeeds,
    importFeedsFromOPML,
  };
}
