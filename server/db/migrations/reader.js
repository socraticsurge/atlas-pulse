import { makeExcerpt } from '../../utils/text.js';

// Schema history for reader.db. Never edit a shipped migration; append a new one.
export const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial schema: folders, feeds, articles',
    up: (db) => db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS feeds (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id      INTEGER REFERENCES folders(id),
    title          TEXT NOT NULL,
    url            TEXT NOT NULL UNIQUE,
    site_url       TEXT,
    favicon        TEXT,
    description    TEXT,
    last_refreshed TEXT,
    created_at     TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_feeds_folder_id ON feeds(folder_id);

  CREATE TABLE IF NOT EXISTS articles (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_id        INTEGER NOT NULL REFERENCES feeds(id),
    guid           TEXT,
    title          TEXT,
    link           TEXT,
    canonical_link TEXT,
    published_at   TEXT,
    is_read        INTEGER DEFAULT 0,
    is_bookmarked  INTEGER DEFAULT 0,
    content        TEXT,
    summary        TEXT,
    author         TEXT,
    image_url      TEXT,
    description    TEXT,
    ai_status      TEXT DEFAULT 'none',
    ai_summary     TEXT,
    ai_analysis    TEXT,
    favicon        TEXT,
    created_at     TEXT NOT NULL,
    UNIQUE(feed_id, guid)
  );

  CREATE INDEX IF NOT EXISTS idx_articles_feed_id       ON articles(feed_id);
  CREATE INDEX IF NOT EXISTS idx_articles_is_read       ON articles(is_read);
  CREATE INDEX IF NOT EXISTS idx_articles_is_bookmarked ON articles(is_bookmarked);
  CREATE INDEX IF NOT EXISTS idx_articles_published_at  ON articles(published_at);
  CREATE INDEX IF NOT EXISTS idx_articles_ai_status     ON articles(ai_status);
  CREATE INDEX IF NOT EXISTS idx_articles_canonical_link ON articles(canonical_link);
  CREATE INDEX IF NOT EXISTS idx_articles_link          ON articles(link);
  `),
  },
  {
    version: 2,
    description: 'Add articles.excerpt (plain text) so list views can skip full content',
    up: (db) => {
      db.exec('ALTER TABLE articles ADD COLUMN excerpt TEXT');
      // Backfill in id-ordered batches to keep memory bounded on large libraries.
      const batch = db.prepare('SELECT id, summary, content FROM articles WHERE id > ? ORDER BY id LIMIT 500');
      const update = db.prepare('UPDATE articles SET excerpt = ? WHERE id = ?');
      let lastId = 0;
      for (let rows = batch.all(lastId); rows.length > 0; rows = batch.all(lastId)) {
        for (const row of rows) update.run(makeExcerpt(row.summary, row.content), row.id);
        lastId = rows[rows.length - 1].id;
      }
    },
  },
];
