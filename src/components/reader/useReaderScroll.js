import { useEffect, useRef, useState } from 'react';
import { useOnKeyChange } from '../../hooks/useOnKeyChange.js';
import { loadScrollPosition, saveScrollPosition } from './scrollMemory.js';

const SAVE_DELAY_MS = 400;

/**
 * Reading progress (0–100) and per-article scroll position memory. The saved
 * position is restored only once `contentSettled` is true, because full-text
 * extraction can replace a short feed excerpt with a much longer article.
 */
export function useReaderScroll(contentRef, articleId, isOpen, contentSettled) {
  const [progress, setProgress] = useState(0);
  const restoredRef = useRef(null);
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

  // A new article starts at the top until its final content is in place.
  useEffect(() => {
    const el = contentRef.current;
    if (el && articleId) el.scrollTop = 0;
    restoredRef.current = null;
  }, [contentRef, articleId]);

  // Restore the saved position once, after the content has settled, unless the
  // reader already started scrolling while the full text was loading.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !articleId || !contentSettled || restoredRef.current === articleId) return;
    restoredRef.current = articleId;
    const saved = loadScrollPosition(articleId);
    if (saved > 0 && el.scrollTop === 0) el.scrollTop = saved;
  }, [contentRef, articleId, contentSettled]);

  // Save the position shortly after scrolling stops, and when leaving the
  // article. Leaving saves the last position seen while reading: by the time
  // this cleanup runs the next article is already in the DOM, and el.scrollTop
  // no longer belongs to this one.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !articleId) return undefined;
    let timer;
    let latest = null;
    const save = () => { if (latest !== null) saveScrollPosition(articleId, latest); };
    const onScroll = () => {
      if (restoredRef.current !== articleId) return; // not restored yet
      latest = el.scrollTop;
      clearTimeout(timer);
      timer = setTimeout(save, SAVE_DELAY_MS);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', onScroll);
      save();
    };
  }, [contentRef, articleId]);

  return progress;
}
