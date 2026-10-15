import { useMemo } from 'react';
import { ExpandedSidebar } from './sidebar/ExpandedSidebar.jsx';
import { IconSidebar } from './sidebar/IconSidebar.jsx';
import { groupFeeds, useSidebarCounts } from './sidebar/sidebarModel.js';

/** Left sidebar: expanded, or icon-only when collapsed or hidden. */
export default function Sidebar({
  mode = 'expanded', activeView, onViewChange, folders, feeds, librarySummaryCount = 0, style, refreshKey = 0,
  ...actions
}) {
  const counts = useSidebarCounts(refreshKey, librarySummaryCount);
  const grouped = useMemo(() => groupFeeds(feeds), [feeds]);
  const props = { style, activeView, onViewChange, counts, folders, feeds, grouped, actions };
  return mode === 'icon' || mode === 'hidden' ? <IconSidebar {...props} /> : <ExpandedSidebar {...props} />;
}
