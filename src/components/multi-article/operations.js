// Multi-article operations: limits, labels, and the article-count hint.

export const OPERATIONS = {
  compare:    { label: 'Compare',    title: 'Compare Sources',     min: 2, max: 5,  hint: '2–5 articles' },
  newsletter: { label: 'Newsletter', title: 'Generate Newsletter', min: 3, max: 15, hint: '3–15 articles' },
  briefing:   { label: 'Briefing',   title: 'AI Briefing',         min: 2, max: 15, hint: '2–15 articles' },
};

export { NEWSLETTER_STYLES as NEWSLETTER_TEMPLATES } from '../../ai/newsletter.js';

export const countOk = (op, count) => count >= op.min && count <= op.max;

const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`;

/** Status line under the article chips. */
export function countHint(operation, count) {
  const op = OPERATIONS[operation];
  const excess = count - op.max;
  if (operation === 'compare' && excess > 0) {
    return `Compare works best with up to ${op.max} articles — remove ${excess} chip${excess > 1 ? 's' : ''}`;
  }
  if (count < op.min) return `Select at least ${op.min} articles for ${op.label}`;
  return `${plural(count, 'article')} · ${op.hint}`;
}

export function placeholderText(operation) {
  return operation === 'briefing'
    ? 'Enter your prompt above and click Generate'
    : `Click Generate to ${OPERATIONS[operation].title.toLowerCase()}`;
}
