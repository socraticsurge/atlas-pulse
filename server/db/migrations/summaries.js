// Schema history for summaries.db. Never edit a shipped migration; append a new one.
export const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial schema: saved AI summaries',
    up: (db) => db.exec(`
  CREATE TABLE IF NOT EXISTS summaries (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at            TEXT    NOT NULL,

    -- Article metadata
    article_title         TEXT,
    article_url           TEXT,
    article_author        TEXT,
    article_source        TEXT,
    article_published_at  TEXT,

    -- Generated summary
    summary_text          TEXT    NOT NULL,

    -- AI configuration that produced this summary
    ai_model              TEXT,
    ai_personas           TEXT,   -- JSON array, e.g. ["analyst","philosopher"]
    ai_tone_voice         TEXT,
    ai_tone_energy        TEXT,
    ai_tone_angle         TEXT,
    ai_custom_instructions TEXT
  )
  `),
  },
];
