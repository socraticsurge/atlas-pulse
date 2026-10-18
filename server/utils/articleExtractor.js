import { extractFromHtml } from '@extractus/article-extractor';
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

// The page is fetched by fetchText (SSRF-guarded on every redirect, with our
// User-Agent and a real timeout), then parsed from the HTML string.
export async function extractArticle(url) {
  try {
    const page = await fetchText(url, { headers: { 'User-Agent': USER_AGENT }, timeoutMs: EXTRACTION_TIMEOUT_MS });
    const article = await extractFromHtml(page.text, page.url);
    if (!article) throw new Error('Could not extract article content');
    return toExtracted(article, url);
  } catch (error) {
    throw new Error(`Article extraction failed: ${error.message}`, { cause: error });
  }
}
