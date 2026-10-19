import { db, DB_PATH } from './database.js';
import { makeExcerpt, searchText, tokenizeQuery } from '../utils/text.js';
import { itemGuid, normalizeDate } from '../utils/articleFields.js';

export { DB_PATH };

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
    lastError: row.last_error ?? null,
    lastErrorAt: row.last_error_at ?? null,
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
    excerpt: row.excerpt,
  };
}

// List views carry only what the list shows: no content/summary/description
// (clients fetch the full article, GET /articles/:id, when it is opened), no
// guid/canonical link/created-at/favicon (the list uses the feed's favicon),
// and the excerpt cut to what a preview line can show.
export const LIST_EXCERPT_CHARS = 200;
export const LIST_COLUMNS = `id, feed_id, title, link, published_at, is_read, is_bookmarked, author,
  image_url, ai_status, ai_summary, ai_analysis, substr(excerpt, 1, ${LIST_EXCERPT_CHARS}) AS excerpt`;

export function toListItem(row) {
  const { content: _content, summary: _summary, description: _description, ...item } = toArticle(row);
  return item;
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
     favicon = @favicon, description = @description, last_refreshed = @last_refreshed,
     last_error = @last_error, last_error_at = @last_error_at WHERE id = @id`
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
    `SELECT ${LIST_COLUMNS} FROM articles WHERE feed_id = ? ORDER BY published_at DESC`
  ),
  getAllArticles: db.prepare(`SELECT ${LIST_COLUMNS} FROM articles ORDER BY published_at DESC`),
  getSavedArticles: db.prepare(
    `SELECT ${LIST_COLUMNS} FROM articles WHERE is_bookmarked = 1 ORDER BY published_at DESC`
  ),
  getUnreadByFeed: db.prepare(
    `SELECT feed_id, COUNT(*) AS cnt FROM articles WHERE is_read = 0 GROUP BY feed_id`
  ),
  getSavedCount: db.prepare(`SELECT COUNT(*) AS cnt FROM articles WHERE is_bookmarked = 1`),
  getQueueCount: db.prepare(`SELECT COUNT(*) AS cnt FROM articles WHERE ai_status = 'queued'`),
  clearArticles: db.prepare(`DELETE FROM articles`),
  clearFeeds: db.prepare(`DELETE FROM feeds`),
  clearFolders: db.prepare(`DELETE FROM folders`),
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

// A field's new value: the given one, or the current one when not given.
// orKeep treats null as "not given"; setOrKeep lets null clear the field.
const orKeep = (value, current) => value ?? current;
const setOrKeep = (value, current) => (value !== undefined ? value : current);

export function updateFeed(id, data) {
  const row = stmts.getFeedById.get(id);
  if (!row) return null;
  stmts.updateFeed.run({
    id,
    folder_id: setOrKeep(data.folderId, row.folder_id) ?? null,
    title: orKeep(data.title, row.title),
    site_url: orKeep(data.siteUrl, row.site_url),
    favicon: orKeep(data.favicon, row.favicon),
    description: orKeep(data.description, row.description),
    last_refreshed: orKeep(data.lastRefreshed, row.last_refreshed),
    last_error: setOrKeep(data.lastError, row.last_error),
    last_error_at: setOrKeep(data.lastErrorAt, row.last_error_at),
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

// SQLite only accepts numbers, strings, bigints, buffers, and null. RSS
// parsers can return Date objects, arrays, or nested objects, so coerce.
function toSqlText(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

function existingCanonicalLinks(links) {
  if (links.length === 0) return new Set();
  const placeholders = links.map(() => '?').join(',');
  return new Set(
    db.prepare(`SELECT canonical_link FROM articles WHERE canonical_link IN (${placeholders})`)
      .all(...links).map(r => r.canonical_link)
  );
}

// Keeps the first item for each key; items without a key are all kept.
function firstPerKey(items, keyOf) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyOf(item);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Items not already stored: by guid within the feed, then by canonical link
// anywhere. Duplicates within the batch itself are dropped the same way.
function unseenItems(feedId, items) {
  const existingGuids = new Set(
    db.prepare(`SELECT guid FROM articles WHERE feed_id = ?`).all(feedId).map(r => r.guid)
  );
  const batch = firstPerKey(firstPerKey(items, itemGuid), (a) => a.canonicalLink);
  const candidates = batch.filter(a => !existingGuids.has(itemGuid(a)));
  const known = existingCanonicalLinks(candidates.map(a => a.canonicalLink).filter(Boolean));
  return candidates.filter(a => !a.canonicalLink || !known.has(a.canonicalLink));
}

function articleRow(feedId, a, now) {
  const summary = toSqlText(a.summary);
  const content = toSqlText(a.content);
  return {
    feed_id: feedId,
    guid: itemGuid(a),
    title: toSqlText(a.title),
    link: toSqlText(a.link),
    canonical_link: toSqlText(a.canonicalLink),
    published_at: normalizeDate(toSqlText(a.publishedAt), now),
    content,
    summary,
    author: toSqlText(a.author),
    image_url: toSqlText(a.imageUrl),
    description: toSqlText(a.description),
    favicon: null,
    created_at: now,
    excerpt: makeExcerpt(summary, content),
  };
}

const insertArticle = db.prepare(
  `INSERT OR IGNORE INTO articles
     (feed_id, guid, title, link, canonical_link, published_at, is_read, is_bookmarked,
      content, summary, author, image_url, description, ai_status, favicon, created_at, excerpt)
   VALUES
     (@feed_id, @guid, @title, @link, @canonical_link, @published_at, 0, 0,
      @content, @summary, @author, @image_url, @description, 'none', @favicon, @created_at, @excerpt)`
);
const indexArticle = db.prepare(`INSERT INTO articles_fts (rowid, body) VALUES (?, ?)`);

/** Stores new items for a feed and indexes them for search; returns how many were added. */
export function bulkInsertArticles(feedId, items) {
  const toInsert = items.length === 0 ? [] : unseenItems(feedId, items);
  if (toInsert.length === 0) return 0;

  const now = new Date().toISOString();
  let count = 0;
  db.transaction(() => {
    for (const a of toInsert) {
      const row = articleRow(feedId, a, now);
      const info = insertArticle.run(row);
      if (info.changes > 0) {
        indexArticle.run(info.lastInsertRowid, searchText(row.summary, row.content));
        count++;
      }
    }
  })();
  return count;
}

// List view of articles (no full content). view: all | feed | folder | saved | today
/**
 * The list for a view, newest first. With afterId, only articles added since
 * (ids are increasing), so a refresh can fetch just what is new.
 */
export function getArticles(view, id, afterId) {
  const rows = viewArticles(view, id);
  return afterId > 0 ? rows.filter((a) => a.id > afterId) : rows;
}

function viewArticles(view, id) {
  switch (view) {
    case 'feed':
      return stmts.getArticlesByFeed.all(id).map(toListItem);
    case 'folder': {
      const feedIds = db.prepare(`SELECT id FROM feeds WHERE folder_id = ?`).all(id).map(r => r.id);
      if (feedIds.length === 0) return [];
      const placeholders = feedIds.map(() => '?').join(',');
      return db.prepare(
        `SELECT ${LIST_COLUMNS} FROM articles WHERE feed_id IN (${placeholders}) ORDER BY published_at DESC`
      ).all(...feedIds).map(toListItem);
    }
    case 'saved':
      return stmts.getSavedArticles.all().map(toListItem);
    case 'today': {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return db.prepare(
        `SELECT ${LIST_COLUMNS} FROM articles WHERE published_at >= ? ORDER BY published_at DESC`
      ).all(start.toISOString()).map(toListItem);
    }
    default:
      return stmts.getAllArticles.all().map(toListItem);
  }
}

// FTS5 query for one search term: phrases match exactly, single words also
// match as prefixes ("cloud" finds "clouds"). Quotes are escaped by doubling.
function ftsTerm(token) {
  const quoted = `"${token.replace(/"/g, '""')}"`;
  return token.includes(' ') ? quoted : `${quoted}*`;
}

const stmtSearchTerm = db.prepare(`SELECT rowid AS id FROM articles_fts WHERE articles_fts MATCH ?`);

/**
 * Full-text body search. Returns the query terms and, aligned by index, the
 * ids of articles whose body contains each term — callers combine these with
 * title/source/topic matches. (Arrays, not an object keyed by user input, so
 * a term like "__proto__" can't touch object prototypes.)
 */
export function searchArticleBodies(query) {
  const tokens = tokenizeQuery(query).slice(0, 10);
  const matches = tokens.map((token) => stmtSearchTerm.all(ftsTerm(token)).map((r) => r.id));
  return { tokens, matches };
}

export function getArticleById(id) {
  const row = stmts.getArticleById.get(id);
  return row ? toArticle(row) : null;
}

export function findArticleByLink(link) {
  const row = stmts.getArticleByLink.get(link);
  return row ? toArticle(row) : null;
}

// Read/bookmark flags arrive as 0/1 or true/false; SQLite can't bind booleans.
const flag = (value) => (value ? 1 : 0);
const BULK_CHUNK = 10000;

export function updateArticle(id, data) {
  const fields = [];
  const values = { id };
  if (data.isRead !== undefined)      { fields.push('is_read = @is_read');           values.is_read = flag(data.isRead); }
  if (data.isBookmarked !== undefined){ fields.push('is_bookmarked = @is_bookmarked'); values.is_bookmarked = flag(data.isBookmarked); }
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
  if (data.isRead !== undefined)      { fields.push('is_read = @is_read');           values.is_read = flag(data.isRead); }
  if (data.isBookmarked !== undefined){ fields.push('is_bookmarked = @is_bookmarked'); values.is_bookmarked = flag(data.isBookmarked); }
  if (data.aiStatus !== undefined)    { fields.push('ai_status = @ai_status');       values.ai_status = data.aiStatus; }
  if (fields.length === 0) return;
  // SQLite allows 32,766 bound variables per statement, so "mark all read" on
  // a large library is split into chunks, all in one transaction.
  db.transaction(() => {
    for (let i = 0; i < ids.length; i += BULK_CHUNK) {
      const chunk = ids.slice(i, i + BULK_CHUNK);
      const placeholders = chunk.map((_, j) => `@id${j}`).join(',');
      const params = { ...values, ...Object.fromEntries(chunk.map((id, j) => [`id${j}`, id])) };
      db.prepare(`UPDATE articles SET ${fields.join(', ')} WHERE id IN (${placeholders})`).run(params);
    }
  })();
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

// When each 'processing' article was claimed (in memory: after a server
// restart every claim is gone, so every 'processing' article is stale).
const claims = new Map();
const CLAIM_STALE_MS = 10 * 60 * 1000;

const claimStmts = {
  nextQueued: db.prepare(`SELECT * FROM articles WHERE ai_status = 'queued' ORDER BY published_at DESC LIMIT 1`),
  markProcessing: db.prepare(`UPDATE articles SET ai_status = 'processing' WHERE id = ?`),
  processingIds: db.prepare(`SELECT id FROM articles WHERE ai_status = 'processing'`),
  requeue: db.prepare(`UPDATE articles SET ai_status = 'queued' WHERE id = ? AND ai_status = 'processing'`),
};

/**
 * Hands the newest queued article to one caller and marks it processing, in
 * one step, so two open tabs never process the same article. Resolves to
 * { article, queued } (queued = how many were waiting), or { article: null }.
 */
export function claimNextQueued(now = Date.now()) {
  return db.transaction(() => {
    const row = claimStmts.nextQueued.get();
    if (!row) return { article: null, queued: 0 };
    const queued = stmts.getQueueCount.get().cnt;
    claimStmts.markProcessing.run(row.id);
    claims.set(row.id, now);
    return { article: toArticle({ ...row, ai_status: 'processing' }), queued };
  })();
}

const isStale = (id, now) => now - (claims.get(id) ?? 0) > CLAIM_STALE_MS;

/**
 * Puts articles left 'processing' back in the queue, but only stale ones (a
 * crashed or closed tab), not those another open tab is working on now.
 */
export function resetProcessingToQueued(now = Date.now()) {
  db.transaction(() => {
    for (const { id } of claimStmts.processingIds.all()) {
      if (!isStale(id, now)) continue;
      claimStmts.requeue.run(id);
      claims.delete(id);
    }
  })();
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

// ── Favicon cache ─────────────────────────────────────────────────────────────

const faviconStmts = {
  get: db.prepare('SELECT type, body, fetched_at FROM favicons WHERE host = ?'),
  put: db.prepare(
    `INSERT INTO favicons (host, type, body, fetched_at) VALUES (@host, @type, @body, @fetchedAt)
     ON CONFLICT(host) DO UPDATE SET type = excluded.type, body = excluded.body, fetched_at = excluded.fetched_at`
  ),
};

/** The cached icon for a host: { type, body, fetchedAt }, type null when the site has none. */
export function getCachedFavicon(host) {
  const row = faviconStmts.get.get(host);
  return row && { type: row.type, body: row.body, fetchedAt: row.fetched_at };
}

export function saveCachedFavicon(host, icon) {
  faviconStmts.put.run({ host, type: icon?.type ?? null, body: icon?.body ?? null, fetchedAt: new Date().toISOString() });
}
