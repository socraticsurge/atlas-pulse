import { useCallback, useRef, useState } from 'react';
import { patchArticle } from '../../utils/api.js';
import { analysisMessages, collectResponse } from '../../ai/tasks.js';
import { parseAnalysis } from '../../ai/parse.js';
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
  const abortRef = useRef(false);

  // Reset on article change; adopt batch analyses as they land.
  useArticleFieldSync(article, 'aiAnalysis', {
    onArticleChange: (raw) => {
      setAnalysis(parseStoredAnalysis(raw));
      setError(null);
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
    abortRef.current = false;
    try {
      const response = await collectResponse(model, analysisMessages(article, extractedContent), () => abortRef.current);
      const parsed = parseAnalysis(response);
      setAnalysis(parsed);
      await patchArticle(article.id, { aiAnalysis: JSON.stringify(parsed) }).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }, [article, extractedContent, model, analyzing]);

  const stop = useCallback(() => {
    abortRef.current = true;
    setAnalyzing(false);
  }, []);

  return { analysis, analyzing, error, run, stop };
}
