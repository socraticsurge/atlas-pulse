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

/** Streams a task's tokens to onToken until done or shouldStop() turns true. */
export async function streamTokens(model, messages, onToken, shouldStop = () => false) {
  for await (const token of streamChat(model, messages)) {
    if (shouldStop()) return;
    onToken(token);
  }
}

/** Runs a task and returns the full response; stops early if shouldStop() turns true. */
export async function collectResponse(model, messages, shouldStop = () => false) {
  let response = '';
  for await (const token of streamChat(model, messages)) {
    if (shouldStop()) break;
    response += token;
  }
  return response;
}
