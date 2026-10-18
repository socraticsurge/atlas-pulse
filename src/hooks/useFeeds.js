import { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api.js';
import { createFeed, importNewFeeds, refreshInChunks, refreshOne } from '../utils/feedSync.js';

// The subscribed feeds, loaded once, plus a helper to swap in an updated one.
function useFeedList() {
  const [feeds, setFeeds] = useState([]);
  useEffect(() => {
    api.fetchFeeds().then(setFeeds).catch(() => {});
  }, []);
  const replaceFeed = useCallback((updated) => {
    setFeeds((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }, []);
  return { feeds, setFeeds, replaceFeed };
}

// Refreshing one feed or all of them; resolves to the number of new articles.
function useFeedRefresh({ feeds, replaceFeed, onDataChanged }) {
  const refreshFeed = useCallback(async (feedId) => {
    const feed = feeds.find((f) => f.id === feedId);
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
    const totalNew = await refreshInChunks(feeds, refreshFeed);
    if (totalNew > 0) onDataChanged?.();
    return totalNew;
  }, [feeds, refreshFeed, onDataChanged]);

  return { refreshFeed, refreshAllFeeds };
}

// OPML import; reloads the feed list, then fetches articles for the new feeds
// in the background. The imported feeds are refreshed by the records the
// server returned, not looked up in `feeds`, which predates the import.
function useOPMLImport({ feeds, setFeeds, replaceFeed, onDataChanged }) {
  return useCallback(async (parsedFeeds) => {
    const imported = await importNewFeeds(parsedFeeds, feeds);
    if (imported.length === 0) return 0;
    setFeeds(await api.fetchFeeds().catch(() => [...feeds, ...imported]));
    onDataChanged?.();
    const byId = new Map(imported.map((f) => [f.id, f]));
    refreshInChunks(imported, async (id) => {
      const { inserted, updated } = await refreshOne(byId.get(id));
      replaceFeed(updated);
      return inserted;
    }).then((totalNew) => { if (totalNew > 0) onDataChanged?.(); });
    return imported.length;
  }, [feeds, setFeeds, replaceFeed, onDataChanged]);
}

export function useFeeds(onDataChanged) {
  const { feeds, setFeeds, replaceFeed } = useFeedList();
  const refresh = useFeedRefresh({ feeds, replaceFeed, onDataChanged });
  const importFeedsFromOPML = useOPMLImport({ feeds, setFeeds, replaceFeed, onDataChanged });

  const addFeed = useCallback(async (feedUrl, folderId = null) => {
    if (feeds.some((f) => f.url === feedUrl)) throw new Error('This feed is already added');
    const saved = await createFeed(feedUrl, folderId);
    setFeeds((prev) => [...prev, saved]);
    onDataChanged?.();
    return saved.id;
  }, [feeds, setFeeds, onDataChanged]);

  const removeFeed = useCallback(async (feedId) => {
    await api.removeFeed(feedId);
    setFeeds((prev) => prev.filter((f) => f.id !== feedId));
    onDataChanged?.();
  }, [setFeeds, onDataChanged]);

  const updateFeedFolder = useCallback(async (feedId, folderId) => {
    replaceFeed(await api.patchFeed(feedId, { folderId }));
  }, [replaceFeed]);

  return { feeds, addFeed, removeFeed, updateFeedFolder, ...refresh, importFeedsFromOPML };
}
