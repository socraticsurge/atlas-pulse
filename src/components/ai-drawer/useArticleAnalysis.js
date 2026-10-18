import { useCallback, useState } from 'react';
import { patchArticle } from '../../utils/api.js';
import { analysisMessages, collectResponse } from '../../ai/tasks.js';
import { parseAnalysis } from '../../ai/parse.js';
import { useStreamRun } from '../../hooks/useStreamRun.js';
import { useArticleFieldSync } from './useArticleFieldSync.js';

function parseStoredAnalysis(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Analysis tab state: on-demand classification and batch results. */
export function useArticleAnalysis({ article, extractedContent, model }) {
  const [analysis, setAnalysis] = useState(() => parseStoredAnalysis(article?.aiAnalysis));
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const streamRun = useStreamRun();

  // Reset on article change (dropping a run for the previous article); adopt
  // batch analyses as they land.
  useArticleFieldSync(article, 'aiAnalysis', {
    onArticleChange: (raw) => {
      streamRun.cancel();
      setAnalysis(parseStoredAnalysis(raw));
      setError(null);
      setAnalyzing(false);
    },
    onFieldChange: (raw) => {
      const parsed = parseStoredAnalysis(raw);
      if (parsed) setAnalysis(parsed);
    },
  });

  const run = useCallback(async () => {
    if (analyzing) return;
    if (!article || !model) return;
    setAnalyzing(true);
    setError(null);
    const signal = streamRun.start();
    try {
      const response = await collectResponse(model, analysisMessages(article, extractedContent), signal);
      if (signal.aborted) return; // stopped, or the article changed
      const parsed = parseAnalysis(response);
      setAnalysis(parsed);
      await patchArticle(article.id, { aiAnalysis: JSON.stringify(parsed) }).catch(() => {});
    } catch (err) {
      if (!signal.aborted) setError(err.message);
    } finally {
      if (!signal.aborted) setAnalyzing(false);
    }
  }, [article, extractedContent, model, analyzing, streamRun]);

  const stop = useCallback(() => {
    streamRun.cancel();
    setAnalyzing(false);
  }, [streamRun]);

  return { analysis, analyzing, error, run, stop };
}
