import { useCallback, useState } from 'react';

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 400;
const SIDEBAR_ICON_WIDTH = 56;
const READER_MIN = 400;
const READER_MAX = 1200;
const NEXT_SIDEBAR_MODE = { expanded: 'icon', icon: 'hidden', hidden: 'expanded' };

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const storedNumber = (key, fallback) => {
  const v = localStorage.getItem(key);
  return v ? parseInt(v, 10) : fallback;
};

// A width persisted to localStorage, resized by drag deltas within [min, max].
function usePersistedWidth(key, { fallback, min, max, direction = 1 }) {
  const [width, setWidth] = useState(() => storedNumber(key, fallback));
  const resize = useCallback((delta) => setWidth((prev) => {
    const next = clamp(prev + direction * delta, min, max);
    localStorage.setItem(key, next);
    return next;
  }), [key, min, max, direction]);
  return [width, resize];
}

/** Sidebar mode (expanded → icon → hidden) and the sidebar and reader widths. */
export function useLayout() {
  const [sidebarMode, setSidebarMode] = useState(() => localStorage.getItem('atlas-pulse-sidebar-mode') || 'expanded');
  const [sidebarWidth, resizeSidebar] = usePersistedWidth('atlas-pulse-sidebar-width', { fallback: 260, min: SIDEBAR_MIN, max: SIDEBAR_MAX });
  const [readerWidth, resizeReader] = usePersistedWidth('atlas-pulse-reader-width', { fallback: 600, min: READER_MIN, max: READER_MAX, direction: -1 });

  const toggleSidebarMode = useCallback(() => setSidebarMode((prev) => {
    const next = NEXT_SIDEBAR_MODE[prev] || 'expanded';
    localStorage.setItem('atlas-pulse-sidebar-mode', next);
    return next;
  }), []);

  const effectiveSidebarWidth = { hidden: 0, icon: SIDEBAR_ICON_WIDTH }[sidebarMode] ?? sidebarWidth;
  return { sidebarMode, toggleSidebarMode, effectiveSidebarWidth, resizeSidebar, readerWidth, resizeReader };
}
