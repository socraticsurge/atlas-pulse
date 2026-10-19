// Tests a rendered page against the measurable presentation principles
// (principles.md). Runs in the browser on a live DOM; returns the problems
// found, each { rule, detail }. An empty list means the page passes.

const MEASURE = { min: 55, max: 85 };
const MAX_GAP = 72;

const box = (el) => el.getBoundingClientRect();

// Body paragraphs: characters per line, from height and line height.
function measureProblems(root, scale) {
  const out = [];
  for (const p of root.querySelectorAll('.nl-article .nl-p')) {
    const lineHeight = parseFloat(getComputedStyle(p).lineHeight) * scale;
    const lines = Math.round(box(p).height / lineHeight);
    if (lines < 3) continue;
    const perLine = p.textContent.length / lines;
    if (perLine < MEASURE.min || perLine > MEASURE.max) out.push({ rule: 'measure', detail: `${Math.round(perLine)} characters per line` });
  }
  return out;
}

// The column's text blocks in reading order, top to bottom.
const textBlocks = (root) => [...root.querySelectorAll('.nl-column :is(p, li, h3, blockquote, aside, .nl-kicker)')]
  .filter((el) => !el.closest('aside') || el.tagName === 'ASIDE');

// Two boxes share a row when one starts above the other's bottom and they don't overlap sideways.
const shareRow = (a, b) => b.top < a.bottom - 2 && (b.left >= a.right - 2 || b.right <= a.left + 2);
const nested = (a, b) => a.contains(b) || b.contains(a);

function holeAndRowProblems(root, scale) {
  const out = [];
  const blocks = textBlocks(root).map((el) => ({ el, r: box(el) })).sort((a, b) => a.r.top - b.r.top);
  for (let i = 1; i < blocks.length; i += 1) {
    const prev = blocks[i - 1];
    const next = blocks[i];
    const gap = (next.r.top - prev.r.bottom) / scale;
    if (gap > MAX_GAP) out.push({ rule: 'hole', detail: `${Math.round(gap)} px gap before “${next.el.textContent.slice(0, 40)}”` });
    if (shareRow(prev.r, next.r) && !nested(prev.el, next.el)) out.push({ rule: 'one-path', detail: 'two text blocks side by side' });
  }
  return out;
}

function breakProblems(root) {
  const out = [];
  for (const h of root.querySelectorAll('.nl-column h3')) {
    if (!h.nextElementSibling) out.push({ rule: 'section-break', detail: `heading “${h.textContent.slice(0, 40)}” ends its section` });
  }
  return out;
}

function overflowProblems(root) {
  return [...root.querySelectorAll('*')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible' && el.clientWidth > 0)
    .slice(0, 5)
    .map((el) => ({ rule: 'overflow', detail: `${el.tagName.toLowerCase()} is ${el.scrollWidth - el.clientWidth} px too wide` }));
}

/** Problems on a rendered page (root = the template's root element; scale = any CSS zoom on it). */
export function checkPage(root, scale = 1) {
  return [...measureProblems(root, scale), ...holeAndRowProblems(root, scale), ...breakProblems(root), ...overflowProblems(root)];
}
