import { extract } from '@extractus/article-extractor';
import { assertPublicHttpUrl } from './urlGuard.js';

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

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('Article extraction timed out')), ms));
}

export async function extractArticle(url) {
  try {
    await assertPublicHttpUrl(url);
    const article = await Promise.race([
      extract(url, { headers: { 'User-Agent': USER_AGENT } }),
      timeout(EXTRACTION_TIMEOUT_MS),
    ]);
    if (!article) throw new Error('Could not extract article content');
    return toExtracted(article, url);
  } catch (error) {
    throw new Error(`Article extraction failed: ${error.message}`, { cause: error });
  }
}
