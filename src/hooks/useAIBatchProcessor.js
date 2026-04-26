import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/database.js';
import { streamChat, fetchAIModels } from '../utils/api.js';
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
  const [availableModels, setAvailableModels] = useState(null); // null = not yet loaded
  const processingRef = useRef(false);
  const pausedRef = useRef(false);
  const mountedRef = useRef(true);

  // Watch queue depth — triggers the processing loop when new articles are queued
  const queuedCount = useLiveQuery(
    () => db.articles.where('aiStatus').equals('queued').count(),
    []
  ) ?? 0;

  // Fetch available models once, refresh occasionally
  useEffect(() => {
    const load = () => fetchAIModels()
      .then(({ models }) => { if (mountedRef.current) setAvailableModels(models); })
      .catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // On mount: reset any articles stuck in 'processing' state (from a previous crash)
  useEffect(() => {
    db.articles.where('aiStatus').equals('processing').modify({ aiStatus: 'queued' }).catch(() => {});
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
    if (!model) return; // No model available — wait for user to set up Ollama

    processingRef.current = true;

    let articleId = null;
    try {
      // Pick the newest queued article
      const queued = await db.articles
        .where('aiStatus').equals('queued')
        .toArray()
        .then(arr => arr.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)));

      if (queued.length === 0) {
        setProgress(p => ({ ...p, running: false }));
        processingRef.current = false;
        return;
      }

      const article = queued[0];
      articleId = article.id;

      await db.articles.update(articleId, { aiStatus: 'processing' });
      if (mountedRef.current) {
        setProgress(p => ({
          ...p,
          running: true,
          total: Math.max(p.total, p.done + p.failed + queued.length),
        }));
      }

      // Build article text (truncate to keep prompt fast on small models)
      const rawText = stripHtml(article.content || article.summary || '');
      const text = rawText.length > 4000 ? rawText.slice(0, 4000) + '…' : rawText;
      const articleContext = `Title: ${article.title}\n\n${text}`;

      const msgs = [
        { role: 'system', content: BATCH_SYSTEM_PROMPT },
        { role: 'user', content: articleContext },
      ];

      let response = '';
      for await (const token of streamChat(model, msgs)) {
        if (!mountedRef.current) break;
        response += token;
      }

      const parsed = parseAnalysis(response);
      const features = settings.features || 'both';
      const updates = { aiStatus: 'done' };

      if (features === 'summary' || features === 'both') {
        updates.aiSummary = parsed.summary;
      }
      if (features === 'analysis' || features === 'both') {
        const { summary: _s, ...analysisOnly } = parsed;
        updates.aiAnalysis = JSON.stringify(analysisOnly);
      }

      await db.articles.update(articleId, updates);
      if (mountedRef.current) setProgress(p => ({ ...p, done: p.done + 1 }));

    } catch (err) {
      console.error('[Batch AI] Error processing article', articleId, err);
      if (articleId) {
        await db.articles.update(articleId, { aiStatus: 'error' }).catch(() => {});
      }
      if (mountedRef.current) setProgress(p => ({ ...p, failed: p.failed + 1 }));
    } finally {
      processingRef.current = false;
      // Schedule the next article with a short gap to keep UI responsive
      if (mountedRef.current && !pausedRef.current) {
        setTimeout(processOne, 400);
      }
    }
  }, [availableModels]);

  // Start processing whenever queue has items and we're not already running
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

  // Queue the N most recent unprocessed articles on demand
  const triggerBatch = useCallback(async () => {
    const settings = getBatchSettings();
    const n = settings.maxPerCycle || 10;
    const all = await db.articles.toArray();
    const unprocessed = all
      .filter(a => a.aiStatus !== 'done' && a.aiStatus !== 'processing')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, n);
    if (unprocessed.length === 0) return 0;
    await db.articles.where('id').anyOf(unprocessed.map(a => a.id)).modify({ aiStatus: 'queued' });
    return unprocessed.length;
  }, []);

  return { progress, queuedCount, pause, resume, resetProgress, triggerBatch, availableModels };
}
