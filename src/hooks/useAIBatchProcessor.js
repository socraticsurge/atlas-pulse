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
  IDLE_PROGRESS, batchStatus, batchUpdates, newestFirst, pickBatchModel, progressAfter, progressStarted,
} from '../ai/batch.js';
import { usePolling } from './usePolling.js';

// Delay before the next article; much longer after the server was unreachable.
const NEXT_DELAY_MS = { done: 50, failed: 50, unavailable: 5000 };

// Runs the newest queued article through the model and saves the result.
// Resolves to 'done', 'failed', 'empty' when nothing is queued, or
// 'unavailable' when the queue couldn't even be read (server unreachable).
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
    if (!articleId) return 'unavailable';
    console.error('[Batch AI] Error processing article', articleId, err);
    await patchArticle(articleId, { aiStatus: 'error' }).catch(() => {});
    return 'failed';
  }
}

/** Queues the newest unprocessed (or failed) articles; resolves to how many. */
async function queueRecent() {
  const limit = getBatchSettings().maxPerCycle || 10;
  const picked = newestFirst(await fetchArticlesByAiStatus(['none', 'error'])).slice(0, limit);
  if (picked.length === 0) return 0;
  await bulkUpdateArticles(picked.map((a) => a.id), { aiStatus: 'queued' });
  return picked.length;
}

/** Returns every queued article to unprocessed; resolves to how many. */
async function dequeueAll() {
  const queued = await fetchArticlesByAiStatus('queued');
  if (queued.length > 0) await bulkUpdateArticles(queued.map((a) => a.id), { aiStatus: 'none' });
  return queued.length;
}

function useQueueCount() {
  const [count, setCount] = useState(0);
  const load = useCallback(() => fetchQueueCount().then(setCount).catch(() => {}), []);
  usePolling(load, 3000);
  return [count, load];
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

// Processes queued articles one after another until the queue drains. It runs
// while background processing is enabled, or during a manual run (manualRef),
// which ends when the queue is empty.
function useBatchRunner(availableModels, manualRef, endManualRun) {
  const [progress, setProgress] = useState(IDLE_PROGRESS);
  const mountedRef = useMountedRef();
  const busyRef = useRef(false);
  // Self-reference for the chain: a useCallback cannot call itself directly.
  const runRef = useRef(null);

  const run = useCallback(async () => {
    const settings = getBatchSettings();
    const model = pickBatchModel(settings.model, availableModels);
    if (busyRef.current || !mountedRef.current) return;
    if (!(settings.enabled || manualRef.current) || !model) return;
    busyRef.current = true;
    const outcome = await processNext({
      model,
      features: settings.features,
      onStart: (queued) => setProgress((p) => progressStarted(p, queued)),
      shouldStop: () => !mountedRef.current,
    });
    busyRef.current = false;
    setProgress((p) => progressAfter(p, outcome));
    if (outcome === 'empty') endManualRun();
    else if (mountedRef.current) setTimeout(() => runRef.current?.(), NEXT_DELAY_MS[outcome]);
  }, [availableModels, mountedRef, manualRef, endManualRun]);

  useEffect(() => { runRef.current = run; }, [run]);
  return { progress, run };
}

// A manual run lets the runner work with background processing disabled, until
// the queue drains. Kept in a ref for the runner and in state for rendering.
function useManualRun() {
  const ref = useRef(false);
  const [active, setActive] = useState(false);
  const set = useCallback((on) => { ref.current = on; setActive(on); }, []);
  const start = useCallback(() => set(true), [set]);
  const end = useCallback(() => set(false), [set]);
  return { ref, active, start, end };
}

/**
 * AI processing of queued articles (aiStatus 'queued'), one at a time, newest
 * first. Runs in the background while batch processing is enabled; the ✨
 * button starts a one-off manual run. `status` says whether the queue is
 * actually being worked on ('running') or stuck ('paused', with `reason`).
 */
export function useAIBatchProcessor() {
  const [queuedCount, reloadCount] = useQueueCount();
  const availableModels = useAvailableModels();
  const manual = useManualRun();
  const { progress, run } = useBatchRunner(availableModels, manual.ref, manual.end);

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

  // Resolves to { queued, reason }: reason 'no-model' when nothing could run it.
  const triggerBatch = useCallback(async () => {
    if (availableModels?.length === 0) return { queued: 0, reason: 'no-model' };
    const queued = await queueRecent();
    if (queued > 0) {
      manual.start();
      reloadCount();
    }
    return { queued, reason: null };
  }, [availableModels, manual, reloadCount]);

  const clearQueue = useCallback(async () => {
    const cleared = await dequeueAll();
    manual.end();
    reloadCount();
    return cleared;
  }, [manual, reloadCount]);

  const { status, reason } = batchStatus({
    queuedCount, enabled: getBatchSettings().enabled, manualRun: manual.active, models: availableModels,
  });

  return { progress: shown, queuedCount, status, pauseReason: reason, triggerBatch, clearQueue, availableModels };
}
