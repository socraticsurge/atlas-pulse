import { titleFromMarkdown } from '../../ai/newsletter.js';

/**
 * The Studio item for a generated newsletter: its Markdown, how it was made
 * ({ style, model, aiSettings }) and the articles it came from, in order.
 */
export function newsletterItem({ output, style, model, aiSettings, articles }) {
  return {
    kind: 'newsletter',
    title: titleFromMarkdown(output),
    bodyMd: output,
    style,
    model,
    aiSettings,
    sources: articles.map((a) => ({ articleId: a.id ?? null, url: a.link ?? null, title: a.title ?? null, source: a.feedTitle ?? null })),
  };
}
