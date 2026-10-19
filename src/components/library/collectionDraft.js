// A Studio draft from a collection: the collection's name as the headline,
// its description (or a prompt) as the opening, and one section per article
// with your note as "Why it matters", a line of its text, and the link.
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
 * articles (list rows, newest save first); sourceOf(article) names its feed.
 */
export function collectionDraft(collection, articles, sourceOf) {
  const picked = articles.slice(0, DRAFT_MAX_ARTICLES);
  const opening = oneLine(collection.description) || `A draft from your ${collection.name} collection. Write the opening here.`;
  const bodyMd = [`# ${collection.name}`, opening, ...picked.map((a) => section(a, sourceOf(a)))].join('\n\n') + '\n';
  const sources = picked.map((a) => ({ articleId: a.id, url: a.link || null, title: a.title || null, source: sourceOf(a) || null }));
  return { kind: 'newsletter', title: collection.name, bodyMd, sources };
}
