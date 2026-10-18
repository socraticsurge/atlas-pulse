import { useCallback, useState } from 'react';
import { saveSummary } from '../../utils/api.js';
import { getAISettings } from '../../utils/aiSettings.js';
import { streamTokens, summaryMessages } from '../../ai/tasks.js';
import { useStreamRun, whileCurrent } from '../../hooks/useStreamRun.js';
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

// Summary text plus whether it came from background batch processing.
const fromBatch = (text) => ({ summary: text || '', isBatchSummary: Boolean(text) });
const canGenerate = (article, model) => Boolean(article && model);

/** Summary text: generated on demand, or a background batch summary as it lands. */
function useSummaryGeneration({ article, extractedContent, model, onArticleChange }) {
  const [text, setText] = useState(() => fromBatch(article?.aiSummary));
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState(null);
  const streamRun = useStreamRun();

  useArticleFieldSync(article, 'aiSummary', {
    onArticleChange: (batchSummary) => {
      streamRun.cancel(); // a summary still streaming belongs to the previous article
      setText(fromBatch(batchSummary));
      setError(null);
      setSummarizing(false);
      onArticleChange();
    },
    onFieldChange: (batchSummary) => batchSummary && setText(fromBatch(batchSummary)),
  });

  const appendToken = useCallback((token) => setText((t) => ({ ...t, summary: t.summary + token })), []);

  const generate = useCallback(async () => {
    if (summarizing || !canGenerate(article, model)) return;
    setSummarizing(true);
    setText(fromBatch(''));
    setError(null);
    const signal = streamRun.start();
    const messages = summaryMessages(article, extractedContent, getAISettings());
    const showError = whileCurrent(signal, (err) => setError(err.message));
    await streamTokens(model, messages, whileCurrent(signal, appendToken), signal).catch(showError);
    whileCurrent(signal, setSummarizing)(false);
  }, [article, extractedContent, model, summarizing, appendToken, streamRun]);

  const stop = useCallback(() => {
    streamRun.cancel();
    setSummarizing(false);
  }, [streamRun]);

  return { ...text, summarizing, error, generate, stop };
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
