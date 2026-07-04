import * as cheerio from 'cheerio';
import { assertPublicHttpUrl, safeFetch } from './urlGuard.js';

const COMMON_FEED_PATHS = [
  '/feed',
  '/feed/',
  '/rss',
  '/rss/',
  '/atom.xml',
  '/feed.xml',
  '/rss.xml',
  '/index.xml',
  '/feeds/posts/default',       // Blogger
  '/feed/atom',
  '/?feed=rss2',                // WordPress
  '/wp-json/wp/v2/posts?_fields=link',
];

/**
 * Discover RSS/Atom feed URLs from a given website URL.
 */
export async function discoverFeeds(websiteUrl) {
  const feeds = [];
  // Rejects loopback/private/link-local targets before any server-side fetch.
  const baseUrl = await assertPublicHttpUrl(websiteUrl);

  // Step 1: Fetch the HTML and look for <link rel="alternate"> tags
  try {
    const response = await safeFetch(baseUrl.href, {
      headers: {
        'User-Agent': 'RSS-Feed-Reader/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);

      // Find RSS/Atom link tags
      $('link[type="application/rss+xml"], link[type="application/atom+xml"], link[type="application/feed+json"]').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).attr('title') || '';
        if (href) {
          const feedUrl = new URL(href, baseUrl).href;
          feeds.push({ url: feedUrl, title, type: 'discovered' });
        }
      });

      // Look for common RSS link patterns in anchor tags
      $('a[href*="rss"], a[href*="feed"], a[href*="atom"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes('/rss') || href.includes('/feed') || href.includes('/atom') || href.includes('.xml'))) {
          const feedUrl = new URL(href, baseUrl).href;
          if (!feeds.some(f => f.url === feedUrl)) {
            feeds.push({ url: feedUrl, title: $(el).text().trim() || '', type: 'link' });
          }
        }
      });
    }
  } catch {
    // HTML fetch failed, continue with probe
  }

  // Step 2: If no feeds found, probe common paths
  if (feeds.length === 0) {
    const probePromises = COMMON_FEED_PATHS.map(async (path) => {
      const probeUrl = new URL(path, baseUrl).href;
      try {
        const resp = await safeFetch(probeUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'RSS-Feed-Reader/1.0' },
          signal: AbortSignal.timeout(5000),
        });

        const contentType = resp.headers.get('content-type') || '';
        if (
          resp.ok &&
          (contentType.includes('xml') ||
            contentType.includes('rss') ||
            contentType.includes('atom') ||
            contentType.includes('json'))
        ) {
          return { url: probeUrl, title: '', type: 'probed' };
        }
      } catch {
        // Probe failed
      }
      return null;
    });

    const results = await Promise.all(probePromises);
    results.forEach((r) => {
      if (r && !feeds.some((f) => f.url === r.url)) {
        feeds.push(r);
      }
    });
  }

  return feeds;
}
