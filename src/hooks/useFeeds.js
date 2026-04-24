import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/database.js';
import * as api from '../utils/api.js';
import { getFaviconUrl } from '../utils/helpers.js';

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
        isRead: false,
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
          isRead: false,
          isBookmarked: false,
          imageUrl: item.imageUrl || '',
        }));

      if (newArticles.length > 0) {
        await db.articles.bulkAdd(newArticles).catch(() => {});
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
    let totalNew = 0;
    for (const feed of allFeeds) {
      const count = await refreshFeed(feed.id);
      totalNew += count || 0;
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
  };
}
