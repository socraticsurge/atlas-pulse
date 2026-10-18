import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchArticles } from '../../utils/api.js';
import { maxArticleId, mergeNewArticles } from './listLogic.js';

/**
 * Articles for the active view, labelled with the library's feeds. Reloaded
 * when the view changes or refreshKey ({ n, kind }) is bumped; stale
 * responses are ignored. When the bump only added articles (a feed refresh)
 * and this view is already loaded, just the new ones are fetched and merged.
 * Only a view change shows the loading state: a refresh swaps the new list in
 * place, so the reader keeps their scroll position.
 */
export function useArticleListData(activeView, refreshKey, feeds) {
  const [articles, setArticles] = useState([]);
  const [loadedView, setLoadedView] = useState(null);
  const latest = useRef({ articles, loadedView });
  useEffect(() => { latest.current = { articles, loadedView }; }, [articles, loadedView]);

  const viewKey = `${activeView.type}:${activeView.id}`;
  useEffect(() => {
    let cancelled = false;
    const afterId = refreshKey.kind === 'added' && latest.current.loadedView === viewKey ? maxArticleId(latest.current.articles) : 0;
    fetchArticles(activeView.type, activeView.id, afterId)
      .then((data) => { if (!cancelled) setArticles((prev) => (afterId ? mergeNewArticles(prev, data) : data)); })
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
