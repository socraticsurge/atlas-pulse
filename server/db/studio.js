import { db } from './database.js';

// Studio: AI outputs the reader keeps and edits (newsletters first). Each item
// remembers the articles it was made from. article_id has no foreign key: the
// article can be deleted with its feed, and the item keeps its title and URL.

const LIST_EXCERPT_CHARS = 200;

const stmts = {
  list: db.prepare(`
    SELECT i.id, i.kind, i.title, i.style, i.created_at, i.updated_at,
           substr(i.body_md, 1, ${LIST_EXCERPT_CHARS}) AS excerpt,
           (SELECT COUNT(*) FROM studio_item_sources s WHERE s.item_id = i.id) AS source_count
    FROM studio_items i ORDER BY i.updated_at DESC, i.id DESC
  `),
  get: db.prepare('SELECT * FROM studio_items WHERE id = ?'),
  sources: db.prepare('SELECT * FROM studio_item_sources WHERE item_id = ? ORDER BY position'),
  insert: db.prepare(`
    INSERT INTO studio_items (kind, title, body_md, style, model, ai_settings, created_at, updated_at)
    VALUES (@kind, @title, @body_md, @style, @model, @ai_settings, @now, @now)
  `),
  insertSource: db.prepare(`
    INSERT INTO studio_item_sources (item_id, position, article_id, article_url, article_title, article_source)
    VALUES (@item_id, @position, @article_id, @article_url, @article_title, @article_source)
  `),
  update: db.prepare(`
    UPDATE studio_items
    SET title = COALESCE(@title, title), body_md = COALESCE(@body_md, body_md), template = COALESCE(@template, template), updated_at = @now
    WHERE id = @id
  `),
  delete: db.prepare('DELETE FROM studio_items WHERE id = ?'),
};

const toSummary = (row) => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  style: row.style,
  excerpt: row.excerpt,
  sourceCount: row.source_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSource = (row) => ({
  articleId: row.article_id,
  url: row.article_url,
  title: row.article_title,
  source: row.article_source,
});

function parseSettings(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Every item, most recently edited first, without its body. */
export function listStudioItems() {
  return stmts.list.all().map(toSummary);
}

/** One item with its Markdown body and sources, or null. */
export function getStudioItem(id) {
  const row = stmts.get.get(id);
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    bodyMd: row.body_md,
    style: row.style,
    template: row.template,
    model: row.model,
    aiSettings: parseSettings(row.ai_settings),
    sources: stmts.sources.all(id).map(toSource),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const optional = (value) => value ?? null;

/** Saves a new item and its sources; returns it. */
export const createStudioItem = db.transaction((item) => {
  const { lastInsertRowid: id } = stmts.insert.run({
    kind: item.kind,
    title: item.title,
    body_md: item.bodyMd,
    style: optional(item.style),
    model: optional(item.model),
    ai_settings: item.aiSettings ? JSON.stringify(item.aiSettings) : null,
    now: new Date().toISOString(),
  });
  (item.sources || []).forEach((source, position) => stmts.insertSource.run({
    item_id: id,
    position,
    article_id: optional(source.articleId),
    article_url: optional(source.url),
    article_title: optional(source.title),
    article_source: optional(source.source),
  }));
  return getStudioItem(Number(id));
});

/** Changes an item's title, body and/or page design; returns it, or null if it doesn't exist. */
export function updateStudioItem(id, { title, bodyMd, template }) {
  const { changes } = stmts.update.run({ id, title: optional(title), body_md: optional(bodyMd), template: optional(template), now: new Date().toISOString() });
  return changes ? getStudioItem(id) : null;
}

/** Deletes an item (its sources go with it); false if it didn't exist. */
export function deleteStudioItem(id) {
  return stmts.delete.run(id).changes > 0;
}
