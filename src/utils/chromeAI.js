/**
 * Chrome built-in AI (Gemini Nano) via the Prompt API.
 * Runs entirely in the browser — no server, no Ollama. Desktop Chrome 148+ only.
 * https://developer.chrome.com/docs/ai/prompt-api
 */

export const NANO_MODEL_NAME = 'gemini-nano';

// Plain Chromium ships a stub LanguageModel that reports itself available but
// just echoes the prompt back, prefixed with this message.
const CHROMIUM_STUB_PREFIX = 'On-device model is not available';
const NOT_CHROME_ERROR = 'Gemini Nano needs Google Chrome (desktop, 148+). This browser exposes the API but has no on-device model.';
const TOO_LONG_ERROR = 'This request is too long for Gemini Nano. Select fewer articles, or switch to an Ollama model in Settings → AI Processing.';

// Room left in the context window for the model's answer.
const OUTPUT_RESERVE_TOKENS = 1536;
// Rough chars-per-token used only when Chrome can't measure input for us.
const FALLBACK_CHARS_PER_TOKEN = 3;

export function isNanoModel(name) {
  return name === NANO_MODEL_NAME;
}

// Gemini Nano is bundled only with Google Chrome; Chromium-based browsers
// without the "Google Chrome" brand get the stub.
function isGoogleChrome() {
  const brands = navigator.userAgentData?.brands;
  if (!brands) return true; // can't tell; the stream check below still guards
  return brands.some((b) => b.brand === 'Google Chrome');
}

/**
 * Returns a model entry shaped like the Ollama ones, or null when the browser
 * can't run Gemini Nano.
 */
export async function getNanoModel() {
  if (typeof self === 'undefined' || !('LanguageModel' in self) || !isGoogleChrome()) return null;
  let availability;
  try {
    availability = await self.LanguageModel.availability();
  } catch {
    return null;
  }
  if (availability === 'unavailable') return null;
  return {
    name: NANO_MODEL_NAME,
    family: 'gemini',
    parameterSize: availability === 'available' ? 'Chrome · on-device' : 'Chrome · downloads on first use',
    size: 0,
    availability,
  };
}

async function createSession(messages) {
  return self.LanguageModel.create({
    initialPrompts: messages,
    expectedInputs: [{ type: 'text' }],
    expectedOutputs: [{ type: 'text' }],
  });
}

/**
 * Finds the largest per-item character limit (≤ maxChars) for which the user
 * message fits in Gemini Nano's context window alongside the system prompt
 * and room for the answer. buildUserMessage(chars) renders the message with
 * each item trimmed to `chars`. Shrinking every item evenly keeps all of them
 * in the prompt instead of cutting the last ones off.
 * Returns { chars, trimmed }; throws when even minChars doesn't fit.
 */
export async function fitToNanoContext(systemContent, buildUserMessage, { maxChars, minChars = 200 }) {
  const session = await createSession([{ role: 'system', content: systemContent }]);
  try {
    const windowSize = session.contextWindow ?? session.inputQuota;
    if (!windowSize) return { chars: maxChars, trimmed: false };
    const used = session.contextUsage ?? session.inputUsage ?? 0;
    const budget = windowSize - used - OUTPUT_RESERVE_TOKENS;
    if (budget <= 0) throw new Error(TOO_LONG_ERROR);

    const measureFn = session.measureContextUsage ?? session.measureInputUsage;
    const measure = (text) => (measureFn
      ? measureFn.call(session, text)
      : Math.ceil(text.length / FALLBACK_CHARS_PER_TOKEN));

    let chars = maxChars;
    for (let attempt = 0; attempt < 6; attempt++) {
      const tokens = await measure(buildUserMessage(chars));
      if (tokens <= budget) return { chars, trimmed: chars < maxChars };
      if (chars <= minChars) break;
      chars = Math.max(minChars, Math.floor(chars * (budget / tokens) * 0.9));
    }
    throw new Error(TOO_LONG_ERROR);
  } finally {
    session.destroy();
  }
}

/**
 * Streams a completion from Gemini Nano. Same contract as streamChat():
 * takes the full message list, yields string tokens.
 * Each call uses a fresh session so it stays stateless like the Ollama path.
 */
export async function* streamNanoChat(messages) {
  if (!('LanguageModel' in self)) {
    throw new Error('Gemini Nano is not available in this browser (needs desktop Chrome 148+)');
  }
  const last = messages[messages.length - 1];
  const history = messages.slice(0, -1);

  let session;
  try {
    session = await createSession(history);
  } catch (err) {
    if (err?.name !== 'QuotaExceededError') throw err;
    // Too long for Nano's context window: keep only the system prompt, halved.
    const system = history.find((m) => m.role === 'system');
    const trimmed = system
      ? [{ ...system, content: system.content.slice(0, Math.floor(system.content.length / 2)) + '…' }]
      : [];
    session = await createSession(trimmed).catch((retryErr) => {
      throw retryErr?.name === 'QuotaExceededError' ? new Error(TOO_LONG_ERROR, { cause: retryErr }) : retryErr;
    });
  }

  const controller = new AbortController();
  try {
    const stream = session.promptStreaming(last.content, { signal: controller.signal });
    // Hold back the first few characters until we know this isn't the Chromium stub.
    let head = '';
    let checked = false;
    for await (const chunk of stream) {
      if (checked) { yield chunk; continue; }
      head += chunk;
      if (head.length < CHROMIUM_STUB_PREFIX.length) continue;
      if (head.startsWith(CHROMIUM_STUB_PREFIX)) throw new Error(NOT_CHROME_ERROR);
      checked = true;
      yield head;
    }
    if (!checked && head) {
      if (head.startsWith(CHROMIUM_STUB_PREFIX)) throw new Error(NOT_CHROME_ERROR);
      yield head;
    }
  } catch (err) {
    if (err?.name === 'QuotaExceededError') throw new Error(TOO_LONG_ERROR, { cause: err });
    throw err;
  } finally {
    controller.abort();
    session.destroy();
  }
}
