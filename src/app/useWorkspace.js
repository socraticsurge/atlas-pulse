import { useCallback, useEffect, useState } from 'react';
import { fetchSummaries } from '../utils/api.js';

/** Previous/next navigation within the visible article list. */
export function useArticleNavigation(selected, setSelected, visible) {
  const index = selected ? visible.findIndex((a) => a.id === selected.id) : -1;
  const navigate = useCallback((direction) => {
    const next = visible[index + direction];
    if (index >= 0 && next) setSelected(next);
  }, [index, visible, setSelected]);
  return { index, navigate, hasPrev: index > 0, hasNext: index >= 0 && index < visible.length - 1 };
}

/** Saved-summaries count for the sidebar badge; refreshes on view change or save. */
export function useSummaryCount(viewType) {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    fetchSummaries().then((rows) => setCount(rows.length)).catch(() => {});
  }, []);
  useEffect(() => { refresh(); }, [viewType, refresh]);
  return [count, refresh];
}
