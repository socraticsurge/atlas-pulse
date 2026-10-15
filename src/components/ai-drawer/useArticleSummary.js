import { useCallback, useRef, useState } from 'react';
import { saveSummary } from '../../utils/api.js';
import { getAISettings } from '../../utils/aiSettings.js';
import { streamTokens, summaryMessages } from '../../ai/tasks.js';
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

const copyWithLink = (summary, link) => navigator.clipboard.writeText(`${summary}\n\nRead more: ${link || ''}`);

/** Summary text: generated on demand, or a background batch summary as it lands. */
function useSummaryGeneration({ article, extractedContent, model, onArticleChange }) {
  const [summary, setSummary] = useState(article?.aiSummary || '');
  const [isBatchSummary, setIsBatchSummary] = useState(Boolean(article?.aiSummary));
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

  const showBatch = (batchSummary) => {
    setSummary(batchSummary || '');
    setIsBatchSummary(Boolean(batchSummary));
  };
  useArticleFieldSync(article, 'aiSummary', {
    onArticleChange: (batchSummary) => {
      showBatch(batchSummary);
      setError(null);
      setSummarizing(false);
      onArticleChange();
    },
    onFieldChange: (batchSummary) => { if (batchSummary) showBatch(batchSummary); },
  });

  const generate = useCallback(async () => {
    if (summarizing) return;
    if (!article || !model) return;
    setSummarizing(true);
    showBatch('');
    setError(null);
    abortRef.current = false;
    const messages = summaryMessages(article, extractedContent, getAISettings());
    await streamTokens(model, messages, (token) => setSummary((prev) => prev + token), () => abortRef.current)
      .catch((err) => setError(err.message));
    setSummarizing(false);
  }, [article, extractedContent, model, summarizing]);

  const stop = useCallback(() => {
    abortRef.current = true;
    setSummarizing(false);
  }, []);

  return { summary, isBatchSummary, summarizing, error, generate, stop };
}

/** Summary tab: generation plus copy and save to library. */
export function useArticleSummary({ article, extractedContent, model, feedTitle, onSummarySaved }) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const generation = useSummaryGeneration({ article, extractedContent, model, onArticleChange: () => setSaved(false) });
  const { summary } = generation;

  const copy = useCallback(() => {
    if (!summary) return;
    copyWithLink(summary, article?.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [summary, article]);

  const save = useCallback(async () => {
    if (saving) return;
    if (!summary) return;
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

  return { ...generation, copied, saving, saved, copy, save };
}
