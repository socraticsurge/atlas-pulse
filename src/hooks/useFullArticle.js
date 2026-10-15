import { useEffect } from 'react';
import { fetchArticle } from '../utils/api.js';

// List items carry no body; a full article has a `content` key (possibly null).
const needsFullContent = (article) => Boolean(article) && !('content' in article);

// Merge the full article into the current selection. List-item fields win:
// read/bookmark state and AI results may have been updated optimistically.
const mergeInto = (full) => (prev) => (prev?.id === full?.id ? { ...full, ...prev } : prev);

/**
 * List views carry lightweight articles without their body. When one is
 * selected, load the full article and merge it in.
 */
export function useFullArticle(article, setArticle) {
  const id = article?.id;
  const needsContent = needsFullContent(article);

  useEffect(() => {
    if (!needsContent) return undefined;
    let cancelled = false;
    fetchArticle(id)
      .then((full) => { if (!cancelled) setArticle(mergeInto(full)); })
      .catch(() => { /* reader falls back to extraction from the source URL */ });
    return () => { cancelled = true; };
  }, [id, needsContent, setArticle]);
}
