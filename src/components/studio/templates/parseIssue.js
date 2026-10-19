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

// One lexer token as headings and blocks (a paragraph can hold several labelled runs).
const TOKEN_ITEMS = {
  heading: (t) => [{ type: 'heading', depth: t.depth, text: plain(t.text) }],
  hr: () => [{ type: 'rule' }],
  list: (t) => [{ kind: 'list', items: t.items.map((i) => splitLabel(i.text.replace(/\n+/g, ' '))) }],
  blockquote: (t) => [{ kind: 'quote', md: t.text.replace(/\n+/g, ' ').trim() }],
  paragraph: (t) => labelledRuns(t.text).map((md) => ({ kind: 'paragraph', ...splitLabel(md) })),
  text: (t) => labelledRuns(t.text).map((md) => ({ kind: 'paragraph', ...splitLabel(md) })),
  code: (t) => [{ kind: 'paragraph', md: plain(t.raw) }],
  table: (t) => [{ kind: 'paragraph', md: plain(t.raw) }],
  html: (t) => [{ kind: 'paragraph', md: plain(t.raw) }],
};

// The lexer's tokens as a flat list of headings and blocks.
function flatten(tokens) {
  return tokens.flatMap((t) => {
    const bold = boldOnlyHeading(t);
    if (bold) return [{ type: 'heading', depth: 4, text: bold }];
    return TOKEN_ITEMS[t.type]?.(t) ?? [];
  });
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
// The first heading is the headline when it comes early (within the first
// three items) and only short lines precede it.
function headlineIndex(items) {
  const first = items.findIndex((i) => i.type === 'heading');
  const early = first >= 0 && first <= 2;
  return early && items.slice(0, first).every((b) => !b.kind || blockText(b).length < 200) ? first : -1;
}

function takeHeadline(items, fallbackTitle) {
  const at = headlineIndex(items);
  if (at === -1) return { headline: fallbackTitle || '', rest: items };
  return { headline: items[at].text, rest: [...items.slice(0, at), ...items.slice(at + 1)] };
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

// Splits items into sections: a heading starts one, a rule ends one, and
// blocks outside any section start an unheaded one.
function groupSections(items) {
  const sections = [];
  let current = null;
  const open = (heading = null, depth = null) => {
    current = { heading, depth, blocks: [] };
    sections.push(current);
    return current;
  };
  const steps = {
    heading: (item) => open(item.text, item.depth),
    rule: () => { current = null; },
  };
  for (const item of items) {
    const step = steps[item.type];
    if (step) step(item);
    else (current ?? open()).blocks.push(item);
  }
  return sections;
}

function toSections(items) {
  return groupSections(items)
    .filter((s) => s.blocks.length > 0 || s.heading)
    .map((s, n) => ({ id: `s${n + 1}`, ...s, heading: s.heading?.replace(/[:：]\s*$/, '') ?? null, stats: sectionStats(s.blocks) }));
}

/**
 * The issue for a newsletter's Markdown: { headline, meta, standfirst,
 * sections: [{ id, heading, depth, blocks, stats }], words }.
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

