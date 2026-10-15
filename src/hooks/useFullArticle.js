import { useEffect } from 'react';
import { fetchArticle } from '../utils/api.js';

/**
 * List views carry lightweight articles without their body. When one is
 * selected, load the full article and merge it in. Fields already on the
 * list item (read/bookmark state, AI results) win, since they may have been
 * updated optimistically.
 */
export function useFullArticle(article, setArticle) {
  const id = article?.id;
  const needsContent = Boolean(article) && !('content' in article);

  useEffect(() => {
    if (!needsContent) return undefined;
    let cancelled = false;
    fetchArticle(id)
      .then((full) => {
        if (cancelled || !full) return;
        setArticle((prev) => (prev?.id === full.id ? { ...full, ...prev } : prev));
      })
      .catch(() => { /* reader falls back to extraction from the source URL */ });
    return () => { cancelled = true; };
  }, [id, needsContent, setArticle]);
}
