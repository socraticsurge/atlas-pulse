import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
export const DB_PATH = join(DATA_DIR, 'reader.db');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
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
`);

// ── Row mappers (DB snake_case → client camelCase) ────────────────────────────

function toFolder(row) {
  return { id: row.id, name: row.name, order: row.sort_order, createdAt: row.created_at };
}

function toFeed(row) {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    url: row.url,
    siteUrl: row.site_url,
    favicon: row.favicon,
    description: row.description,
    lastRefreshed: row.last_refreshed,
    createdAt: row.created_at,
  };
}

function toArticle(row) {
  return {
    id: row.id,
    feedId: row.feed_id,
    guid: row.guid,
    title: row.title,
    link: row.link,
    canonicalLink: row.canonical_link,
    publishedAt: row.published_at,
    isRead: row.is_read,
    isBookmarked: row.is_bookmarked,
    content: row.content,
    summary: row.summary,
    author: row.author,
    imageUrl: row.image_url,
    description: row.description,
    aiStatus: row.ai_status,
    aiSummary: row.ai_summary,
    aiAnalysis: row.ai_analysis,
    favicon: row.favicon,
    createdAt: row.created_at,
  };
}

// ── Folders ───────────────────────────────────────────────────────────────────

const stmts = {
  insertFolder: db.prepare(
    `INSERT INTO folders (name, sort_order, created_at) VALUES (@name, @sort_order, @created_at)`
  ),
  updateFolder: db.prepare(
    `UPDATE folders SET name = @name, sort_order = @sort_order WHERE id = @id`
  ),
  deleteFolder: db.prepare(`DELETE FROM folders WHERE id = ?`),
  getAllFolders: db.prepare(`SELECT * FROM folders ORDER BY sort_order, id`),
  getFolderById: db.prepare(`SELECT * FROM folders WHERE id = ?`),
  getFolderByName: db.prepare(`SELECT * FROM folders WHERE name = ?`),
  maxFolderOrder: db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM folders`),
  unlinkFolderFeeds: db.prepare(`UPDATE feeds SET folder_id = NULL WHERE folder_id = ?`),
  getFeedsByFolder: db.prepare(`SELECT id FROM feeds WHERE folder_id = ?`),
  deleteFeedsByFolder: db.prepare(`DELETE FROM feeds WHERE folder_id = ?`),

  insertFeed: db.prepare(
    `INSERT INTO feeds (folder_id, title, url, site_url, favicon, description, last_refreshed, created_at)
     VALUES (@folder_id, @title, @url, @site_url, @favicon, @description, @last_refreshed, @created_at)`
  ),
  updateFeed: db.prepare(
    `UPDATE feeds SET folder_id = @folder_id, title = @title, site_url = @site_url,
     favicon = @favicon, description = @description, last_refreshed = @last_refreshed WHERE id = @id`
  ),
  deleteFeed: db.prepare(`DELETE FROM feeds WHERE id = ?`),
  getAllFeeds: db.prepare(`SELECT * FROM feeds ORDER BY id`),
  getFeedById: db.prepare(`SELECT * FROM feeds WHERE id = ?`),
  getFeedByUrl: db.prepare(`SELECT * FROM feeds WHERE url = ?`),
  getFeedsByFolderId: db.prepare(`SELECT * FROM feeds WHERE folder_id = ?`),
  deleteArticlesByFeed: db.prepare(`DELETE FROM articles WHERE feed_id = ?`),
  deleteArticlesByFeedList: (ids) =>
    db.prepare(`DELETE FROM articles WHERE feed_id IN (${ids.map(() => '?').join(',')})`),

  getArticleById: db.prepare(`SELECT * FROM articles WHERE id = ?`),
  getArticleByLink: db.prepare(`SELECT * FROM articles WHERE link = ? LIMIT 1`),
  getArticlesByFeed: db.prepare(
    `SELECT * FROM articles WHERE feed_id = ? ORDER BY published_at DESC`
  ),
  getAllArticles: db.prepare(`SELECT * FROM articles ORDER BY published_at DESC`),
  getSavedArticles: db.prepare(
    `SELECT * FROM articles WHERE is_bookmarked = 1 ORDER BY published_at DESC`
  ),
  getUnreadByFeed: db.prepare(
    `SELECT feed_id, COUNT(*) AS cnt FROM articles WHERE is_read = 0 GROUP BY feed_id`
  ),
  getSavedCount: db.prepare(`SELECT COUNT(*) AS cnt FROM articles WHERE is_bookmarked = 1`),
  getQueueCount: db.prepare(`SELECT COUNT(*) AS cnt FROM articles WHERE ai_status = 'queued'`),
  clearArticles: db.prepare(`DELETE FROM articles`),
  clearFeeds: db.prepare(`DELETE FROM feeds`),
  clearFolders: db.prepare(`DELETE FROM folders`),
  resetProcessing: db.prepare(
    `UPDATE articles SET ai_status = 'queued' WHERE ai_status = 'processing'`
  ),
};

// ── Folder operations ─────────────────────────────────────────────────────────

export function createFolder(data) {
  const maxRow = stmts.maxFolderOrder.get();
  const order = data.order ?? (maxRow.m + 1);
  const info = stmts.insertFolder.run({
    name: data.name,
    sort_order: order,
    created_at: new Date().toISOString(),
  });
  return toFolder(stmts.getFolderById.get(info.lastInsertRowid));
}

export function listFolders() {
  return stmts.getAllFolders.all().map(toFolder);
}

export function updateFolderById(id, data) {
  const row = stmts.getFolderById.get(id);
  if (!row) return null;
  stmts.updateFolder.run({ id, name: data.name ?? row.name, sort_order: data.order ?? row.sort_order });
  return toFolder(stmts.getFolderById.get(id));
}

export function removeFolderById(id) {
  stmts.unlinkFolderFeeds.run(id);
  return stmts.deleteFolder.run(id).changes > 0;
}

export function removeFolderAndFeedsById(id) {
  db.transaction(() => {
    const feedIds = stmts.getFeedsByFolder.all(id).map(f => f.id);
    for (const feedId of feedIds) stmts.deleteArticlesByFeed.run(feedId);
    stmts.deleteFeedsByFolder.run(id);
    stmts.deleteFolder.run(id);
  })();
  return true;
}

export function findFolderByName(name) {
  const row = stmts.getFolderByName.get(name);
  return row ? toFolder(row) : null;
}

// ── Feed operations ───────────────────────────────────────────────────────────

export function createFeed(data) {
  if (stmts.getFeedByUrl.get(data.url)) throw new Error('Feed already exists');
  const info = stmts.insertFeed.run({
    folder_id: data.folderId ?? null,
    title: data.title,
    url: data.url,
    site_url: data.siteUrl ?? null,
    favicon: data.favicon ?? null,
    description: data.description ?? null,
    last_refreshed: data.lastRefreshed ?? null,
    created_at: new Date().toISOString(),
  });
  return toFeed(stmts.getFeedById.get(info.lastInsertRowid));
}

export function listFeeds(folderId) {
  if (folderId !== undefined) return stmts.getFeedsByFolderId.all(folderId).map(toFeed);
  return stmts.getAllFeeds.all().map(toFeed);
}

export function getFeed(id) {
  const row = stmts.getFeedById.get(id);
  return row ? toFeed(row) : null;
}

export function getFeedByUrl(url) {
  const row = stmts.getFeedByUrl.get(url);
  return row ? toFeed(row) : null;
}

export function updateFeed(id, data) {
  const row = stmts.getFeedById.get(id);
  if (!row) return null;
  stmts.updateFeed.run({
    id,
    folder_id: data.folderId !== undefined ? (data.folderId ?? null) : row.folder_id,
    title: data.title ?? row.title,
    site_url: data.siteUrl ?? row.site_url,
    favicon: data.favicon ?? row.favicon,
    description: data.description ?? row.description,
    last_refreshed: data.lastRefreshed ?? row.last_refreshed,
  });
  return toFeed(stmts.getFeedById.get(id));
}

export function removeFeed(id) {
  db.transaction(() => {
    stmts.deleteArticlesByFeed.run(id);
    stmts.deleteFeed.run(id);
  })();
  return true;
}

// ── Article operations ────────────────────────────────────────────────────────

export function bulkInsertArticles(feedId, items) {
  if (items.length === 0) return 0;

  // SQLite only accepts: numbers, strings, bigints, buffers, null.
  // RSS parsers can return Date objects, arrays, or nested objects — sanitize everything.
  const toStr = (v) => {
    if (v == null) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'bigint') return String(v);
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
  };

  const existingGuids = new Set(
    db.prepare(`SELECT guid FROM articles WHERE feed_id = ?`).all(feedId).map(r => r.guid)
  );

  const candidates = items.filter(a => !existingGuids.has(a.guid || a.link));
  if (candidates.length === 0) return 0;

  const canonicals = candidates.map(a => a.canonicalLink).filter(Boolean);
  let existingCanonicals = new Set();
  if (canonicals.length > 0) {
    const placeholders = canonicals.map(() => '?').join(',');
    existingCanonicals = new Set(
      db.prepare(`SELECT canonical_link FROM articles WHERE canonical_link IN (${placeholders})`)
        .all(...canonicals).map(r => r.canonical_link)
    );
  }

  const toInsert = candidates.filter(
    a => !a.canonicalLink || !existingCanonicals.has(a.canonicalLink)
  );
  if (toInsert.length === 0) return 0;

  const insertOne = db.prepare(
    `INSERT OR IGNORE INTO articles
       (feed_id, guid, title, link, canonical_link, published_at, is_read, is_bookmarked,
        content, summary, author, image_url, description, ai_status, favicon, created_at)
     VALUES
       (@feed_id, @guid, @title, @link, @canonical_link, @published_at, 0, 0,
        @content, @summary, @author, @image_url, @description, 'none', @favicon, @created_at)`
  );

  const now = new Date().toISOString();
  let count = 0;
  db.transaction(() => {
    for (const a of toInsert) {
      const info = insertOne.run({
        feed_id: feedId,
        guid: toStr(a.guid || a.link),
        title: toStr(a.title),
        link: toStr(a.link),
        canonical_link: toStr(a.canonicalLink),
        published_at: toStr(a.publishedAt) || now,
        content: toStr(a.content),
        summary: toStr(a.summary),
        author: toStr(a.author),
        image_url: toStr(a.imageUrl),
        description: toStr(a.description),
        favicon: null,
        created_at: now,
      });
      if (info.changes > 0) count++;
    }
  })();
  return count;
}

export function getArticles(view, id) {
  switch (view) {
    case 'feed':
      return stmts.getArticlesByFeed.all(id).map(toArticle);
    case 'folder': {
      const feedIds = db.prepare(`SELECT id FROM feeds WHERE folder_id = ?`).all(id).map(r => r.id);
      if (feedIds.length === 0) return [];
      const placeholders = feedIds.map(() => '?').join(',');
      return db.prepare(
        `SELECT * FROM articles WHERE feed_id IN (${placeholders}) ORDER BY published_at DESC`
      ).all(...feedIds).map(toArticle);
    }
    case 'saved':
      return stmts.getSavedArticles.all().map(toArticle);
    case 'today': {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return db.prepare(
        `SELECT * FROM articles WHERE published_at >= ? ORDER BY published_at DESC`
      ).all(start.toISOString()).map(toArticle);
    }
    default:
      return stmts.getAllArticles.all().map(toArticle);
  }
}

export function getArticleById(id) {
  const row = stmts.getArticleById.get(id);
  return row ? toArticle(row) : null;
}

export function findArticleByLink(link) {
  const row = stmts.getArticleByLink.get(link);
  return row ? toArticle(row) : null;
}

export function updateArticle(id, data) {
  const fields = [];
  const values = { id };
  if (data.isRead !== undefined)      { fields.push('is_read = @is_read');           values.is_read = data.isRead; }
  if (data.isBookmarked !== undefined){ fields.push('is_bookmarked = @is_bookmarked'); values.is_bookmarked = data.isBookmarked; }
  if (data.aiStatus !== undefined)    { fields.push('ai_status = @ai_status');       values.ai_status = data.aiStatus; }
  if (data.aiSummary !== undefined)   { fields.push('ai_summary = @ai_summary');     values.ai_summary = data.aiSummary; }
  if (data.aiAnalysis !== undefined)  { fields.push('ai_analysis = @ai_analysis');   values.ai_analysis = data.aiAnalysis; }
  if (fields.length === 0) return getArticleById(id);
  db.prepare(`UPDATE articles SET ${fields.join(', ')} WHERE id = @id`).run(values);
  return getArticleById(id);
}

export function bulkUpdateArticles(ids, data) {
  if (ids.length === 0) return;
  const fields = [];
  const values = {};
  if (data.isRead !== undefined)      { fields.push('is_read = @is_read');           values.is_read = data.isRead; }
  if (data.isBookmarked !== undefined){ fields.push('is_bookmarked = @is_bookmarked'); values.is_bookmarked = data.isBookmarked; }
  if (data.aiStatus !== undefined)    { fields.push('ai_status = @ai_status');       values.ai_status = data.aiStatus; }
  if (fields.length === 0) return;
  const placeholders = ids.map((_, i) => `@id${i}`).join(',');
  ids.forEach((id, i) => { values[`id${i}`] = id; });
  db.prepare(`UPDATE articles SET ${fields.join(', ')} WHERE id IN (${placeholders})`).run(values);
}

export function getArticlesByAiStatus(statuses) {
  const arr = Array.isArray(statuses) ? statuses : [statuses];
  const placeholders = arr.map(() => '?').join(',');
  return db.prepare(
    `SELECT * FROM articles WHERE ai_status IN (${placeholders}) ORDER BY published_at DESC`
  ).all(...arr).map(toArticle);
}

export function getUnprocessedForFeed(feedId, limit) {
  return db.prepare(
    `SELECT * FROM articles WHERE feed_id = ? AND (ai_status IS NULL OR ai_status = 'none')
     ORDER BY published_at DESC LIMIT ?`
  ).all(feedId, limit).map(toArticle);
}

export function getQueueCount() {
  return stmts.getQueueCount.get().cnt;
}

export function resetProcessingToQueued() {
  stmts.resetProcessing.run();
}

export function getCounts() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const unreadRows = stmts.getUnreadByFeed.all();
  const unreadByFeed = {};
  let total = 0;
  for (const r of unreadRows) { unreadByFeed[r.feed_id] = r.cnt; total += r.cnt; }
  const savedCount = stmts.getSavedCount.get().cnt;
  const todayCount = db.prepare(
    `SELECT COUNT(*) AS cnt FROM articles WHERE published_at >= ?`
  ).get(start.toISOString()).cnt;
  return { unreadByFeed, total, savedCount, todayCount };
}

export function clearAll() {
  db.transaction(() => {
    stmts.clearArticles.run();
    stmts.clearFeeds.run();
    stmts.clearFolders.run();
  })();
}
