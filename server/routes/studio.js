import { Router } from 'express';
import {
  createStudioItem, deleteStudioItem, getStudioItem, listStudioItems, updateStudioItem,
} from '../db/studio.js';
import { parseEdit, parseNewItem } from './studioInput.js';

const router = Router();

const idOf = (req) => {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const fail = (res, err) => res.status(500).json({ error: err.message });

/** GET /api/studio — every item, newest edit first (no bodies). */
router.get('/', (req, res) => {
  try { res.json(listStudioItems()); } catch (err) { fail(res, err); }
});

/** GET /api/studio/:id — one item with its body and sources. */
router.get('/:id', (req, res) => {
  const id = idOf(req);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    const item = getStudioItem(id);
    return item ? res.json(item) : res.status(404).json({ error: 'Not found' });
  } catch (err) { return fail(res, err); }
});

/** POST /api/studio — save a new item. */
router.post('/', (req, res) => {
  const { value, error } = parseNewItem(req.body);
  if (error) return res.status(400).json({ error });
  try { return res.status(201).json(createStudioItem(value)); } catch (err) { return fail(res, err); }
});

/** PUT /api/studio/:id — edit the title and/or body. */
router.put('/:id', (req, res) => {
  const id = idOf(req);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  const { value, error } = parseEdit(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const item = updateStudioItem(id, value);
    return item ? res.json(item) : res.status(404).json({ error: 'Not found' });
  } catch (err) { return fail(res, err); }
});

/** DELETE /api/studio/:id */
router.delete('/:id', (req, res) => {
  const id = idOf(req);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    return deleteStudioItem(id) ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
  } catch (err) { return fail(res, err); }
});

export default router;
