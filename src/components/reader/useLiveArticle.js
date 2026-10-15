import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../../utils/api.js';
import { useOnKeyChange } from '../../hooks/useOnKeyChange.js';

/**
 * The open article as stored on the server (full content, latest read and
 * bookmark state), plus actions that update it. Marks the article read on open.
 */
export function useLiveArticle(article, onArticleChanged) {
  const [live, setLive] = useState(null);
  const articleId = article?.id;
  useOnKeyChange(articleId, () => setLive(null));

  useEffect(() => {
    if (!articleId) return;
    api.fetchArticle(articleId).then(setLive).catch(() => setLive(null));
  }, [articleId]);

  const current = live || article;

  const patch = useCallback(async (changes) => {
    if (!articleId) return;
    setLive(await api.patchArticle(articleId, changes));
    onArticleChanged?.();
  }, [articleId, onArticleChanged]);

  const toggleBookmark = useCallback(() => patch({ isBookmarked: current?.isBookmarked ? 0 : 1 }), [patch, current]);
  const toggleRead = useCallback(() => patch({ isRead: current?.isRead ? 0 : 1 }), [patch, current]);

  // Mark as read when opened — the ref guards against re-patching the same
  // article when the parent re-renders with a stale isRead flag.
  const markedReadRef = useRef(null);
  useEffect(() => {
    if (!article || article.isRead) return;
    if (markedReadRef.current === article.id) return;
    markedReadRef.current = article.id;
    api.patchArticle(article.id, { isRead: 1 })
      .then((updated) => { setLive(updated); onArticleChanged?.(); })
      .catch(() => {});
  }, [article, onArticleChanged]);

  return { current, toggleBookmark, toggleRead };
}
