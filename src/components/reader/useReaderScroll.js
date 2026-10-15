import { useEffect, useRef, useState } from 'react';
import { useOnKeyChange } from '../../hooks/useOnKeyChange.js';

/** Reading progress (0–100) and per-article scroll position memory. */
export function useReaderScroll(contentRef, articleId, isOpen) {
  const [progress, setProgress] = useState(0);
  const scrollMapRef = useRef({});
  useOnKeyChange(articleId, () => setProgress(0));

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(100, (el.scrollTop / total) * 100) : 100);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [contentRef, isOpen, articleId]);

  // Restore the position when returning to an article; save it when leaving.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !articleId) return undefined;
    const scrollMap = scrollMapRef.current;
    el.scrollTop = scrollMap[articleId] || 0;
    return () => { scrollMap[articleId] = el.scrollTop; };
  }, [contentRef, articleId]);

  return progress;
}
