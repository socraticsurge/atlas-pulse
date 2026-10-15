import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchArticles, fetchFeeds } from '../../utils/api.js';

/**
 * Articles for the active view (reloaded when the view or refreshKey
 * changes; stale responses ignored) and the feeds used to label them.
 */
export function useArticleListData(activeView, refreshKey) {
  const [articles, setArticles] = useState([]);
  const [loadedKey, setLoadedKey] = useState(null);
  const [feeds, setFeeds] = useState([]);

  // Feeds rarely change, so a single load is fine.
  useEffect(() => {
    fetchFeeds().then(setFeeds).catch(() => {});
  }, []);

  const viewKey = `${activeView.type}:${activeView.id}:${refreshKey}`;
  useEffect(() => {
    let cancelled = false;
    fetchArticles(activeView.type, activeView.id)
      .then((data) => { if (!cancelled) setArticles(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadedKey(viewKey); });
    return () => { cancelled = true; };
  }, [activeView.type, activeView.id, viewKey]);

  const feedMap = useMemo(() => Object.fromEntries(feeds.map((f) => [f.id, f])), [feeds]);

  // Optimistic update of several articles in local state.
  const updateLocal = useCallback((ids, changes) => {
    const idSet = new Set(ids);
    setArticles((prev) => prev.map((a) => (idSet.has(a.id) ? { ...a, ...changes } : a)));
  }, []);

  return { articles, loading: loadedKey !== viewKey, feedMap, updateLocal };
}
