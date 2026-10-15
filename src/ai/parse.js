// Extracting JSON from model output. Models wrap JSON in code fences or
// precede it with reasoning prose, so we scan for balanced {...} blocks and
// take the last one that looks right.

function jsonCandidates(raw) {
  const text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  const blocks = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}' && depth > 0) {
      depth--;
      if (depth === 0) blocks.push(text.slice(start, i + 1));
    }
  }
  return blocks;
}

function tryParse(block) {
  try {
    return JSON.parse(block);
  } catch {
    return null;
  }
}

/** Last JSON object in the output for which accept(obj) is true, or null. */
export function lastJSONObject(raw, accept) {
  const blocks = jsonCandidates(raw);
  for (let i = blocks.length - 1; i >= 0; i--) {
    const obj = tryParse(blocks[i]);
    if (obj && accept(obj)) return obj;
  }
  return null;
}

function normalizeAnalysis(p) {
  return {
    sentiment: p.sentiment || 'neutral',
    urgency:   p.urgency   || 'evergreen',
    frame:     p.frame     || 'analytical',
    tone:      p.tone      || 'analytical',
    depth:     p.depth     || 'standard',
    topics:    Array.isArray(p.topics) ? p.topics.slice(0, 5) : [],
  };
}

/** Parses ANALYSIS_PROMPT output. */
export function parseAnalysis(raw) {
  const obj = lastJSONObject(raw, (p) => p.sentiment || p.urgency || p.frame);
  if (!obj) throw new Error('Could not extract valid analysis from model response');
  return normalizeAnalysis(obj);
}

/** Parses BATCH_PROMPT output: { summary, ...analysis }. */
export function parseBatchResult(raw) {
  const obj = lastJSONObject(raw, (p) => p.sentiment || p.urgency || p.summary);
  if (!obj) throw new Error('No valid JSON found in model response');
  return { summary: typeof obj.summary === 'string' ? obj.summary : '', ...normalizeAnalysis(obj) };
}
