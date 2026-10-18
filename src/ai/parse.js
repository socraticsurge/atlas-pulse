// Extracting JSON from model output. Models wrap JSON in code fences or
// precede it with reasoning prose, so we collect every balanced {...} block,
// from every '{' (nested ones too), and take the last one that looks right.
// Braces inside JSON strings don't count, and a stray '{' in the prose only
// spoils the block that starts there.

// The scanner reads one character at a time; each step returns true when the
// character closes the block it started on.
const DEPTH_CHANGE = { '{': 1, '}': -1 };

function stepInString(state, ch) {
  if (state.escaped) state.escaped = false;
  else if (ch === '\\') state.escaped = true;
  else if (ch === '"') state.inString = false;
  return false;
}

function stepInCode(state, ch) {
  if (ch === '"') state.inString = true;
  state.depth += DEPTH_CHANGE[ch] ?? 0;
  return ch === '}' && state.depth === 0;
}

// Index of the '}' that closes the '{' at `start`, or -1. Skips string literals.
function closingBrace(text, start) {
  const state = { depth: 0, inString: false, escaped: false };
  for (let i = start; i < text.length; i++) {
    const step = state.inString ? stepInString : stepInCode;
    if (step(state, text[i])) return i;
  }
  return -1;
}

// Blocks ordered first to last by where they end, outer before inner when
// they end together, so the "last" object is the outermost latest one.
function jsonCandidates(raw) {
  const text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  const spans = [];
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    const end = closingBrace(text, start);
    if (end !== -1) spans.push({ start, end });
  }
  spans.sort((a, b) => a.end - b.end || b.start - a.start);
  return spans.map(({ start, end }) => text.slice(start, end + 1));
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
