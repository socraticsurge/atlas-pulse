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
    session = await createSession(trimmed);
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
  } finally {
    controller.abort();
    session.destroy();
  }
}
