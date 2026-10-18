import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFeeds } from '../hooks/useFeeds.js';
import { useFolders } from '../hooks/useFolders.js';
import * as api from '../utils/api.js';
import { getAutoRefreshMinutes } from '../utils/constants.js';
import { useToast } from './ToastContext.jsx';

const LibraryContext = createContext(null);

const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`;

// Keys bumped after mutations so lists and counts re-fetch.
function useRefreshKeys() {
  const [articlesKey, setArticlesKey] = useState(0);
  const [countsKey, setCountsKey] = useState(0);
  const bumpArticles = useCallback(() => {
    setArticlesKey((k) => k + 1);
    setCountsKey((k) => k + 1);
  }, []);
  const bumpCounts = useCallback(() => setCountsKey((k) => k + 1), []);
  return { articlesKey, countsKey, bumpArticles, bumpCounts };
}

// Refreshes all feeds every `minutes` (0 = off) once there are feeds.
function useAutoRefresh(feedCount, refreshAllFeeds) {
  const [minutes, setMinutes] = useState(getAutoRefreshMinutes);
  const intervalRef = useRef(null);
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (feedCount === 0 || minutes === 0) return undefined;
    intervalRef.current = setInterval(() => { refreshAllFeeds().catch(console.error); }, minutes * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, [feedCount, minutes, refreshAllFeeds]);
  return setMinutes;
}

// Folder deletes and Clear All Data. The server moves or deletes feeds as a
// side effect, so each reloads the feed list (and Clear All the folders too).
function useDestructiveActions({
  feeds, folders, reloadFeeds, reloadFolders, deleteFolderRaw, deleteFolderAndFeedsRaw,
  bumpArticles, bumpCounts, onViewRemoved, showToast,
}) {
  const deleteFolder = useCallback(async (folderId) => {
    await deleteFolderRaw(folderId);
    await reloadFeeds();
    showToast('Folder deleted — feeds moved to Uncategorized');
    onViewRemoved('folder', folderId);
  }, [deleteFolderRaw, reloadFeeds, showToast, onViewRemoved]);

  const deleteFolderAndFeeds = useCallback(async (folderId) => {
    const folder = folders.find((f) => f.id === folderId);
    const count = feeds.filter((f) => f.folderId === folderId).length;
    if (!window.confirm(`Delete "${folder?.name || 'this folder'}" and its ${plural(count, 'feed')}? All their articles will be deleted.`)) return;
    await deleteFolderAndFeedsRaw(folderId);
    await reloadFeeds();
    showToast('Folder and all its feeds deleted');
    bumpArticles();
    onViewRemoved('folder', folderId);
  }, [folders, feeds, deleteFolderAndFeedsRaw, reloadFeeds, showToast, bumpArticles, onViewRemoved]);

  // Settings → Danger Zone. Everything is gone, so reload it all and leave
  // any feed or folder view.
  const clearAll = useCallback(async () => {
    await api.clearAllData();
    await Promise.all([reloadFeeds(), reloadFolders()]);
    bumpArticles();
    bumpCounts();
    onViewRemoved(null);
    showToast('All feeds, folders and articles deleted');
  }, [reloadFeeds, reloadFolders, bumpArticles, bumpCounts, onViewRemoved, showToast]);

  return { deleteFolder, deleteFolderAndFeeds, clearAll };
}

/**
 * Feeds, folders, and the actions on them (with toasts). onViewRemoved(type, id)
 * lets the app leave a view whose feed or folder was just deleted.
 */
function useLibraryState(onViewRemoved) {
  const showToast = useToast();
  const { articlesKey, countsKey, bumpArticles, bumpCounts } = useRefreshKeys();
  const { feeds, reloadFeeds, addFeed: addFeedRaw, removeFeed: removeFeedRaw, updateFeedFolder, refreshAllFeeds, importFeedsFromOPML: importRaw } = useFeeds(bumpArticles);
  const { folders, reloadFolders, addFolder, renameFolder, deleteFolder: deleteFolderRaw, deleteFolderAndFeeds: deleteFolderAndFeedsRaw } = useFolders();
  const [refreshing, setRefreshing] = useState(false);
  const setAutoRefreshMinutes = useAutoRefresh(feeds.length, refreshAllFeeds);

  // An OPML import can create folders, so reload them along with the feeds.
  const importFeedsFromOPML = useCallback(async (parsedFeeds) => {
    const count = await importRaw(parsedFeeds);
    if (count > 0) await reloadFolders();
    return count;
  }, [importRaw, reloadFolders]);

  const addFeed = useCallback(async (feedUrl, folderId) => {
    try {
      await addFeedRaw(feedUrl, folderId);
      showToast('Feed added successfully!');
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }, [addFeedRaw, showToast]);

  const removeFeed = useCallback(async (feedId) => {
    const feed = feeds.find((f) => f.id === feedId);
    if (!window.confirm(`Remove "${feed?.title || 'this feed'}"? All its articles will be deleted.`)) return;
    await removeFeedRaw(feedId);
    showToast('Feed removed');
    bumpArticles();
    onViewRemoved('feed', feedId);
  }, [feeds, removeFeedRaw, showToast, bumpArticles, onViewRemoved]);

  const moveFeed = useCallback(async (feedId, folderId) => {
    await updateFeedFolder(feedId, folderId);
    const folder = folders.find((f) => f.id === folderId);
    showToast(`Moved to ${folder ? folder.name : 'Uncategorized'}`);
  }, [updateFeedFolder, folders, showToast]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const count = await refreshAllFeeds();
      showToast(`Refreshed! ${plural(count, 'new article')} found.`);
    } catch {
      showToast('Failed to refresh some feeds', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllFeeds, showToast]);

  const { deleteFolder, deleteFolderAndFeeds, clearAll } = useDestructiveActions({
    feeds, folders, reloadFeeds, reloadFolders, deleteFolderRaw, deleteFolderAndFeedsRaw,
    bumpArticles, bumpCounts, onViewRemoved, showToast,
  });

  const existingFeedUrls = useMemo(() => feeds.map((f) => f.url), [feeds]);

  return useMemo(() => ({
    feeds, folders, existingFeedUrls, refreshing,
    articlesRefreshKey: articlesKey, countsRefreshKey: countsKey, bumpCounts,
    setAutoRefreshMinutes, importFeedsFromOPML,
    onAddFeed: addFeed, onRemoveFeed: removeFeed, onMoveFeed: moveFeed, onRefreshAll: refreshAll,
    onAddFolder: addFolder, onRenameFolder: renameFolder,
    onDeleteFolder: deleteFolder, onDeleteFolderAndFeeds: deleteFolderAndFeeds, onClearAll: clearAll,
  }), [feeds, folders, existingFeedUrls, refreshing, articlesKey, countsKey, bumpCounts, setAutoRefreshMinutes,
    importFeedsFromOPML, addFeed, removeFeed, moveFeed, refreshAll, addFolder, renameFolder, deleteFolder, deleteFolderAndFeeds, clearAll]);
}

/** Feeds and folders with their actions, shared by Sidebar, Add Feed, and Settings. */
export function LibraryProvider({ onViewRemoved, children }) {
  const value = useLibraryState(onViewRemoved);
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLibrary = () => useContext(LibraryContext);
