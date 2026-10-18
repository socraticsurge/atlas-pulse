import { useEffect } from 'react';
import { safeHttpUrl } from '../../utils/opml.js';

const isTyping = (target) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;

const NAV_PREV = new Set(['ArrowUp', 'ArrowLeft', 'k']);
const NAV_NEXT = new Set(['ArrowDown', 'ArrowRight', 'j']);

// Action for a key, or null if the reader doesn't handle it.
function actionFor(key, a) {
  if (NAV_PREV.has(key)) return () => a.hasPrev && a.onNavigate(-1);
  if (NAV_NEXT.has(key)) return () => a.hasNext && a.onNavigate(1);
  const actions = {
    b: a.toggleBookmark,
    o: () => safeHttpUrl(a.link) && window.open(safeHttpUrl(a.link), '_blank', 'noopener,noreferrer'),
    f: a.toggleZen,
    Escape: a.escape,
  };
  return actions[key] || null;
}

/**
 * Reader shortcuts: j/k/arrows navigate, b bookmark, o open original,
 * f focus mode, Esc exit focus mode or close. Ignored while typing or when a
 * modal is open.
 */
export function useReaderKeyboard(enabled, actions) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (e) => {
      if (isTyping(e.target) || actions.isModalOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return; // ⌘F, Ctrl+K… belong to the browser
      const action = actionFor(e.key, actions);
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, actions]);
}
