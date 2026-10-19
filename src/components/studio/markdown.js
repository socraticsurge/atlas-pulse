import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Its own DOMPurify instance, so the link rule below doesn't touch the reader's.
const purify = DOMPurify(window);
// Links in a preview open in a new tab instead of navigating the app away.
purify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/** Markdown (GitHub flavoured) as sanitized HTML. */
export function renderMarkdown(md) {
  return purify.sanitize(marked.parse(md || '', { gfm: true, async: false }));
}
