import Dexie from 'dexie';

const db = new Dexie('RSSFeedReader');

// Note: IndexedDB cannot index boolean values directly.
// isBookmarked and isRead use 0/1 integers for indexability.
// aiStatus: 'none' | 'queued' | 'processing' | 'done' | 'error' — indexed for batch queue queries.
// aiSummary: string — batch-generated summary text (not indexed).
// aiAnalysis: JSON string — { sentiment, urgency, frame, tone, depth, topics[] } (not indexed).
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

// v4: add isRead index (stored as 0/1 integer for IDB compatibility)
db.version(4).stores({
  folders: '++id, name, order, createdAt',
  feeds: '++id, folderId, title, url, siteUrl, lastRefreshed, createdAt',
  articles: '++id, feedId, guid, title, link, publishedAt, isRead, isBookmarked, aiStatus, [feedId+guid]',
}).upgrade(tx =>
  tx.table('articles').toCollection().modify(article => {
    article.isRead = article.isRead ? 1 : 0;
  })
);

export default db;
