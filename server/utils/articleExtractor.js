import { extract } from '@extractus/article-extractor';
import { assertPublicHttpUrl } from './urlGuard.js';

/**
 * Extract the full article content from a URL.
 * Returns cleaned, readable HTML content.
 */
const EXTRACTION_TIMEOUT_MS = 15000;

export async function extractArticle(url) {
  try {
    await assertPublicHttpUrl(url);
    const article = await Promise.race([
      extract(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Article extraction timed out')), EXTRACTION_TIMEOUT_MS)
      ),
    ]);

    if (!article) {
      throw new Error('Could not extract article content');
    }

    return {
      title: article.title || '',
      content: article.content || '',
      author: article.author || '',
      publishedAt: article.published || '',
      description: article.description || '',
      image: article.image || '',
      source: article.source || '',
      url: article.url || url,
      ttr: article.ttr || 0, // time to read in seconds
    };
  } catch (error) {
    throw new Error(`Article extraction failed: ${error.message}`, { cause: error });
  }
}
