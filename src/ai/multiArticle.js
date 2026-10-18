// Multi-article AI actions: Compare, Newsletter, Briefing.
import { fetchAIModels, withFullContent } from '../utils/api.js';
import { isNanoModel, fitToNanoContext } from '../utils/chromeAI.js';
import { getBatchSettings } from '../utils/batchSettings.js';
import { pickBatchModel } from './batch.js';
import { buildSystemPrompt, getAISettings } from '../utils/aiSettings.js';
import { htmlToText } from '../utils/helpers.js';
import { getLimit } from './limits.js';
import { getPrompt } from './promptRegistry.js';

// Default style when a newsletter template is unknown.
const DEFAULT_STYLE = 'digest';
const STYLES = new Set(['digest', 'roundup', 'brief']);
const newsletterSystem = (template) => getPrompt('newsletter')
  .replace('{style}', getPrompt(`newsletter-${STYLES.has(template) ? template : DEFAULT_STYLE}`));

const optional = (label, text) => (text ? `\n\n${label}: ${text}` : '');

// Per operation: system prompt and user message. Unknown operations fall back to briefing.
const OPERATION_PROMPTS = {
  compare: {
    system: () => getPrompt('compare'),
    user: (ctx, count, instructions) =>
      `${ctx}\n\n---\nCompare these ${count} articles across the dimensions above.${optional('Additional focus', instructions)}`,
  },
  newsletter: {
    system: newsletterSystem,
    user: (ctx, count, instructions) =>
      `${ctx}\n\n---\nWrite the newsletter from these ${count} articles.${optional('Additional instructions', instructions)}`,
  },
  briefing: {
    system: () => getPrompt('briefing'),
    user: (ctx, _count, instructions) =>
      `${ctx}\n\n---\n${instructions || 'Summarize the key themes across these articles.'}`,
  },
};

export function multiArticleContext(articles, charsPerArticle) {
  return articles.map((a, i) => {
    const content = htmlToText(a.content || a.summary || '').slice(0, charsPerArticle);
    const date = a.publishedAt ? new Date(a.publishedAt).toDateString() : 'Unknown';
    return `=== ARTICLE ${i + 1} ===\nTitle: ${a.title || 'Untitled'}\nSource: ${a.feedTitle || 'Unknown'}\nPublished: ${date}\nURL: ${a.link || ''}\n\n${content}`;
  }).join('\n\n');
}

/** request: { operation, template, instructions, articles } */
export function multiArticleMessages(request, charsPerArticle = getLimit('perArticle'), settings = getAISettings()) {
  const { operation, template, instructions, articles } = request;
  const prompts = OPERATION_PROMPTS[operation] || OPERATION_PROMPTS.briefing;
  const ctx = multiArticleContext(articles, charsPerArticle);
  return [
    { role: 'system', content: buildSystemPrompt(prompts.system(template), settings) },
    { role: 'user',   content: prompts.user(ctx, articles.length, instructions) },
  ];
}

const NO_MODEL_ERROR = 'No AI model available. Open Atlas Pulse in Google Chrome for Gemini Nano, or set up Ollama in Settings → AI Processing.';

// The batch model from Settings if it is still available, otherwise (or for
// "Auto") the first available model, Gemini Nano when present.
async function resolveModel() {
  const { models } = await fetchAIModels().catch(() => ({ models: [] }));
  return pickBatchModel(getBatchSettings().model, models);
}

/**
 * Picks the model and builds the messages. Gemini Nano has a small context
 * window, so for Nano every article is shortened evenly until the whole
 * selection fits, rather than failing or dropping articles.
 * Returns { model, messages, notice }; throws with a user-facing message.
 */
export async function prepareMultiArticleRequest(request) {
  const model = await resolveModel();
  if (!model) throw new Error(NO_MODEL_ERROR);
  const full = { ...request, articles: await withFullContent(request.articles) };
  const build = (chars) => multiArticleMessages(full, chars);
  if (!isNanoModel(model)) return { model, messages: build(), notice: null };

  const { chars, trimmed } = await fitToNanoContext(
    build()[0].content,
    (n) => build(n)[1].content,
    { maxChars: getLimit('perArticle') },
  );
  const notice = trimmed
    ? `To fit Gemini Nano, each article was shortened to its first ${chars.toLocaleString()} characters.`
    : null;
  return { model, messages: build(chars), notice };
}
