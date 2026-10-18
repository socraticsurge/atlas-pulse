import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText } from '../utils/helpers.js';
import { buildSystemPrompt } from '../utils/aiSettings.js';
import { ANALYSIS_PROMPT, BATCH_PROMPT, BASE_SUMMARY, BASE_CHAT } from './prompts.js';
import { articleContext, titledText } from './context.js';
import { summaryMessages, chatMessages, analysisMessages, batchMessages } from './tasks.js';
import { multiArticleMessages } from './multiArticle.js';
import { parseAnalysis, parseBatchResult, lastJSONObject } from './parse.js';

// ── Legacy reference implementations, copied verbatim from v1.4.0 ──────────
// The AI layer refactor must produce byte-identical prompts.
/* eslint-disable */
const LEGACY = (() => {
const BASE_SUMMARY = `You are an editorial reading assistant. Read the article and write a concise, insightful summary in 3–4 sentences. Focus on the key finding or argument, why it matters, and one concrete takeaway. Write in plain prose, no bullet points. Do not start with "This article".`;
const BASE_CHAT = `You are a reading assistant. Answer questions about the article clearly and concisely. Stay grounded in the article content. If something is not covered in the article, say so briefly.`;
const ANALYSIS_PROMPT = `Analyze the article and respond with ONLY a valid JSON object — no markdown, no explanation, no code blocks. Use exactly these fields:
{
  "sentiment": "positive|neutral|negative",
  "urgency": "breaking|developing|evergreen",
  "frame": "conflict|human_interest|economic|analytical",
  "tone": "alarming|analytical|optimistic|opinion",
  "depth": "brief|standard|deep_dive",
  "topics": ["tag1", "tag2", "tag3"]
}`;
const BATCH_SYSTEM_PROMPT = `Analyze the article and respond with ONLY a valid JSON object — no markdown, no explanation, no code blocks. Use exactly these fields:
{
  "summary": "3-4 sentence summary in plain prose. Key finding/argument and one concrete takeaway. Do not start with 'This article'.",
  "sentiment": "positive|neutral|negative",
  "urgency": "breaking|developing|evergreen",
  "frame": "conflict|human_interest|economic|analytical",
  "tone": "alarming|analytical|optimistic|opinion",
  "depth": "brief|standard|deep_dive",
  "topics": ["tag1", "tag2", "tag3"]
}`;
function legacyArticleContext(article, extractedContent) {
  const content = htmlToText(extractedContent || article?.content || article?.summary || '');
  const truncated = content.length > 6000 ? content.slice(0, 6000) + '…' : content;
  return `Title: ${article?.title || 'Unknown'}
Author: ${article?.author || 'Unknown'}
Published: ${article?.publishedAt ? new Date(article.publishedAt).toDateString() : 'Unknown'}

${truncated}`;
}

function legacyMultiContext(articles, charsPerArticle) {
  return articles.map((a, i) => {
    const content = htmlToText(a.content || a.summary || '').slice(0, charsPerArticle);
    const date = a.publishedAt ? new Date(a.publishedAt).toDateString() : 'Unknown';
    return `=== ARTICLE ${i + 1} ===\nTitle: ${a.title || 'Untitled'}\nSource: ${a.feedTitle || 'Unknown'}\nPublished: ${date}\nURL: ${a.link || ''}\n\n${content}`;
  }).join('\n\n');
}

function legacyMultiMessages(request, charsPerArticle, aiSettings) {
  const { operation, template, instructions, articles } = request;
  const articleContext = legacyMultiContext(articles, charsPerArticle);
  let basePrompt, userMessage;

  if (operation === 'compare') {
    basePrompt = `You are a media analyst comparing how different sources cover the same topic.\n\nFor each dimension below, show how each article approaches it — reference the source by name:\n\n1. **Angle & Framing** — What perspective does each source emphasize?\n2. **Key Claims** — What are the main factual claims?\n3. **What's Missing** — What does each source omit or downplay?\n4. **Tone** — How does the language differ?\n5. **Evidence** — What sources or data does each cite?\n\nUse markdown with clear headers. Be specific and grounded in the text.`;
    userMessage = `${articleContext}\n\n---\nCompare these ${articles.length} articles across the dimensions above.${instructions ? `\n\nAdditional focus: ${instructions}` : ''}`;
  } else if (operation === 'newsletter') {
    const templateInstructions = {
      digest:   'Write a concise daily digest. Keep summaries to 2-3 sentences each. Informative tone. One-line intro and brief closing.',
      roundup:  'Write a weekly roundup. Include more context and commentary. Group related stories if applicable. Conversational yet professional.',
      brief:    'Write an executive briefing. Lead with the most critical stories. Use bullet points for key takeaways. Be direct; focus on strategic implications.',
    };
    basePrompt = `You are a professional newsletter writer creating a curated digest.\n\n${templateInstructions[template] || templateInstructions.digest}\n\nFormat with clear markdown headers (## for section titles), bullet points for takeaways, and attribution for each story.`;
    userMessage = `${articleContext}\n\n---\nWrite the newsletter from these ${articles.length} articles.${instructions ? `\n\nAdditional instructions: ${instructions}` : ''}`;
  } else {
    basePrompt = `You are an expert analyst. Answer the user's question using only information from the provided articles. Be precise. Cite which article supports each point by source name.`;
    userMessage = `${articleContext}\n\n---\n${instructions || 'Summarize the key themes across these articles.'}`;
  }

  return [
    { role: 'system', content: buildSystemPrompt(basePrompt, aiSettings) },
    { role: 'user',   content: userMessage },
  ];
}

  return { BASE_SUMMARY, BASE_CHAT, ANALYSIS_PROMPT, BATCH_SYSTEM_PROMPT, legacyArticleContext, legacyMultiMessages };
})();
/* eslint-enable */

const settings = { personas: ['analyst', 'skeptic'], tone: { voice: 'formal', energy: 'reflective', angle: 'cautionary' }, customInstructions: 'Be brief.' };
const article = {
  id: 1, title: 'Cloud costs', author: 'A. Writer', publishedAt: '2026-10-01T10:00:00Z', link: 'https://e.com/a', feedTitle: 'Infra Weekly',
  content: `<p>${'Body text. '.repeat(900)}</p>`, summary: '<p>Short summary</p>',
};
const articles = [article, { ...article, id: 2, title: 'Second', content: null, summary: '<b>Only summary</b>' }, { ...article, id: 3, title: 'Third', content: '' }];

test('prompts are byte-identical to v1.4.0', () => {
  assert.equal(BASE_SUMMARY, LEGACY.BASE_SUMMARY);
  assert.equal(BASE_CHAT, LEGACY.BASE_CHAT);
  assert.equal(ANALYSIS_PROMPT, LEGACY.ANALYSIS_PROMPT);
  assert.equal(BATCH_PROMPT, LEGACY.BATCH_SYSTEM_PROMPT);
});

test('single-article messages match v1.4.0', () => {
  const extracted = '<article>Extracted full text</article>';
  for (const ex of [undefined, extracted]) {
    const ctx = LEGACY.legacyArticleContext(article, ex);
    assert.equal(articleContext(article, ex), ctx);
    assert.deepEqual(summaryMessages(article, ex, settings), [
      { role: 'system', content: buildSystemPrompt(LEGACY.BASE_SUMMARY, settings) },
      { role: 'user', content: ctx },
    ]);
    const history = [{ role: 'user', content: 'Why?' }];
    assert.deepEqual(chatMessages(article, ex, settings, history), [
      { role: 'system', content: `${buildSystemPrompt(LEGACY.BASE_CHAT, settings)}\n\nARTICLE:\n${ctx}` },
      ...history,
    ]);
  }
  const raw = htmlToText(article.content);
  const legacyText = `Title: ${article.title}\n\n${raw.length > 4000 ? raw.slice(0, 4000) + '…' : raw}`;
  assert.equal(titledText(article), legacyText);
  assert.deepEqual(analysisMessages(article), [{ role: 'system', content: LEGACY.ANALYSIS_PROMPT }, { role: 'user', content: legacyText }]);
  assert.deepEqual(batchMessages(article), [{ role: 'system', content: LEGACY.BATCH_SYSTEM_PROMPT }, { role: 'user', content: legacyText }]);
});

test('multi-article messages match v1.4.0 for every operation and template', () => {
  const cases = [
    { operation: 'compare', instructions: '' }, { operation: 'compare', instructions: 'pricing' },
    { operation: 'newsletter', template: 'digest' }, { operation: 'newsletter', template: 'roundup', instructions: 'fun' },
    { operation: 'newsletter', template: 'brief' }, { operation: 'newsletter', template: 'unknown' },
    { operation: 'briefing', instructions: '' }, { operation: 'briefing', instructions: 'What changed?' },
    { operation: 'mystery' },
  ];
  for (const c of cases) {
    const request = { ...c, articles };
    for (const chars of [1200, 300]) {
      assert.deepEqual(multiArticleMessages(request, chars, settings), LEGACY.legacyMultiMessages(request, chars, settings), JSON.stringify(c));
    }
  }
});

test('parseAnalysis takes the last valid object, strips fences, fills defaults', () => {
  const raw = 'Thinking {"draft": true} ... ```json\n{"sentiment":"negative","topics":["a","b","c","d","e","f"]}\n```';
  assert.deepEqual(parseAnalysis(raw), {
    sentiment: 'negative', urgency: 'evergreen', frame: 'analytical', tone: 'analytical', depth: 'standard', topics: ['a', 'b', 'c', 'd', 'e'],
  });
  assert.throws(() => parseAnalysis('no json here'), /Could not extract valid analysis/);
  assert.throws(() => parseAnalysis('{"summary":"only"}'), /Could not extract valid analysis/);
});

test('parseBatchResult keeps the summary and accepts summary-only output', () => {
  assert.equal(parseBatchResult('{"summary":"S","urgency":"breaking"}').summary, 'S');
  assert.equal(parseBatchResult('{"summary":"S"}').sentiment, 'neutral');
  assert.equal(parseBatchResult('{"sentiment":"positive","summary":42}').summary, '');
  assert.throws(() => parseBatchResult('{}'), /No valid JSON found/);
});

test('lastJSONObject handles nesting and stray braces', () => {
  assert.deepEqual(lastJSONObject('} {"a":{"b":1}} trailing', () => true), { a: { b: 1 } });
});

test('JSON extraction survives braces in strings, stray braces in prose, and nesting', () => {
  assert.equal(parseBatchResult('{"summary":"returns } on error","sentiment":"neutral","topics":["a"]}').summary, 'returns } on error');
  assert.equal(parseBatchResult('{"summary":"opens { but never closes","sentiment":"negative"}').sentiment, 'negative');
  assert.equal(parseAnalysis('Let me think {about this. Result:\n{"sentiment":"positive","urgency":"breaking"}').sentiment, 'positive');
  assert.equal(parseAnalysis('{"analysis":{"sentiment":"negative","frame":"conflict"}}').frame, 'conflict');
  assert.equal(parseAnalysis('{"summary":"say \\"hi\\" {","sentiment":"neutral"}').sentiment, 'neutral');
  // Two complete objects: the later one wins.
  assert.equal(parseAnalysis('{"sentiment":"negative"} then {"sentiment":"positive"}').sentiment, 'positive');
});
