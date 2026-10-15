import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAIModels,
  patchArticle, bulkUpdateArticles, fetchQueueCount,
  fetchArticlesByAiStatus, resetProcessingArticles,
} from '../utils/api.js';
import { getBatchSettings } from '../utils/batchSettings.js';
import { batchMessages, collectResponse } from '../ai/tasks.js';
import { parseBatchResult } from '../ai/parse.js';
import {
  IDLE_PROGRESS, batchUpdates, newestFirst, pickBatchModel, progressAfter, progressStarted,
} from '../ai/batch.js';
import { usePolling } from './usePolling.js';

// Runs the newest queued article through the model and saves the result.
// Resolves to 'done', 'failed', or 'empty' when nothing is queued.
async function processNext({ model, features, onStart, shouldStop }) {
  let articleId = null;
  try {
    const queued = await fetchArticlesByAiStatus('queued');
    if (queued.length === 0) return 'empty';
    const article = newestFirst(queued)[0];
    articleId = article.id;
    await patchArticle(articleId, { aiStatus: 'processing' });
    onStart(queued.length);
    const response = await collectResponse(model, batchMessages(article), shouldStop);
    await patchArticle(articleId, batchUpdates(parseBatchResult(response), features));
    return 'done';
  } catch (err) {
    console.error('[Batch AI] Error processing article', articleId, err);
    if (articleId) await patchArticle(articleId, { aiStatus: 'error' }).catch(() => {});
    return 'failed';
  }
}

/** Queues the newest unprocessed (or failed) articles; resolves to how many. */
async function triggerBatch() {
  const limit = getBatchSettings().maxPerCycle || 10;
  const picked = newestFirst(await fetchArticlesByAiStatus(['none', 'error'])).slice(0, limit);
  if (picked.length === 0) return 0;
  await bulkUpdateArticles(picked.map((a) => a.id), { aiStatus: 'queued' });
  return picked.length;
}

function useQueueCount() {
  const [count, setCount] = useState(0);
  const load = useCallback(() => fetchQueueCount().then(setCount).catch(() => {}), []);
  usePolling(load, 3000);
  return count;
}

function useAvailableModels() {
  const [models, setModels] = useState(null);
  const load = useCallback(() => fetchAIModels().then(({ models: m }) => setModels(m)).catch(() => {}), []);
  usePolling(load, 30_000);
  return models;
}

// False after unmount, so an in-flight chain stops scheduling more work.
function useMountedRef() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  return mounted;
}

// Processes queued articles one after another until the queue drains.
function useBatchRunner(availableModels) {
  const [progress, setProgress] = useState(IDLE_PROGRESS);
  const mountedRef = useMountedRef();
  const busyRef = useRef(false);
  // Self-reference for the chain: a useCallback cannot call itself directly.
  const runRef = useRef(null);

  const run = useCallback(async () => {
    const settings = getBatchSettings();
    const model = pickBatchModel(settings.model, availableModels);
    if (busyRef.current || !mountedRef.current) return;
    if (!settings.enabled || !model) return;
    busyRef.current = true;
    const outcome = await processNext({
      model,
      features: settings.features,
      onStart: (queued) => setProgress((p) => progressStarted(p, queued)),
      shouldStop: () => !mountedRef.current,
    });
    busyRef.current = false;
    setProgress((p) => progressAfter(p, outcome));
    if (outcome !== 'empty' && mountedRef.current) setTimeout(() => runRef.current?.(), 50);
  }, [availableModels, mountedRef]);

  useEffect(() => { runRef.current = run; }, [run]);
  return { progress, run };
}

/**
 * Background AI processing: works through articles with aiStatus 'queued'
 * one at a time, newest first, while batch processing is enabled.
 */
export function useAIBatchProcessor() {
  const queuedCount = useQueueCount();
  const availableModels = useAvailableModels();
  const { progress, run } = useBatchRunner(availableModels);

  // Articles left in 'processing' by a previous session go back to the queue.
  useEffect(() => { resetProcessingArticles().catch(() => {}); }, []);

  useEffect(() => {
    if (queuedCount > 0) run();
  }, [queuedCount, run]);

  // Shown as idle once the queue is empty, even before the chain notices.
  const shown = useMemo(
    () => (progress.running && queuedCount === 0 ? { ...progress, running: false } : progress),
    [progress, queuedCount],
  );

  return { progress: shown, queuedCount, triggerBatch, availableModels };
}
