import { useCallback, useRef, useState } from 'react';
import { saveSummary, streamChat } from '../../utils/api.js';
import { getAISettings } from '../../utils/aiSettings.js';
import { summaryMessages } from '../../ai/tasks.js';
import { useArticleFieldSync } from './useArticleFieldSync.js';

const orNull = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v || null]));

// Library record for a saved summary: article metadata + the AI settings used.
function summaryRecord(article = {}, feedTitle, summary, model) {
  const { personas, tone = {}, customInstructions } = getAISettings();
  return {
    ...orNull({
      article_title: article.title,
      article_url: article.link,
      article_author: article.author,
      article_source: feedTitle,
      article_published_at: article.publishedAt,
      ai_tone_voice: tone.voice,
      ai_tone_energy: tone.energy,
      ai_tone_angle: tone.angle,
      ai_custom_instructions: customInstructions,
    }),
    summary_text: summary,
    ai_model: model,
    ai_personas: personas,
  };
}

/** Summary tab state: generation, batch results, copy, and save to library. */
export function useArticleSummary({ article, extractedContent, model, feedTitle, onSummarySaved }) {
  const [summary, setSummary] = useState(article?.aiSummary || '');
  const [isBatchSummary, setIsBatchSummary] = useState(Boolean(article?.aiSummary));
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const abortRef = useRef(false);

  // Reset on article change; adopt batch summaries as they land.
  useArticleFieldSync(article, 'aiSummary', {
    onArticleChange: (batchSummary) => {
      setSummary(batchSummary || '');
      setIsBatchSummary(Boolean(batchSummary));
      setError(null);
      setSummarizing(false);
      setSaved(false);
    },
    onFieldChange: (batchSummary) => {
      if (!batchSummary) return;
      setSummary(batchSummary);
      setIsBatchSummary(true);
    },
  });

  const generate = useCallback(async () => {
    if (!article || !model || summarizing) return;
    setSummarizing(true);
    setSummary('');
    setIsBatchSummary(false);
    setError(null);
    abortRef.current = false;
    try {
      for await (const token of streamChat(model, summaryMessages(article, extractedContent, getAISettings()))) {
        if (abortRef.current) break;
        setSummary((prev) => prev + token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSummarizing(false);
    }
  }, [article, extractedContent, model, summarizing]);

  const stop = useCallback(() => {
    abortRef.current = true;
    setSummarizing(false);
  }, []);

  const copy = useCallback(() => {
    if (!summary) return;
    navigator.clipboard.writeText(`${summary}\n\nRead more: ${article?.link || ''}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [summary, article]);

  const save = useCallback(async () => {
    if (!summary || saving) return;
    setSaving(true);
    try {
      await saveSummary(summaryRecord(article ?? undefined, feedTitle, summary, model));
      setSaved(true);
      onSummarySaved?.();
    } catch (err) {
      console.error('Failed to save summary:', err);
    } finally {
      setSaving(false);
    }
  }, [summary, saving, article, feedTitle, model, onSummarySaved]);

  return { summary, isBatchSummary, summarizing, error, copied, saving, saved, generate, stop, copy, save };
}
