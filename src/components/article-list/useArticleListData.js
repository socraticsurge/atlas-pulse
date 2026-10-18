import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchArticles } from '../../utils/api.js';

/**
 * Articles for the active view (reloaded when the view or refreshKey
 * changes; stale responses ignored), labelled with the library's feeds.
 * Only a view change shows the loading state: a refresh swaps the new list in
 * place, so the reader keeps their scroll position.
 */
export function useArticleListData(activeView, refreshKey, feeds) {
  const [articles, setArticles] = useState([]);
  const [loadedView, setLoadedView] = useState(null);

  const viewKey = `${activeView.type}:${activeView.id}`;
  useEffect(() => {
    let cancelled = false;
    fetchArticles(activeView.type, activeView.id)
      .then((data) => { if (!cancelled) setArticles(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadedView(viewKey); });
    return () => { cancelled = true; };
  }, [activeView.type, activeView.id, viewKey, refreshKey]);

  const feedMap = useMemo(() => Object.fromEntries(feeds.map((f) => [f.id, f])), [feeds]);

  // Optimistic update of several articles in local state.
  const updateLocal = useCallback((ids, changes) => {
    const idSet = new Set(ids);
    setArticles((prev) => prev.map((a) => (idSet.has(a.id) ? { ...a, ...changes } : a)));
  }, []);

  // Puts back each article's own earlier values (to undo a failed update).
  const restoreLocal = useCallback((snapshots) => {
    const byId = new Map(snapshots.map((s) => [s.id, s]));
    setArticles((prev) => prev.map((a) => (byId.has(a.id) ? { ...a, ...byId.get(a.id) } : a)));
  }, []);

  return { articles, loading: loadedView !== viewKey, feedMap, updateLocal, restoreLocal };
}
