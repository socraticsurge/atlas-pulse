// Message builders for each single-article AI task, plus a helper that runs
// a task to completion. Components stream tokens themselves when they need
// live output.
import { streamChat } from '../utils/api.js';
import { buildSystemPrompt } from '../utils/aiSettings.js';
import { articleContext, titledText } from './context.js';
import { ANALYSIS_PROMPT, BASE_CHAT, BASE_SUMMARY, BATCH_PROMPT } from './prompts.js';

export function summaryMessages(article, extractedContent, settings) {
  return [
    { role: 'system', content: buildSystemPrompt(BASE_SUMMARY, settings) },
    { role: 'user', content: articleContext(article, extractedContent) },
  ];
}

export function chatMessages(article, extractedContent, settings, history) {
  const system = `${buildSystemPrompt(BASE_CHAT, settings)}\n\nARTICLE:\n${articleContext(article, extractedContent)}`;
  return [{ role: 'system', content: system }, ...history];
}

export function analysisMessages(article, extractedContent) {
  return [
    { role: 'system', content: ANALYSIS_PROMPT },
    { role: 'user', content: titledText(article, extractedContent) },
  ];
}

export function batchMessages(article) {
  return [
    { role: 'system', content: BATCH_PROMPT },
    { role: 'user', content: titledText(article) },
  ];
}

// `stop` is an AbortSignal (preferred: it also cancels the request) or a
// function returning true once the caller wants to stop.
const stopCheck = (stop) => (typeof stop === 'function' ? stop : () => Boolean(stop?.aborted));
const signalOf = (stop) => (typeof stop === 'function' ? undefined : stop);

// Yields the model's tokens until done or stopped; a stop is not an error.
async function* tokensUntilStopped(model, messages, stop) {
  const stopped = stopCheck(stop);
  try {
    for await (const token of streamChat(model, messages, signalOf(stop))) {
      if (stopped()) return;
      yield token;
    }
  } catch (err) {
    if (!stopped()) throw err;
  }
}

/** Streams a task's tokens to onToken until done or stopped (see stopCheck). */
export async function streamTokens(model, messages, onToken, stop) {
  for await (const token of tokensUntilStopped(model, messages, stop)) onToken(token);
}

/** Runs a task and returns the full response, or what arrived before a stop. */
export async function collectResponse(model, messages, stop) {
  let response = '';
  for await (const token of tokensUntilStopped(model, messages, stop)) response += token;
  return response;
}
