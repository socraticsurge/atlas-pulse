import { useState, useEffect, useRef, useCallback } from 'react';
import {
  streamChat, fetchAIModels,
  patchArticle, bulkUpdateArticles, fetchQueueCount,
  fetchArticlesByAiStatus, fetchUnprocessedForFeed, resetProcessingArticles,
} from '../utils/api.js';
import { getBatchSettings } from '../utils/batchSettings.js';
import { stripHtml } from '../utils/helpers.js';

const BATCH_SYSTEM_PROMPT = `Analyze the article and respond with ONLY a valid JSON object — no markdown, no explanation, no code blocks. Use exactly these fields:
{
  "summary": "3-4 sentence summary in plain prose. Key finding/argument and one concrete takeaway. Do not start with 'This article'.",
  "sentiment": "positive|neutral|negative",
  "urgency": "breaking|developing|evergreen",
  "frame": "conflict|human_interest|economic|analytical",
  "tone": "alarming|analytical|optimistic|opinion",
  "depth": "brief|standard|deep_dive",
  "topics": ["tag1", "tag2", "tag3"]
}`;

function parseAnalysis(response) {
  const stripped = response.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  const candidates = [];
  let depth = 0, start = -1;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (stripped[i] === '}') { depth--; if (depth === 0 && start !== -1) { candidates.push(stripped.slice(start, i + 1)); start = -1; } }
  }
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]);
      if (parsed.sentiment || parsed.urgency || parsed.summary) {
        return {
          summary:   typeof parsed.summary === 'string' ? parsed.summary : '',
          sentiment: parsed.sentiment || 'neutral',
          urgency:   parsed.urgency   || 'evergreen',
          frame:     parsed.frame     || 'analytical',
          tone:      parsed.tone      || 'analytical',
          depth:     parsed.depth     || 'standard',
          topics:    Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5) : [],
        };
      }
    } catch { /* try next candidate */ }
  }
  throw new Error('No valid JSON found in model response');
}

export function useAIBatchProcessor() {
  const [progress, setProgress] = useState({ total: 0, done: 0, failed: 0, running: false });
  const [availableModels, setAvailableModels] = useState(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const processingRef = useRef(false);
  const pausedRef = useRef(false);
  const mountedRef = useRef(true);

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

      const rawText = stripHtml(article.content || article.summary || '');
      const text = rawText.length > 4000 ? rawText.slice(0, 4000) + '…' : rawText;
      const msgs = [
        { role: 'system', content: BATCH_SYSTEM_PROMPT },
        { role: 'user', content: `Title: ${article.title}\n\n${text}` },
      ];

      let response = '';
      for await (const token of streamChat(model, msgs)) {
        if (!mountedRef.current) break;
        response += token;
      }

      const parsed = parseAnalysis(response);
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
        setTimeout(processOne, 50);
      }
    }
  }, [availableModels]);

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
