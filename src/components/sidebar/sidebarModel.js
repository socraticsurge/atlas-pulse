import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HiOutlineBookmark, HiOutlineCalendar, HiOutlineNewspaper, HiOutlinePaintBrush, HiOutlinePencilSquare, HiOutlineSparkles,
} from 'react-icons/hi2';
import { fetchCounts, fetchHighlightsCount, fetchStudioItems } from '../../utils/api.js';
import { STUDIO_QUERY_KEY } from '../../lib/queryClient.js';

/** Fixed navigation entries; count(c) reads the badge from the counts object. */
export const NAV_ITEMS = [
  { type: 'all', label: 'All Articles', Icon: HiOutlineNewspaper, count: (c) => c.total },
  { type: 'today', label: 'Today', Icon: HiOutlineCalendar, count: (c) => c.today },
  { type: 'saved', label: 'Saved', Icon: HiOutlineBookmark, count: (c) => c.saved },
  { type: 'highlights', label: 'Highlights', Icon: HiOutlinePencilSquare, count: (c) => c.highlights },
  { type: 'library', label: 'AI Summaries', iconTitle: 'AI Summaries Library', Icon: HiOutlineSparkles, count: (c) => c.library },
  { type: 'studio', label: 'Studio', iconTitle: 'Studio: saved newsletters', Icon: HiOutlinePaintBrush, count: (c) => c.studio },
];

// Opens the context menu at the pointer (right-click or the "…" button).
export const menuOpener = (openMenu, type, id) => (e) => {
  e.preventDefault();
  e.stopPropagation();
  openMenu({ type, id, x: e.clientX, y: e.clientY });
};

export const isActive = (activeView, type, id) => activeView.type === type && (id === undefined || activeView.id === id);

/** Feeds grouped by folder id, plus the uncategorized ones. */
export function groupFeeds(feeds) {
  const byFolder = {};
  const uncategorized = [];
  for (const feed of feeds) {
    if (!feed.folderId) uncategorized.push(feed);
    else (byFolder[feed.folderId] ||= []).push(feed);
  }
  return { byFolder, uncategorized };
}

export function folderUnread(folderFeeds = [], byFeed) {
  return folderFeeds.reduce((sum, f) => sum + (byFeed[f.id] || 0), 0);
}

/** Unread/saved/today/highlights counts, reloaded when refreshKey changes, and the Studio count. */
export function useSidebarCounts(refreshKey, librarySummaryCount) {
  const [counts, setCounts] = useState({ byFeed: {}, total: 0, saved: 0, today: 0, highlights: 0 });

  useEffect(() => {
    fetchCounts()
      .then(({ unreadByFeed, total, savedCount, todayCount }) =>
        setCounts((c) => ({ ...c, byFeed: unreadByFeed, total, saved: savedCount, today: todayCount })))
      .catch(() => {});
    fetchHighlightsCount()
      .then(({ count }) => setCounts((c) => ({ ...c, highlights: count })))
      .catch(() => {});
  }, [refreshKey]);
  // Same query (and cache) as the Studio screen's list, so saves and deletes update it.
  const studio = useQuery({ queryKey: [STUDIO_QUERY_KEY], queryFn: fetchStudioItems });

  return { ...counts, library: librarySummaryCount, studio: studio.data?.length ?? 0 };
}
