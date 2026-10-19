import { extractFromHtml } from '@extractus/article-extractor';
import * as cheerio from 'cheerio';
import { fetchText } from './fetchText.js';

/**
 * Extract the full article content from a URL.
 * Returns cleaned, readable HTML content.
 */
const EXTRACTION_TIMEOUT_MS = 15000;

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Extractor field -> response field, each defaulting to ''.
const TEXT_FIELDS = {
  title: 'title', content: 'content', author: 'author', published: 'publishedAt',
  description: 'description', image: 'image', source: 'source',
};

/** Shapes an extractor result for the client. */
export function toExtracted(article, url) {
  const result = {};
  for (const [from, to] of Object.entries(TEXT_FIELDS)) result[to] = article[from] || '';
  result.url = article.url || url;
  result.ttr = article.ttr || 0; // time to read in seconds
  return result;
}

/** The largest candidate in a srcset ("a.png 640w, b.png 1400w"), or ''. */
export function largestInSrcset(srcset = '') {
  let best = { url: '', size: -1 };
  for (const candidate of srcset.split(/,\s+/)) {
    const [url, descriptor = ''] = candidate.trim().split(/\s+/);
    const size = Number.parseFloat(descriptor) || 0;
    if (url && size > best.size) best = { url, size };
  }
  return best.url;
}

/**
 * Some sites (Medium among them) put an image's URLs only on the <source>
 * tags of its <picture>, leaving the <img> with no src. Readability takes
 * such an <img> for a placeholder and deletes it, and the emptied <picture>
 * goes with it. Giving the <img> its picture's largest source keeps it.
 * Pages that need no change come back as they were.
 */
export function fillPictureImageSrc(html) {
  if (!/<picture/i.test(html)) return html;
  const $ = cheerio.load(html);
  let filled = 0;
  $('picture img:not([src]):not([srcset])').each((_, el) => {
    const img = $(el);
    const src = largestInSrcset(img.closest('picture').find('source[srcset]').first().attr('srcset'));
    if (src) { img.attr('src', src); filled += 1; }
  });
  return filled ? $.html() : html;
}

// The page is fetched by fetchText (SSRF-guarded on every redirect, with our
// User-Agent and a real timeout), then parsed from the HTML string.
export async function extractArticle(url) {
  try {
    const page = await fetchText(url, { headers: { 'User-Agent': USER_AGENT }, timeoutMs: EXTRACTION_TIMEOUT_MS });
    const article = await extractFromHtml(fillPictureImageSrc(page.text), page.url);
    if (!article) throw new Error('Could not extract article content');
    return toExtracted(article, url);
  } catch (error) {
    throw new Error(`Article extraction failed: ${error.message}`, { cause: error });
  }
}
