import { useCallback, useState } from 'react';
import { readStored, readStoredNumber, writeStored } from '../utils/storage.js';

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 400;
const SIDEBAR_ICON_WIDTH = 56;
const READER_MIN = 400;
const READER_MAX = 1200;
const NEXT_SIDEBAR_MODE = { expanded: 'icon', icon: 'hidden', hidden: 'expanded' };

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// A width persisted to localStorage, resized by drag deltas within [min, max].
export function usePersistedWidth(key, { fallback, min, max, direction = 1 }) {
  const [width, setWidth] = useState(() => clamp(readStoredNumber(key, fallback), min, max));
  const resize = useCallback((delta) => setWidth((prev) => {
    const next = clamp(prev + direction * delta, min, max);
    writeStored(key, next);
    return next;
  }), [key, min, max, direction]);
  return [width, resize];
}

// A remembered choice among string values.
export function usePersistedChoice(key, fallback) {
  const [value, setValue] = useState(() => readStored(key, fallback));
  const choose = useCallback((next) => {
    writeStored(key, next);
    setValue(next);
  }, [key]);
  return [value, choose];
}

// A remembered on/off switch.
export function usePersistedToggle(key, fallback = false) {
  const [on, setOn] = useState(() => readStored(key, String(fallback)) === 'true');
  const toggle = useCallback(() => setOn((prev) => {
    writeStored(key, !prev);
    return !prev;
  }), [key]);
  return [on, toggle];
}

/**
 * Sidebar mode (expanded → icon → hidden), the sidebar and reader widths, and
 * whether the article list is hidden (giving the reader the whole width).
 */
export function useLayout() {
  const [sidebarMode, setSidebarMode] = useState(() => readStored('atlas-pulse-sidebar-mode', 'expanded'));
  const [sidebarWidth, resizeSidebar] = usePersistedWidth('atlas-pulse-sidebar-width', { fallback: 260, min: SIDEBAR_MIN, max: SIDEBAR_MAX });
  const [readerWidth, resizeReader] = usePersistedWidth('atlas-pulse-reader-width', { fallback: 600, min: READER_MIN, max: READER_MAX, direction: -1 });

  const [listHidden, toggleList] = usePersistedToggle('atlas-pulse-list-hidden');

  const toggleSidebarMode = useCallback(() => setSidebarMode((prev) => {
    const next = NEXT_SIDEBAR_MODE[prev] || 'expanded';
    writeStored('atlas-pulse-sidebar-mode', next);
    return next;
  }), []);

  const effectiveSidebarWidth = { hidden: 0, icon: SIDEBAR_ICON_WIDTH }[sidebarMode] ?? sidebarWidth;
  return { sidebarMode, toggleSidebarMode, effectiveSidebarWidth, resizeSidebar, readerWidth, resizeReader, listHidden, toggleList };
}
