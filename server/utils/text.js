const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
};

// Plain-text excerpt length stored per article for list views and search.
export const EXCERPT_LENGTH = 300;

/** Strips tags (repeatedly, so nested fragments can't survive), decodes common entities, collapses whitespace. */
export function htmlToText(html) {
  if (!html) return '';
  let text = String(html);
  let prev;
  do {
    prev = text;
    text = text.replace(/<[^>]*>/g, ' ');
  } while (text !== prev);
  return text
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim();
}

/** Plain-text excerpt from the first non-empty source (RSS summary, then content). */
export function makeExcerpt(...sources) {
  const source = sources.find((s) => s && String(s).trim());
  return htmlToText(source).slice(0, EXCERPT_LENGTH);
}
