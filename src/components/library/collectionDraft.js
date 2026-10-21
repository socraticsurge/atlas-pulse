import { referencesMarkdown } from '../../../shared/citation.js';
import { articleReferences } from './citationModel.js';

// A Studio draft from a collection: the collection's name as the headline,
// its description (or a prompt) as the opening, one section per article
// with your note as "Why it matters", a line of its text, and the link, and
// last the articles as an APA reference list.
// Studio keeps up to 50 sources; the newest saves come first.

export const DRAFT_MAX_ARTICLES = 50;
const EXCERPT_CHARS = 220;

const oneLine = (text) => (text || '').replace(/\s+/g, ' ').trim();

function excerptOf(article) {
  const text = oneLine(article.excerpt);
  return text.length > EXCERPT_CHARS ? `${text.slice(0, EXCERPT_CHARS).trimEnd()}…` : text;
}

function section(article, source) {
  const lines = [`## ${oneLine(article.title) || 'Untitled'}`, ''];
  lines.push(`**Why it matters:** ${oneLine(article.note) || '_Your take here._'}`);
  const excerpt = excerptOf(article);
  if (excerpt) lines.push('', excerpt);
  if (article.link) lines.push('', `[Read at ${source || 'the source'}](${article.link})`);
  return lines.join('\n');
}

/**
 * { title, bodyMd, sources } for POST /api/studio from a collection and its
 * articles (list rows, newest save first); feedOf(article) is its feed.
 */
export function collectionDraft(collection, articles, feedOf) {
  const picked = articles.slice(0, DRAFT_MAX_ARTICLES);
  const sourceOf = (a) => feedOf(a)?.title || '';
  const opening = oneLine(collection.description) || `A draft from your ${collection.name} collection. Write the opening here.`;
  const references = picked.length ? ['## References', referencesMarkdown(articleReferences(picked, feedOf))] : [];
  const bodyMd = [`# ${collection.name}`, opening, ...picked.map((a) => section(a, sourceOf(a))), ...references].join('\n\n') + '\n';
  const sources = picked.map((a) => ({ articleId: a.id, url: a.link || null, title: a.title || null, source: sourceOf(a) || null }));
  return { kind: 'newsletter', title: collection.name, bodyMd, sources };
}
