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
];
