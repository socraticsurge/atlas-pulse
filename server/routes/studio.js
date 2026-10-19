import { Router } from 'express';
import {
  createStudioItem, deleteStudioItem, getStudioItem, listStudioItems, updateStudioItem,
} from '../db/studio.js';
import { parseEdit, parseExport, parseNewItem } from './studioInput.js';
import { exportPage } from './pageExport.js';

const router = Router();

const notFound = (res) => res.status(404).json({ error: 'Not found' });

// Every /:id route gets a valid positive id as req.itemId, or a 400.
router.param('id', (req, res, next, raw) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid id' });
  req.itemId = id;
  return next();
});

// Runs a handler, answering 500 with the message if it throws.
const guarded = (handler) => (req, res) => {
  try {
    return handler(req, res);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Parses the body with `parse`, answering 400 on a bad request, else runs handler(req, res, value).
const withBody = (parse, handler) => guarded((req, res) => {
  const { value, error } = parse(req.body);
  return error ? res.status(400).json({ error }) : handler(req, res, value);
});

/** GET /api/studio — every item, newest edit first (no bodies). */
router.get('/', guarded((req, res) => res.json(listStudioItems())));

/** GET /api/studio/:id — one item with its body and sources. */
router.get('/:id', guarded((req, res) => {
  const item = getStudioItem(req.itemId);
  return item ? res.json(item) : notFound(res);
}));

/** POST /api/studio — save a new item. */
router.post('/', withBody(parseNewItem, (req, res, value) => res.status(201).json(createStudioItem(value))));

/** PUT /api/studio/:id — edit the title, body and/or design. */
router.put('/:id', withBody(parseEdit, (req, res, value) => {
  const item = updateStudioItem(req.itemId, value);
  return item ? res.json(item) : notFound(res);
}));

/** POST /api/studio/:id/export { format, design?, origin } — the page as a PNG or PDF download. */
router.post('/:id/export', withBody(parseExport, (req, res, value) => {
  const item = getStudioItem(req.itemId);
  return item ? exportPage(item, value, res) : notFound(res);
}));

/** DELETE /api/studio/:id */
router.delete('/:id', guarded((req, res) => (deleteStudioItem(req.itemId) ? res.json({ ok: true }) : notFound(res))));

export default router;
