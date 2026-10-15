import { useCallback, useEffect, useState } from 'react';
import * as api from '../../utils/api.js';
import { useOnKeyChange } from '../../hooks/useOnKeyChange.js';
import { HIGHLIGHT_COLORS } from '../../utils/constants.js';

function clearMarks(container) {
  container.querySelectorAll('mark[data-highlight-id]').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}

function createMark(h) {
  const mark = document.createElement('mark');
  mark.setAttribute('data-highlight-id', String(h.id));
  mark.style.background = HIGHLIGHT_COLORS[h.color] || HIGHLIGHT_COLORS.yellow;
  mark.style.borderRadius = '2px';
  if (h.note) mark.title = h.note;
  mark.textContent = h.highlighted_text;
  return mark;
}

// Wraps the first occurrence of the highlight's text in a <mark>.
function markFirstOccurrence(container, h) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const idx = node.nodeValue.indexOf(h.highlighted_text);
    if (idx === -1) continue;
    const before = node.nodeValue.slice(0, idx);
    const after = node.nodeValue.slice(idx + h.highlighted_text.length);
    const frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));
    frag.appendChild(createMark(h));
    if (after) frag.appendChild(document.createTextNode(after));
    node.parentNode.replaceChild(frag, node);
    return;
  }
}

/** Draws saved highlights onto the rendered article DOM. */
export function applyHighlights(container, highlights) {
  clearMarks(container);
  for (const h of highlights) markFirstOccurrence(container, h);
}

/** Saved highlights for the open article, keyed by its URL. */
export function useArticleHighlights(articleId, link) {
  const [highlights, setHighlights] = useState([]);
  useOnKeyChange(articleId, () => setHighlights([]));

  const reload = useCallback(() => {
    if (!link) return;
    api.fetchHighlightsByArticle(link).then(setHighlights).catch(() => setHighlights([]));
  }, [link]);

  useEffect(() => { reload(); }, [reload]);

  const remove = useCallback(async (id) => {
    await api.deleteHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return { highlights, reload, remove };
}
