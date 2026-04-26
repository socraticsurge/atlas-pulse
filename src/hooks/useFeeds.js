import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/database.js';
import * as api from '../utils/api.js';
import { getFaviconUrl } from '../utils/helpers.js';
import { getBatchSettings } from '../utils/batchSettings.js';

async function queueArticlesForBatch(feedId) {
  const settings = getBatchSettings();
  if (!settings.enabled) return;

  // Check scope
  const [scopeType, scopeIdStr] = settings.scope.split(':');
  const scopeId = scopeIdStr ? parseInt(scopeIdStr, 10) : null;

  let shouldQueue = false;
  if (scopeType === 'all') {
    shouldQueue = true;
  } else if (scopeType === 'feed' && scopeId === feedId) {
    shouldQueue = true;
  } else if (scopeType === 'folder' && scopeId !== null) {
    const feed = await db.feeds.get(feedId);
    shouldQueue = feed?.folderId === scopeId;
  }

  if (!shouldQueue) return;

  // Respect maxPerCycle — don't over-queue
  const alreadyQueued = await db.articles.where('aiStatus').equals('queued').count();
  const remaining = settings.maxPerCycle - alreadyQueued;
  if (remaining <= 0) return;

  // Find newest unprocessed articles for this feed
  const candidates = await db.articles
    .where('feedId').equals(feedId)
    .toArray()
    .then(arr =>
      arr
        .filter(a => !a.aiStatus || a.aiStatus === 'none')
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, remaining)
    );

  if (candidates.length === 0) return;
  const ids = candidates.map(a => a.id);
  await db.articles.where('id').anyOf(ids).modify({ aiStatus: 'queued' });
}

/**
 * Hook for feed CRUD operations and live queries.
 */
export function useFeeds() {
  const feeds = useLiveQuery(() => db.feeds.toArray()) || [];
  
  const addFeed = useCallback(async (feedUrl, folderId = null) => {
    // Check if feed already exists
    const existing = await db.feeds.where('url').equals(feedUrl).first();
    if (existing) {
      throw new Error('This feed is already added');
    }

    // Parse the feed from the server
    const feedData = await api.parseFeed(feedUrl);

    // Save feed to IndexedDB
    const feedId = await db.feeds.add({
      title: feedData.title,
      url: feedUrl,
      siteUrl: feedData.link || '',
      description: feedData.description || '',
      favicon: getFaviconUrl(feedData.link),
      folderId: folderId,
      lastRefreshed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Save articles
    if (feedData.items && feedData.items.length > 0) {
      const articles = feedData.items.map((item) => ({
        feedId: feedId,
        guid: item.guid || item.link,
        title: item.title,
        link: item.link,
        content: item.content || '',
        summary: item.summary || '',
        author: item.author || '',
        publishedAt: item.publishedAt || new Date().toISOString(),
        isRead: 0,
        isBookmarked: false,
        imageUrl: item.imageUrl || '',
      }));

      await db.articles.bulkAdd(articles).catch(() => {
        // Some articles may already exist, that's fine
      });
    }

    return feedId;
  }, []);

  const removeFeed = useCallback(async (feedId) => {
    await db.transaction('rw', db.feeds, db.articles, async () => {
      await db.articles.where('feedId').equals(feedId).delete();
      await db.feeds.delete(feedId);
    });
  }, []);

  const importFeedsFromOPML = useCallback(async (parsedFeeds) => {
    let importedCount = 0;
    
    await db.transaction('rw', db.feeds, db.folders, async () => {
      // Get all existing feed URLs to avoid duplicates
      const existingFeeds = await db.feeds.toArray();
      const existingUrls = new Set(existingFeeds.map(f => f.url));

      for (const feed of parsedFeeds) {
        if (existingUrls.has(feed.url)) continue;
        
        let folderId = null;
        if (feed.folderName) {
          // Find or create folder
          let folder = await db.folders.where('name').equals(feed.folderName).first();
          if (!folder) {
            folderId = await db.folders.add({
              name: feed.folderName,
              order: 0,
              createdAt: new Date().toISOString()
            });
          } else {
            folderId = folder.id;
          }
        }

        // Add to dexie without fetching right away
        await db.feeds.add({
          title: feed.title,
          url: feed.url,
          siteUrl: feed.siteUrl || '',
          description: '',
          favicon: getFaviconUrl(feed.siteUrl || feed.url),
          folderId: folderId,
          lastRefreshed: null, // important: null means it needs refresh
          createdAt: new Date().toISOString()
        });
        
        existingUrls.add(feed.url);
        importedCount++;
      }
    });
    
    return importedCount;
  }, []);

  const updateFeedFolder = useCallback(async (feedId, folderId) => {
    await db.feeds.update(feedId, { folderId });
  }, []);

  const refreshFeed = useCallback(async (feedId) => {
    const feed = await db.feeds.get(feedId);
    if (!feed) return;

    try {
      const feedData = await api.parseFeed(feed.url);

      // Get existing article GUIDs for this feed
      const existingArticles = await db.articles.where('feedId').equals(feedId).toArray();
      const existingGuids = new Set(existingArticles.map((a) => a.guid));

      // Add only new articles
      const newArticles = (feedData.items || [])
        .filter((item) => !existingGuids.has(item.guid || item.link))
        .map((item) => ({
          feedId: feedId,
          guid: item.guid || item.link,
          title: item.title,
          link: item.link,
          content: item.content || '',
          summary: item.summary || '',
          author: item.author || '',
          publishedAt: item.publishedAt || new Date().toISOString(),
          isRead: 0,
          isBookmarked: false,
          imageUrl: item.imageUrl || '',
        }));

      if (newArticles.length > 0) {
        await db.articles.bulkAdd(newArticles).catch(() => {});
        await queueArticlesForBatch(feedId);
      }

      await db.feeds.update(feedId, {
        lastRefreshed: new Date().toISOString(),
        title: feedData.title || feed.title,
      });

      return newArticles.length;
    } catch (error) {
      console.error(`Failed to refresh feed ${feed.title}:`, error);
      return 0;
    }
  }, []);

  const refreshAllFeeds = useCallback(async () => {
    const allFeeds = await db.feeds.toArray();
    if (allFeeds.length === 0) return 0;
    const CONCURRENCY = 5;
    let totalNew = 0;
    for (let i = 0; i < allFeeds.length; i += CONCURRENCY) {
      const batch = allFeeds.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map(f => refreshFeed(f.id)));
      totalNew += results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value || 0 : 0), 0);
    }
    return totalNew;
  }, [refreshFeed]);

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
