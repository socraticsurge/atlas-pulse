// System prompts for single-article AI tasks. Multi-article prompts live in
// multiArticle.js.

export const BASE_SUMMARY = `You are an editorial reading assistant. Read the article and write a concise, insightful summary in 3–4 sentences. Focus on the key finding or argument, why it matters, and one concrete takeaway. Write in plain prose, no bullet points. Do not start with "This article".`;

export const BASE_CHAT = `You are a reading assistant. Answer questions about the article clearly and concisely. Stay grounded in the article content. If something is not covered in the article, say so briefly.`;

const JSON_ONLY = 'Analyze the article and respond with ONLY a valid JSON object — no markdown, no explanation, no code blocks. Use exactly these fields:';

const SUMMARY_FIELD = `  "summary": "3-4 sentence summary in plain prose. Key finding/argument and one concrete takeaway. Do not start with 'This article'."`;

const ANALYSIS_FIELDS = [
  '  "sentiment": "positive|neutral|negative"',
  '  "urgency": "breaking|developing|evergreen"',
  '  "frame": "conflict|human_interest|economic|analytical"',
  '  "tone": "alarming|analytical|optimistic|opinion"',
  '  "depth": "brief|standard|deep_dive"',
  '  "topics": ["tag1", "tag2", "tag3"]',
];

const jsonSpec = (fields) => `${JSON_ONLY}\n{\n${fields.join(',\n')}\n}`;

/** Five-dimension classification + topics (AI drawer, on demand). */
export const ANALYSIS_PROMPT = jsonSpec(ANALYSIS_FIELDS);

/** Summary + classification in one call (background batch processing). */
export const BATCH_PROMPT = jsonSpec([SUMMARY_FIELD, ...ANALYSIS_FIELDS]);
