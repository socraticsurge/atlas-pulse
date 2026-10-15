import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../../utils/api.js';
import { useOnKeyChange } from '../../hooks/useOnKeyChange.js';

const flip = (flag) => (flag ? 0 : 1);

// The article as stored on the server, reloaded when the article changes.
function useServerCopy(articleId) {
  const [live, setLive] = useState(null);
  useOnKeyChange(articleId, () => setLive(null));
  useEffect(() => {
    if (!articleId) return;
    api.fetchArticle(articleId).then(setLive).catch(() => setLive(null));
  }, [articleId]);
  return [live, setLive];
}

// Marks the article read when opened. The ref guards against re-patching the
// same article when the parent re-renders with a stale isRead flag.
function useMarkReadOnOpen(article, setLive, notify) {
  const markedReadRef = useRef(null);
  useEffect(() => {
    if (!article || article.isRead) return;
    if (markedReadRef.current === article.id) return;
    markedReadRef.current = article.id;
    api.patchArticle(article.id, { isRead: 1 })
      .then((updated) => { setLive(updated); notify(); })
      .catch(() => {});
  }, [article, setLive, notify]);
}

/**
 * The open article as stored on the server (full content, latest read and
 * bookmark state), plus actions that update it. Marks the article read on open.
 */
export function useLiveArticle(article, onArticleChanged) {
  const articleId = article?.id;
  const [live, setLive] = useServerCopy(articleId);
  const notify = useCallback(() => onArticleChanged?.(), [onArticleChanged]);
  useMarkReadOnOpen(article, setLive, notify);
  const current = live || article;

  const patch = useCallback(async (changes) => {
    if (!articleId) return;
    setLive(await api.patchArticle(articleId, changes));
    notify();
  }, [articleId, setLive, notify]);

  const toggleBookmark = useCallback(() => patch({ isBookmarked: flip(current?.isBookmarked) }), [patch, current]);
  const toggleRead = useCallback(() => patch({ isRead: flip(current?.isRead) }), [patch, current]);

  return { current, toggleBookmark, toggleRead };
}
