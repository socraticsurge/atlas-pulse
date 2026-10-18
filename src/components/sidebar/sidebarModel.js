import { useEffect, useState } from 'react';
import {
  HiOutlineBookmark, HiOutlineCalendar, HiOutlineNewspaper, HiOutlinePencilSquare, HiOutlineSparkles,
} from 'react-icons/hi2';
import { fetchCounts, fetchHighlightsCount } from '../../utils/api.js';

/** Fixed navigation entries; count(c) reads the badge from the counts object. */
export const NAV_ITEMS = [
  { type: 'all', label: 'All Articles', Icon: HiOutlineNewspaper, count: (c) => c.total },
  { type: 'today', label: 'Today', Icon: HiOutlineCalendar, count: (c) => c.today },
  { type: 'saved', label: 'Saved', Icon: HiOutlineBookmark, count: (c) => c.saved },
  { type: 'highlights', label: 'Highlights', Icon: HiOutlinePencilSquare, count: (c) => c.highlights },
  { type: 'library', label: 'AI Summaries', iconTitle: 'AI Summaries Library', Icon: HiOutlineSparkles, count: (c) => c.library },
];

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

/** Unread/saved/today/highlights counts, reloaded when refreshKey changes. */
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

  return { ...counts, library: librarySummaryCount };
}
