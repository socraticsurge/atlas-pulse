// Newsletter facts shared by the generator (multi-article panel) and Studio.

/** Writing styles a newsletter can be generated in. */
export const NEWSLETTER_STYLES = [
  { id: 'digest', label: 'Daily Digest' },
  { id: 'roundup', label: 'Weekly Roundup' },
  { id: 'brief', label: 'Executive Brief' },
];

export const styleLabel = (id) => NEWSLETTER_STYLES.find((s) => s.id === id)?.label;

export const TITLE_MAX = 200;

// Markdown inline syntax reduced to its text: links, emphasis, code.
const plainInline = (text) => text
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[*_`~]+/g, '')
  .trim();

const dateLabel = (now) => now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** The first #–### heading of the Markdown as plain text, else "Newsletter · <date>". */
export function titleFromMarkdown(md, now = new Date()) {
  const heading = (md || '').split('\n').map((line) => line.match(/^#{1,3}\s+(.+?)\s*#*\s*$/)).find(Boolean);
  const text = heading ? plainInline(heading[1]) : '';
  return (text || `Newsletter · ${dateLabel(now)}`).slice(0, TITLE_MAX);
}
