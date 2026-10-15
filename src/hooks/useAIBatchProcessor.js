import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchAIModels,
  patchArticle, bulkUpdateArticles, fetchQueueCount,
  fetchArticlesByAiStatus, resetProcessingArticles,
} from '../utils/api.js';
import { getBatchSettings } from '../utils/batchSettings.js';
import { batchMessages, collectResponse } from '../ai/tasks.js';
import { parseBatchResult } from '../ai/parse.js';

export function useAIBatchProcessor() {
  const [progress, setProgress] = useState({ total: 0, done: 0, failed: 0, running: false });
  const [availableModels, setAvailableModels] = useState(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const processingRef = useRef(false);
  const pausedRef = useRef(false);
  const mountedRef = useRef(true);
  // Self-reference for the processing chain — a useCallback cannot reference
  // itself directly (breaks React Compiler memoization).
  const processOneRef = useRef(null);

  // Poll queue depth every 3 seconds — replaces useLiveQuery
  useEffect(() => {
    const poll = () => {
      fetchQueueCount()
        .then(count => { if (mountedRef.current) setQueuedCount(count); })
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, []);

  // Fetch available models once, refresh occasionally
  useEffect(() => {
    const load = () => fetchAIModels()
      .then(({ models }) => { if (mountedRef.current) setAvailableModels(models); })
      .catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // On mount: reset articles stuck in 'processing' from a previous crash
  useEffect(() => {
    resetProcessingArticles().catch(() => {});
    return () => { mountedRef.current = false; };
  }, []);

  const processOne = useCallback(async () => {
    if (processingRef.current || pausedRef.current || !mountedRef.current) return;

    const settings = getBatchSettings();
    if (!settings.enabled) return;

    const savedModel = settings.model;
    const model = (savedModel && availableModels?.some(m => m.name === savedModel))
      ? savedModel
      : availableModels?.[0]?.name || '';
    if (!model) return;

    processingRef.current = true;

    let articleId = null;
    try {
      const queued = await fetchArticlesByAiStatus('queued');
      const sorted = queued.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      if (sorted.length === 0) {
        setProgress(p => ({ ...p, running: false }));
        processingRef.current = false;
        return;
      }

      const article = sorted[0];
      articleId = article.id;

      await patchArticle(articleId, { aiStatus: 'processing' });
      if (mountedRef.current) {
        setProgress(p => ({
          ...p,
          running: true,
          total: Math.max(p.total, p.done + p.failed + sorted.length),
        }));
      }

      const response = await collectResponse(model, batchMessages(article), () => !mountedRef.current);
      const parsed = parseBatchResult(response);
      const features = settings.features || 'both';
      const updates = { aiStatus: 'done' };

      if (features === 'summary' || features === 'both') updates.aiSummary = parsed.summary;
      if (features === 'analysis' || features === 'both') {
        const { summary: _s, ...analysisOnly } = parsed;
        updates.aiAnalysis = JSON.stringify(analysisOnly);
      }

      await patchArticle(articleId, updates);
      if (mountedRef.current) setProgress(p => ({ ...p, done: p.done + 1 }));

    } catch (err) {
      console.error('[Batch AI] Error processing article', articleId, err);
      if (articleId) await patchArticle(articleId, { aiStatus: 'error' }).catch(() => {});
      if (mountedRef.current) setProgress(p => ({ ...p, failed: p.failed + 1 }));
    } finally {
      processingRef.current = false;
      if (mountedRef.current && !pausedRef.current) {
        setTimeout(() => processOneRef.current?.(), 50);
      }
    }
  }, [availableModels]);

  useEffect(() => {
    processOneRef.current = processOne;
  }, [processOne]);

  // Start processing when queue has items and we're not already running
  useEffect(() => {
    if (queuedCount > 0 && !processingRef.current && !pausedRef.current) {
      processOne();
    }
    if (queuedCount === 0 && mountedRef.current) {
      setProgress(p => p.running ? { ...p, running: false } : p);
    }
  }, [queuedCount, processOne]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setProgress(p => ({ ...p, running: false }));
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    if (queuedCount > 0) processOne();
  }, [queuedCount, processOne]);

  const resetProgress = useCallback(() => {
    setProgress({ total: 0, done: 0, failed: 0, running: false });
  }, []);

  const triggerBatch = useCallback(async () => {
    const settings = getBatchSettings();
    const n = settings.maxPerCycle || 10;
    const unprocessed = await fetchArticlesByAiStatus(['none', 'error']);
    const sorted = unprocessed
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, n);
    if (sorted.length === 0) return 0;
    await bulkUpdateArticles(sorted.map(a => a.id), { aiStatus: 'queued' });
    return sorted.length;
  }, []);

  return { progress, queuedCount, pause, resume, resetProgress, triggerBatch, availableModels };
}
