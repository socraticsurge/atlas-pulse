// Pure helpers for background batch AI processing.

import { pickDefaultModel } from './models.js';

export const IDLE_PROGRESS = { total: 0, done: 0, failed: 0, running: false };

/** The saved batch model if it is still installed, else the Auto choice (see models.js). */
export function pickBatchModel(savedModel, availableModels) {
  if (savedModel && availableModels?.some((m) => m.name === savedModel)) return savedModel;
  return pickDefaultModel(availableModels ?? []);
}

/** Copy of `articles` sorted newest-published first. */
export function newestFirst(articles) {
  return [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

/** True when the reader generated this article's summary (the batch must keep it). */
export const hasManualSummary = (article) => article?.aiSummarySource === 'manual';

/**
 * Article fields to save from a parsed batch result, per the `features`
 * setting; a summary the reader asked for (article.aiSummarySource 'manual')
 * is kept.
 */
export function batchUpdates(parsed, features = 'both', article = {}) {
  const updates = { aiStatus: 'done' };
  // A summary the reader asked for stays; the batch only adds its analysis.
  if (features !== 'analysis' && !hasManualSummary(article)) Object.assign(updates, { aiSummary: parsed.summary, aiSummarySource: 'batch' });
  if (features !== 'summary') {
    const { summary: _summary, ...analysis } = parsed;
    updates.aiAnalysis = JSON.stringify(analysis);
  }
  return updates;
}

/** Progress once an item starts, with `queued` items (including it) waiting. */
export function progressStarted(p, queued) {
  return { ...p, running: true, total: Math.max(p.total, p.done + p.failed + queued) };
}

/**
 * Progress after an item's outcome: 'done' | 'failed' | 'unavailable' (server
 * unreachable, nothing processed) | 'empty' (queue drained).
 */
export function progressAfter(p, outcome) {
  if (outcome === 'done') return { ...p, done: p.done + 1 };
  if (outcome === 'failed') return { ...p, failed: p.failed + 1 };
  if (outcome === 'unavailable') return p;
  return { ...p, running: false };
}

/**
 * What the queue indicator should show. Articles are processed only while
 * background processing is enabled or a manual run (the ✨ button) is in
 * progress, and only with a model available; otherwise a non-empty queue is
 * 'paused', with the reason.
 */
export function batchStatus({ queuedCount, enabled, manualRun, models }) {
  if (queuedCount === 0) return { status: 'idle', reason: null };
  if (Array.isArray(models) && models.length === 0) return { status: 'paused', reason: 'no-model' };
  if (!enabled && !manualRun) return { status: 'paused', reason: 'off' };
  return { status: 'running', reason: null };
}
