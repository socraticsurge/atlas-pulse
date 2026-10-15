import { useMemo } from 'react';
import { useAppearance } from '../app/AppearanceContext.jsx';
import { useLibrary } from '../app/LibraryContext.jsx';
import { ExpandedSidebar } from './sidebar/ExpandedSidebar.jsx';
import { IconSidebar } from './sidebar/IconSidebar.jsx';
import { groupFeeds, useSidebarCounts } from './sidebar/sidebarModel.js';

/** Left sidebar: expanded, or icon-only when collapsed or hidden. */
export default function Sidebar({ mode = 'expanded', activeView, onViewChange, onAddFeed, onSettings, onToggleMode, librarySummaryCount = 0, style }) {
  const library = useLibrary();
  const { theme, onToggleTheme } = useAppearance();
  const counts = useSidebarCounts(library.countsRefreshKey, librarySummaryCount);
  const grouped = useMemo(() => groupFeeds(library.feeds), [library.feeds]);
  const actions = { ...library, theme, onToggleTheme, onAddFeed, onSettings, onToggleMode };
  const props = { style, activeView, onViewChange, counts, folders: library.folders, feeds: library.feeds, grouped, actions };
  return mode === 'icon' || mode === 'hidden' ? <IconSidebar {...props} /> : <ExpandedSidebar {...props} />;
}
