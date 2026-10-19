import { styleLabel } from '../../../ai/newsletter.js';

export const NEWSLETTER_NAME = 'The Atlas Pulse';

const longDate = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

/**
 * The masthead lines for a Studio item: its name, issue number, edition (the
 * writing style), date (a "Date:" line in the text, else when it was made),
 * how many articles it came from and which model wrote it.
 */
export function pageMeta(item, issue) {
  const count = item.sources?.length ?? 0;
  return {
    name: NEWSLETTER_NAME,
    issueLabel: `No. ${item.id}`,
    edition: `${styleLabel(item.style) ?? 'Newsletter'} edition`,
    sourceLine: count ? `Curated from ${count} ${count === 1 ? 'article' : 'articles'}` : '',
    date: issue.meta.find((m) => /date/i.test(m.label))?.md ?? longDate(item.createdAt),
    byline: item.model ? `Written with ${item.model.split(':')[0]}` : '',
  };
}
