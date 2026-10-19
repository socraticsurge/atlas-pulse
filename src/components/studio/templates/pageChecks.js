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

function holeAndRowProblems(root, scale) {
  const out = [];
  const blocks = textBlocks(root).map((el) => ({ el, r: box(el) })).sort((a, b) => a.r.top - b.r.top);
  for (let i = 1; i < blocks.length; i += 1) {
    const prev = blocks[i - 1].r;
    const { r } = blocks[i];
    const gap = (r.top - prev.bottom) / scale;
    if (gap > MAX_GAP) out.push({ rule: 'hole', detail: `${Math.round(gap)} px gap before “${blocks[i].el.textContent.slice(0, 40)}”` });
    const sideBySide = r.top < prev.bottom - 2 && (r.left >= prev.right - 2 || r.right <= prev.left + 2);
    if (sideBySide && !blocks[i].el.contains(blocks[i - 1].el) && !blocks[i - 1].el.contains(blocks[i].el)) out.push({ rule: 'one-path', detail: 'two text blocks side by side' });
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
