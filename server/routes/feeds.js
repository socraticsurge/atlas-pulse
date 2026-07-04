import { Router } from 'express';
import { parseFeed } from '../utils/feedParser.js';

const router = Router();

/**
 * POST /api/feeds/parse
 * Parse a single RSS/Atom feed URL.
 * Body: { url: string }
 */
router.post('/parse', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Feed URL is required' });
  }

  try {
    const feed = await parseFeed(url);
    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/feeds/refresh
 * Batch refresh multiple feed URLs.
 * Body: { urls: string[] }
 */
router.post('/refresh', async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Array of feed URLs is required' });
  }

  // Cap the batch so a single request can't fan out into hundreds of
  // parallel server-side fetches.
  if (urls.length > 100) {
    return res.status(400).json({ error: 'Too many feed URLs (max 100 per request)' });
  }

  try {
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        try {
          const feed = await parseFeed(url);
          return { url, success: true, feed };
        } catch (error) {
          return { url, success: false, error: error.message };
        }
      })
    );

    const feeds = results.map((r) => (r.status === 'fulfilled' ? r.value : { url: '', success: false, error: 'Unknown error' }));
    res.json({ feeds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
