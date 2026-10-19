import { marked } from 'marked';

// Turns a newsletter's Markdown, whatever its shape, into an "issue": a
// headline, an opening paragraph, dateline-style meta lines, and sections of
// blocks. Nothing is dropped: anything unrecognized stays a paragraph.
//
// Block kinds: paragraph { md, label? }, list { items: [{ md, label? }] },
// quote { md }. md is inline Markdown; label is a leading "**Label:**" run.

const plain = (md) => md
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[*_`~]+/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const words = (text) => (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

// "**Label:** rest" → { label: 'Label', md: 'rest' }; else { md }.
function splitLabel(md) {
  const m = md.match(/^\s*\*\*([^*]{1,60}?)[:：]?\s*\*\*[:：]?\s+(\S[\s\S]*)$/);
  return m ? { label: m[1].trim(), md: m[2].trim() } : { md: md.trim() };
}

// A paragraph that is only bold text ("**Adlerian Read:**") acts as a heading.
const boldOnlyHeading = (token) => token.type === 'paragraph'
  && token.tokens?.length === 1 && token.tokens[0].type === 'strong'
  ? plain(token.text).replace(/[:：]\s*$/, '')
  : null;

// A paragraph split before each "**Label:**" run in its middle, so a
// "**Decision Point:** …" tucked into a summary becomes its own labelled block.
const labelledRuns = (md) => md.replace(/\n+/g, ' ').split(/\s+(?=\*\*[^*]{2,40}[:：]\*\*\s)/).filter((run) => run.trim());

const META_LABELS = /^(date|issue|edition|published|to|from|for)$/i;

// The lexer's tokens as a flat list of headings and blocks.
function flatten(tokens) {
  const out = [];
  for (const t of tokens) {
    const bold = boldOnlyHeading(t);
    if (t.type === 'heading') out.push({ type: 'heading', depth: t.depth, text: plain(t.text) });
    else if (bold) out.push({ type: 'heading', depth: 4, text: bold });
    else if (t.type === 'hr') out.push({ type: 'rule' });
    else if (t.type === 'list') out.push({ kind: 'list', items: t.items.map((i) => splitLabel(i.text.replace(/\n+/g, ' '))) });
    else if (t.type === 'blockquote') out.push({ kind: 'quote', md: t.text.replace(/\n+/g, ' ').trim() });
    else if (t.type === 'paragraph' || t.type === 'text') out.push(...labelledRuns(t.text).map((md) => ({ kind: 'paragraph', ...splitLabel(md) })));
    else if (t.type === 'code' || t.type === 'table' || t.type === 'html') out.push({ kind: 'paragraph', md: plain(t.raw) });
  }
  return out;
}

const blockText = (b) => (b.kind === 'list'
  ? b.items.map((i) => plain(`${i.label ? `${i.label}: ` : ''}${i.md}`)).join(' ')
  : plain(`${b.label ? `${b.label}: ` : ''}${b.md}`));

function sectionStats(blocks) {
  const text = blocks.map(blockText).join(' ');
  const listItems = blocks.filter((b) => b.kind === 'list').reduce((n, b) => n + b.items.length, 0);
  const listWords = words(blocks.filter((b) => b.kind === 'list').map(blockText).join(' '));
  return {
    words: words(text),
    paragraphs: blocks.filter((b) => b.kind === 'paragraph').length,
    listItems,
    listShare: words(text) ? listWords / words(text) : 0,
    quotes: blocks.filter((b) => b.kind === 'quote').length,
  };
}

// Takes the headline (the first heading before any long text) off the front.
function takeHeadline(items, fallbackTitle) {
  const first = items.findIndex((i) => i.type === 'heading');
  const beforeIt = items.slice(0, Math.max(first, 0)).filter((i) => i.kind);
  if (first >= 0 && first <= 2 && beforeIt.every((b) => blockText(b).length < 200)) {
    return { headline: items[first].text, rest: [...items.slice(0, first), ...items.slice(first + 1)] };
  }
  return { headline: fallbackTitle || '', rest: items };
}

// Meta lines ("**Date:** …") and the opening paragraph, from the front.
function takeOpening(items) {
  const meta = [];
  let i = 0;
  while (items[i]?.kind === 'paragraph' && items[i].label && META_LABELS.test(items[i].label)) {
    meta.push({ label: items[i].label, md: items[i].md });
    i += 1;
  }
  const standfirst = items[i]?.kind === 'paragraph' ? items[i] : null;
  return { meta, standfirst, rest: items.slice(i + (standfirst ? 1 : 0)) };
}

function toSections(items) {
  const sections = [];
  let current = null;
  const start = (heading, depth) => {
    current = { heading, depth, blocks: [] };
    sections.push(current);
  };
  for (const item of items) {
    if (item.type === 'heading') start(item.text, item.depth);
    else if (item.type === 'rule') current = null;
    else {
      if (!current) start(null, null);
      current.blocks.push(item);
    }
  }
  return sections
    .filter((s) => s.blocks.length > 0 || s.heading)
    .map((s, n) => ({ id: `s${n + 1}`, ...s, heading: s.heading?.replace(/[:：]\s*$/, '') ?? null, stats: sectionStats(s.blocks) }));
}

/**
 * The issue for a newsletter's Markdown: { headline, meta, standfirst,
 * sections: [{ id, heading, depth, blocks, stats }], quote candidates, words }.
 * fallbackTitle is used when the Markdown has no headline of its own.
 */
export function parseIssue(md, fallbackTitle = '') {
  const items = flatten(marked.lexer(md || ''));
  const { headline, rest } = takeHeadline(items, fallbackTitle);
  const { meta, standfirst, rest: body } = takeOpening(rest);
  const sections = toSections(body);
  return {
    headline,
    meta,
    standfirst,
    sections,
    words: words([standfirst ? blockText(standfirst) : '', ...sections.map((s) => s.blocks.map(blockText).join(' '))].join(' ')),
  };
}

// Sentences: a stop followed by a space and a capital or opening quote, so
// "e.g. crafting" and "U.S. markets" don't split.
const sentences = (text) => text.split(/(?<=[.!?][”"’)]?)\s+(?=[\p{Lu}“"‘(])/u).map((s) => s.trim()).filter(Boolean);

/** Sentences that could stand alone as a pull quote, in reading order, with their section. */
export function quoteCandidates(issue, max = 8) {
  const found = [];
  for (const section of issue.sections) {
    for (const block of section.blocks) {
      if (block.kind === 'quote') found.unshift({ text: plain(block.md), sectionId: section.id, given: true });
      if (block.kind !== 'paragraph') continue;
      for (const s of sentences(plain(block.md))) {
        if (s.length >= 40 && s.length <= 150 && !/^(this|these|they|that)\b/i.test(s)) found.push({ text: s, sectionId: section.id });
      }
    }
  }
  return found.slice(0, max);
}

export { plain as plainText, words as countWords, blockText };
