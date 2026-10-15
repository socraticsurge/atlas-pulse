// Pure helpers for background batch AI processing.

export const IDLE_PROGRESS = { total: 0, done: 0, failed: 0, running: false };

/** The saved batch model if it is still installed, else the first available one. */
export function pickBatchModel(savedModel, availableModels) {
  if (savedModel && availableModels?.some((m) => m.name === savedModel)) return savedModel;
  return availableModels?.[0]?.name || '';
}

/** Copy of `articles` sorted newest-published first. */
export function newestFirst(articles) {
  return [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

/** Article fields to save from a parsed batch result, per the `features` setting. */
export function batchUpdates(parsed, features = 'both') {
  const updates = { aiStatus: 'done' };
  if (features !== 'analysis') updates.aiSummary = parsed.summary;
  if (features !== 'summary') {
    const { summary: _summary, ...analysis } = parsed;
    updates.aiAnalysis = JSON.stringify(analysis);
  }
  return updates;
}

/** Parses a batch scope setting: 'all' | 'folder:<id>' | 'feed:<id>'. */
export function parseScope(scope) {
  const [type, id] = (scope || 'all').split(':');
  return { type, id: id ? parseInt(id, 10) : null };
}

/** Progress once an item starts, with `queued` items (including it) waiting. */
export function progressStarted(p, queued) {
  return { ...p, running: true, total: Math.max(p.total, p.done + p.failed + queued) };
}

/** Progress after an item's outcome: 'done' | 'failed' | 'empty' (queue drained). */
export function progressAfter(p, outcome) {
  if (outcome === 'done') return { ...p, done: p.done + 1 };
  if (outcome === 'failed') return { ...p, failed: p.failed + 1 };
  return { ...p, running: false };
}
