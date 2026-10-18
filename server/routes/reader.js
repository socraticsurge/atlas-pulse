import { Router } from 'express';
import {
  createFolder, listFolders, updateFolderById, removeFolderById, removeFolderAndFeedsById,
  findFolderByName,
  createFeed, listFeeds, getFeed, updateFeed, removeFeed,
  bulkInsertArticles, getArticles, getArticleById, findArticleByLink, searchArticleBodies,
  updateArticle, bulkUpdateArticles, getArticlesByAiStatus, getUnprocessedForFeed,
  getQueueCount, resetProcessingToQueued, getCounts, clearAll,
  DB_PATH,
} from '../db/reader.js';

const router = Router();

// A reference to a feed or folder that doesn't exist (deleted meanwhile, or a
// bad id) is the client's mistake, not a server error.
function sendDbError(res, err) {
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') return res.status(404).json({ error: 'Feed or folder not found' });
  return res.status(500).json({ error: err.message });
}

// ── Folders ───────────────────────────────────────────────────────────────────

router.get('/folders', (req, res) => {
  try { res.json(listFolders()); }
  catch (err) { sendDbError(res, err); }
});

router.post('/folders', (req, res) => {
  const { name, order } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try { res.status(201).json(createFolder({ name: name.trim(), order })); }
  catch (err) { sendDbError(res, err); }
});

// Find-or-create a folder by name (used by OPML import)
router.post('/folders/find-or-create', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const existing = findFolderByName(name.trim());
    if (existing) return res.json(existing);
    res.status(201).json(createFolder({ name: name.trim() }));
  } catch (err) { sendDbError(res, err); }
});

router.put('/folders/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const updated = updateFolderById(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) { sendDbError(res, err); }
});

router.delete('/folders/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    if (req.query.withFeeds === 'true') {
      removeFolderAndFeedsById(id);
    } else {
      removeFolderById(id);
    }
    res.json({ ok: true });
  } catch (err) { sendDbError(res, err); }
});

// ── Feeds ─────────────────────────────────────────────────────────────────────

router.get('/feeds', (req, res) => {
  try {
    const folderId = req.query.folder_id !== undefined ? Number(req.query.folder_id) : undefined;
    res.json(listFeeds(folderId));
  } catch (err) { sendDbError(res, err); }
});

router.get('/feeds/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const feed = getFeed(id);
    if (!feed) return res.status(404).json({ error: 'Not found' });
    res.json(feed);
  } catch (err) { sendDbError(res, err); }
});

router.post('/feeds', (req, res) => {
  const { url } = req.body;
  if (!url?.trim()) return res.status(400).json({ error: 'url is required' });
  try { res.status(201).json(createFeed(req.body)); }
  catch (err) {
    if (err.message === 'Feed already exists') return res.status(409).json({ error: err.message });
    sendDbError(res, err);
  }
});

router.put('/feeds/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const updated = updateFeed(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) { sendDbError(res, err); }
});

router.delete('/feeds/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try { removeFeed(id); res.json({ ok: true }); }
  catch (err) { sendDbError(res, err); }
});

// ── Articles ──────────────────────────────────────────────────────────────────

// These specific routes must come before /:id

router.get('/articles/counts', (req, res) => {
  try { res.json(getCounts()); }
  catch (err) { sendDbError(res, err); }
});

router.get('/articles/queue-count', (req, res) => {
  try { res.json({ count: getQueueCount() }); }
  catch (err) { sendDbError(res, err); }
});

router.get('/articles/by-ai-status', (req, res) => {
  const { status } = req.query;
  if (!status) return res.status(400).json({ error: 'status is required' });
  try { res.json(getArticlesByAiStatus(status.split(','))); }
  catch (err) { sendDbError(res, err); }
});

router.get('/articles/unprocessed', (req, res) => {
  const feedId = Number(req.query.feedId);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 500);
  if (!Number.isInteger(feedId)) return res.status(400).json({ error: 'feedId is required' });
  try { res.json(getUnprocessedForFeed(feedId, limit)); }
  catch (err) { sendDbError(res, err); }
});

// Full-text body matches per search term: { tokens: [term], matches: [[ids]] } (aligned by index)
router.get('/articles/search', (req, res) => {
  const q = String(req.query.q || '').slice(0, 500);
  try { res.json(searchArticleBodies(q)); }
  catch (err) { sendDbError(res, err); }
});

router.get('/articles/by-link', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const article = findArticleByLink(url);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (err) { sendDbError(res, err); }
});

router.get('/articles', (req, res) => {
  const { view = 'all', id, after } = req.query;
  try { res.json(getArticles(view, id ? Number(id) : undefined, Number(after) || 0)); }
  catch (err) { sendDbError(res, err); }
});

router.get('/articles/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const article = getArticleById(id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (err) { sendDbError(res, err); }
});

router.post('/articles/bulk-insert', (req, res) => {
  const { feedId, articles } = req.body;
  if (!feedId || !Array.isArray(articles)) {
    return res.status(400).json({ error: 'feedId and articles[] are required' });
  }
  try { res.status(201).json({ inserted: bulkInsertArticles(feedId, articles) }); }
  catch (err) { sendDbError(res, err); }
});

router.put('/articles/bulk-update', (req, res) => {
  const { ids, ...fields } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids[] is required' });
  }
  try { bulkUpdateArticles(ids, fields); res.json({ ok: true }); }
  catch (err) { sendDbError(res, err); }
});

router.post('/articles/reset-processing', (req, res) => {
  try { resetProcessingToQueued(); res.json({ ok: true }); }
  catch (err) { sendDbError(res, err); }
});

router.put('/articles/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const updated = updateArticle(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) { sendDbError(res, err); }
});

// ── Misc ──────────────────────────────────────────────────────────────────────

router.delete('/all', (req, res) => {
  try { clearAll(); res.json({ ok: true }); }
  catch (err) { sendDbError(res, err); }
});

router.get('/db-path', (req, res) => {
  res.json({ path: DB_PATH });
});

export default router;
