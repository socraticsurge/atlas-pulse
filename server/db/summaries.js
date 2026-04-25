import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const DB_PATH = join(DATA_DIR, 'summaries.db');

// Ensure data/ folder exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance and concurrent reads
db.pragma('journal_mode = WAL');

db.exec(`
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
`);

const insert = db.prepare(`
  INSERT INTO summaries (
    created_at,
    article_title, article_url, article_author, article_source, article_published_at,
    summary_text,
    ai_model, ai_personas, ai_tone_voice, ai_tone_energy, ai_tone_angle, ai_custom_instructions
  ) VALUES (
    @created_at,
    @article_title, @article_url, @article_author, @article_source, @article_published_at,
    @summary_text,
    @ai_model, @ai_personas, @ai_tone_voice, @ai_tone_energy, @ai_tone_angle, @ai_custom_instructions
  )
`);

const getAll = db.prepare(`
  SELECT * FROM summaries ORDER BY created_at DESC
`);

const getById = db.prepare(`
  SELECT * FROM summaries WHERE id = ?
`);

const deleteById = db.prepare(`
  DELETE FROM summaries WHERE id = ?
`);

export function saveSummary(data) {
  const info = insert.run({
    created_at: new Date().toISOString(),
    article_title: data.article_title || null,
    article_url: data.article_url || null,
    article_author: data.article_author || null,
    article_source: data.article_source || null,
    article_published_at: data.article_published_at || null,
    summary_text: data.summary_text,
    ai_model: data.ai_model || null,
    ai_personas: Array.isArray(data.ai_personas)
      ? JSON.stringify(data.ai_personas)
      : data.ai_personas || null,
    ai_tone_voice: data.ai_tone_voice || null,
    ai_tone_energy: data.ai_tone_energy || null,
    ai_tone_angle: data.ai_tone_angle || null,
    ai_custom_instructions: data.ai_custom_instructions || null,
  });
  return getById.get(info.lastInsertRowid);
}

export function getAllSummaries() {
  return getAll.all();
}

export function removeSummary(id) {
  const result = deleteById.run(id);
  return result.changes > 0;
}

export function buildCSV() {
  const rows = getAll.all();
  const headers = [
    'ID', 'Saved At',
    'Article Title', 'Article URL', 'Article Author', 'Article Source', 'Article Published',
    'Summary',
    'AI Model', 'AI Personas', 'Voice', 'Energy', 'Angle', 'Custom Instructions',
  ];

  const escape = (val) => {
    if (val == null) return '';
    const s = String(val).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };

  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.id,
      escape(r.created_at),
      escape(r.article_title),
      escape(r.article_url),
      escape(r.article_author),
      escape(r.article_source),
      escape(r.article_published_at),
      escape(r.summary_text),
      escape(r.ai_model),
      escape(r.ai_personas),
      escape(r.ai_tone_voice),
      escape(r.ai_tone_energy),
      escape(r.ai_tone_angle),
      escape(r.ai_custom_instructions),
    ].join(',')),
  ];

  return lines.join('\n');
}

export { DB_PATH };
