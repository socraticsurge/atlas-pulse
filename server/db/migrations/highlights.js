// Schema history for highlights.db. Never edit a shipped migration; append a new one.
export const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial schema: highlights',
    up: (db) => db.exec(`
  CREATE TABLE IF NOT EXISTS highlights (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at       TEXT    NOT NULL,
    article_url      TEXT,
    article_title    TEXT,
    article_source   TEXT,
    highlighted_text TEXT    NOT NULL,
    note             TEXT,
    color            TEXT
  )
  `),
  },
];
