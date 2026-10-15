import { useEffect } from 'react';

const isTyping = (target) => target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

/** '/' opens and focuses search; Esc clears the selection, then closes search. */
export function useListKeyboard({ search, selection }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !isTyping(e.target)) {
        e.preventDefault();
        search.open();
      } else if (e.key === 'Escape') {
        if (selection.size > 0) selection.clear();
        else if (search.visible) search.close();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [search, selection]);
}
