import { Router } from 'express';
import {
  createFolder, listFolders, updateFolderById, removeFolderById, removeFolderAndFeedsById,
  findFolderByName,
  createFeed, listFeeds, getFeed, getFeedByUrl, updateFeed, removeFeed,
  bulkInsertArticles, getArticles, getArticleById, findArticleByLink,
  updateArticle, bulkUpdateArticles, getArticlesByAiStatus, getUnprocessedForFeed,
  getQueueCount, resetProcessingToQueued, getCounts, clearAll,
  DB_PATH,
} from '../db/reader.js';

const router = Router();

// ── Folders ───────────────────────────────────────────────────────────────────

router.get('/folders', (req, res) => {
  try { res.json(listFolders()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/folders', (req, res) => {
  const { name, order } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try { res.status(201).json(createFolder({ name: name.trim(), order })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Find-or-create a folder by name (used by OPML import)
router.post('/folders/find-or-create', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const existing = findFolderByName(name.trim());
    if (existing) return res.json(existing);
    res.status(201).json(createFolder({ name: name.trim() }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/folders/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const updated = updateFolderById(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Feeds ─────────────────────────────────────────────────────────────────────

router.get('/feeds', (req, res) => {
  try {
    const folderId = req.query.folder_id !== undefined ? Number(req.query.folder_id) : undefined;
    res.json(listFeeds(folderId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/feeds/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const feed = getFeed(id);
    if (!feed) return res.status(404).json({ error: 'Not found' });
    res.json(feed);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/feeds', (req, res) => {
  const { url } = req.body;
  if (!url?.trim()) return res.status(400).json({ error: 'url is required' });
  try { res.status(201).json(createFeed(req.body)); }
  catch (err) {
    if (err.message === 'Feed already exists') return res.status(409).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.put('/feeds/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const updated = updateFeed(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/feeds/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try { removeFeed(id); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Articles ──────────────────────────────────────────────────────────────────

// These specific routes must come before /:id

router.get('/articles/counts', (req, res) => {
  try { res.json(getCounts()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/articles/queue-count', (req, res) => {
  try { res.json({ count: getQueueCount() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/articles/by-ai-status', (req, res) => {
  const { status } = req.query;
  if (!status) return res.status(400).json({ error: 'status is required' });
  try { res.json(getArticlesByAiStatus(status.split(','))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/articles/unprocessed', (req, res) => {
  const feedId = Number(req.query.feedId);
  const limit = Number(req.query.limit) || 10;
  if (!Number.isInteger(feedId)) return res.status(400).json({ error: 'feedId is required' });
  try { res.json(getUnprocessedForFeed(feedId, limit)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/articles/by-link', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const article = findArticleByLink(url);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/articles', (req, res) => {
  const { view = 'all', id } = req.query;
  try { res.json(getArticles(view, id ? Number(id) : undefined)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/articles/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const article = getArticleById(id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/articles/bulk-insert', (req, res) => {
  const { feedId, articles } = req.body;
  if (!feedId || !Array.isArray(articles)) {
    return res.status(400).json({ error: 'feedId and articles[] are required' });
  }
  try { res.status(201).json({ inserted: bulkInsertArticles(feedId, articles) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/articles/bulk-update', (req, res) => {
  const { ids, ...fields } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids[] is required' });
  }
  try { bulkUpdateArticles(ids, fields); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/articles/reset-processing', (req, res) => {
  try { resetProcessingToQueued(); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/articles/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const updated = updateArticle(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Misc ──────────────────────────────────────────────────────────────────────

router.delete('/all', (req, res) => {
  try { clearAll(); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/db-path', (req, res) => {
  res.json({ path: DB_PATH });
});

export default router;
