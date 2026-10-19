import puppeteer from 'puppeteer-core';
import { findChrome, renderPage } from '../utils/pageRenderer.js';

// Sends a Studio item's page as a PNG or PDF download. One export runs at a
// time (each starts a headless Chrome); a second gets 429 until it finishes.

const TYPES = { png: 'image/png', pdf: 'application/pdf' };
let running = false;

const slug = (text) => (text || 'newsletter').normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 80) || 'newsletter';

/** The download's file name: "<title>-<design>.<format>". */
export const exportFilename = (item, { format, design }) => `${slug(item.title)}-${design || item.template || 'broadsheet'}.${format}`;

/** The print page's address for an item, on the origin the app is served from. */
export function printUrl(item, { origin, design }) {
  const params = new URLSearchParams({ id: String(item.id) });
  if (design) params.set('design', design);
  return `${origin}/print.html?${params}`;
}

/**
 * Renders and sends the export. deps: { findChrome, renderPage, launch } —
 * replaceable in tests.
 */
export async function exportPage(item, request, res, deps = { findChrome, renderPage, launch: (o) => puppeteer.launch(o) }) {
  const executablePath = deps.findChrome();
  if (!executablePath) return res.status(501).json({ error: 'Export needs Google Chrome installed (or CHROME_PATH set).' });
  if (running) return res.status(429).json({ error: 'Another export is still running. Try again in a moment.' });
  running = true;
  try {
    const file = await deps.renderPage(printUrl(item, request), request.format, { launch: deps.launch, executablePath });
    res.setHeader('Content-Type', TYPES[request.format]);
    res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(item, request)}"`);
    return res.send(file);
  } catch (err) {
    return res.status(500).json({ error: `Export failed: ${err.message}` });
  } finally {
    running = false;
  }
}
