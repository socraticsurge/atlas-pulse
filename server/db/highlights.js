import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const DB_PATH = join(DATA_DIR, 'highlights.db');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
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
`);

const insert = db.prepare(`
  INSERT INTO highlights (created_at, article_url, article_title, article_source, highlighted_text, note, color)
  VALUES (@created_at, @article_url, @article_title, @article_source, @highlighted_text, @note, @color)
`);

const getAll = db.prepare(`SELECT * FROM highlights ORDER BY created_at DESC`);
const getByUrl = db.prepare(`SELECT * FROM highlights WHERE article_url = ? ORDER BY created_at DESC`);
const getById = db.prepare(`SELECT * FROM highlights WHERE id = ?`);
const deleteById = db.prepare(`DELETE FROM highlights WHERE id = ?`);
const countAll = db.prepare(`SELECT COUNT(*) AS count FROM highlights`);

export function saveHighlight(data) {
  const info = insert.run({
    created_at: new Date().toISOString(),
    article_url: data.article_url || null,
    article_title: data.article_title || null,
    article_source: data.article_source || null,
    highlighted_text: data.highlighted_text,
    note: data.note || null,
    color: data.color || 'yellow',
  });
  return getById.get(info.lastInsertRowid);
}

export function getAllHighlights() {
  return getAll.all();
}

export function getHighlightsByArticleUrl(url) {
  return getByUrl.all(url);
}

export function removeHighlight(id) {
  const result = deleteById.run(id);
  return result.changes > 0;
}

export function getHighlightsCount() {
  return countAll.get().count;
}

export function buildCSV() {
  const rows = getAll.all();
  const headers = ['ID', 'Saved At', 'Highlighted Text', 'Note', 'Color', 'Article Title', 'Source', 'Article URL'];

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
      escape(r.highlighted_text),
      escape(r.note),
      escape(r.color),
      escape(r.article_title),
      escape(r.article_source),
      escape(r.article_url),
    ].join(',')),
  ];

  return lines.join('\n');
}

export { DB_PATH };
