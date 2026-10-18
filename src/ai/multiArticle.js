// Multi-article AI actions: Compare, Newsletter, Briefing.
import { fetchAIModels, withFullContent } from '../utils/api.js';
import { isNanoModel, fitToNanoContext } from '../utils/chromeAI.js';
import { getBatchSettings } from '../utils/batchSettings.js';
import { pickBatchModel } from './batch.js';
import { buildSystemPrompt, getAISettings } from '../utils/aiSettings.js';
import { htmlToText } from '../utils/helpers.js';

export const MAX_CHARS_PER_ARTICLE = 1200;

const COMPARE_SYSTEM = `You are a media analyst comparing how different sources cover the same topic.\n\nFor each dimension below, show how each article approaches it — reference the source by name:\n\n1. **Angle & Framing** — What perspective does each source emphasize?\n2. **Key Claims** — What are the main factual claims?\n3. **What's Missing** — What does each source omit or downplay?\n4. **Tone** — How does the language differ?\n5. **Evidence** — What sources or data does each cite?\n\nUse markdown with clear headers. Be specific and grounded in the text.`;

const NEWSLETTER_STYLES = {
  digest:  'Write a concise daily digest. Keep summaries to 2-3 sentences each. Informative tone. One-line intro and brief closing.',
  roundup: 'Write a weekly roundup. Include more context and commentary. Group related stories if applicable. Conversational yet professional.',
  brief:   'Write an executive briefing. Lead with the most critical stories. Use bullet points for key takeaways. Be direct; focus on strategic implications.',
};

const BRIEFING_SYSTEM = `You are an expert analyst. Answer the user's question using only information from the provided articles. Be precise. Cite which article supports each point by source name.`;

const optional = (label, text) => (text ? `\n\n${label}: ${text}` : '');

// Per operation: system prompt and user message. Unknown operations fall back to briefing.
const OPERATION_PROMPTS = {
  compare: {
    system: () => COMPARE_SYSTEM,
    user: (ctx, count, instructions) =>
      `${ctx}\n\n---\nCompare these ${count} articles across the dimensions above.${optional('Additional focus', instructions)}`,
  },
  newsletter: {
    system: (template) =>
      `You are a professional newsletter writer creating a curated digest.\n\n${NEWSLETTER_STYLES[template] || NEWSLETTER_STYLES.digest}\n\nFormat with clear markdown headers (## for section titles), bullet points for takeaways, and attribution for each story.`,
    user: (ctx, count, instructions) =>
      `${ctx}\n\n---\nWrite the newsletter from these ${count} articles.${optional('Additional instructions', instructions)}`,
  },
  briefing: {
    system: () => BRIEFING_SYSTEM,
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
export function multiArticleMessages(request, charsPerArticle = MAX_CHARS_PER_ARTICLE, settings = getAISettings()) {
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
    { maxChars: MAX_CHARS_PER_ARTICLE },
  );
  const notice = trimmed
    ? `To fit Gemini Nano, each article was shortened to its first ${chars.toLocaleString()} characters.`
    : null;
  return { model, messages: build(chars), notice };
}
