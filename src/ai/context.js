import { htmlToText } from '../utils/helpers.js';

// Character budgets for article text sent to a model.
export const LIMITS = { article: 6000, analysis: 4000, perArticle: 1200 };

export function truncate(text, max) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/** Best available plain text: extracted full text, else RSS content, else summary. */
export function articleText(article, extractedContent) {
  return htmlToText(extractedContent || article?.content || article?.summary || '');
}

/** Article with title/author/date header, for summaries and chat. */
export function articleContext(article, extractedContent) {
  const published = article?.publishedAt ? new Date(article.publishedAt).toDateString() : 'Unknown';
  return `Title: ${article?.title || 'Unknown'}
Author: ${article?.author || 'Unknown'}
Published: ${published}

${truncate(articleText(article, extractedContent), LIMITS.article)}`;
}

/** Title plus truncated text, for classification. */
export function titledText(article, extractedContent, max = LIMITS.analysis) {
  return `Title: ${article.title}\n\n${truncate(articleText(article, extractedContent), max)}`;
}
