import { useCallback, useEffect, useRef } from 'react';

const ITEMS = '[role^="menuitem"]:not(:disabled)';

const MOVES = {
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (i, n) => n - 1,
};

/**
 * Index of the item to focus after `key`, from item `index` (-1 when focus
 * is outside the menu) of `count`; arrows wrap around. Undefined for keys
 * that don't move, or an empty menu.
 */
export function menuMoveIndex(key, index, count) {
  if (count === 0 || !MOVES[key]) return undefined;
  return MOVES[key](Math.max(index, key === 'ArrowUp' ? 0 : -1), count);
}

// Puts focus back where it was before the menu opened, unless something
// else has taken it since (a rename field the menu item opened, say).
function restoreFocus(opener) {
  const current = document.activeElement;
  const unclaimed = !current || current === document.body;
  if (unclaimed && opener?.isConnected) opener.focus();
}

/**
 * Keyboard for a role="menu" popup (the WAI-ARIA menu pattern): while `open`,
 * focus starts on the first item, arrows and Home/End move between items,
 * Escape and Tab close it, and closing returns focus to where it was. Put
 * the returned ref and key handler on the menu element.
 */
export function useMenuKeys(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    ref.current?.querySelector(ITEMS)?.focus();
    return () => restoreFocus(opener);
  }, [open]);
  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
      onClose();
      return;
    }
    const items = [...(ref.current?.querySelectorAll(ITEMS) || [])];
    const next = menuMoveIndex(e.key, items.indexOf(document.activeElement), items.length);
    if (next === undefined) return;
    e.preventDefault();
    items[next].focus();
  }, [onClose]);
  return [ref, onKeyDown];
}
