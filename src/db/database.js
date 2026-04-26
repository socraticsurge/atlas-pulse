import Dexie from 'dexie';

const db = new Dexie('RSSFeedReader');

// Note: IndexedDB cannot index boolean values (true/false are not valid IDB keys).
// isBookmarked uses 0/1 integers for indexability.
// isRead uses truthy/falsy values but is NOT indexed (filtered in JS).
// aiStatus: 'none' | 'queued' | 'processing' | 'done' | 'error' — indexed for batch queue queries.
// aiSummary: string — batch-generated summary text (not indexed).
// aiAnalysis: JSON string — { sentiment, urgency, frame, tone, depth, subjectivity, topics[] } (not indexed).
db.version(2).stores({
  folders: '++id, name, order, createdAt',
  feeds: '++id, folderId, title, url, siteUrl, lastRefreshed, createdAt',
  articles: '++id, feedId, guid, title, link, publishedAt, isBookmarked, [feedId+guid]',
});

db.version(3).stores({
  folders: '++id, name, order, createdAt',
  feeds: '++id, folderId, title, url, siteUrl, lastRefreshed, createdAt',
  articles: '++id, feedId, guid, title, link, publishedAt, isBookmarked, aiStatus, [feedId+guid]',
});

export default db;
