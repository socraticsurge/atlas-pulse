import { useEffect, useState } from 'react';
import * as api from '../../utils/api.js';
import { useOnKeyChange } from '../../hooks/useOnKeyChange.js';

/**
 * Full-text extraction from the source URL; aborted when the article changes.
 * `settled` turns true once the content shown will no longer change: the
 * extraction finished or failed, or there is no link to extract from.
 */
export function useArticleExtraction(articleId, link) {
  const [content, setContent] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);

  useOnKeyChange(articleId, () => {
    setContent(null);
    setError(null);
    setExtracting(false);
    setFinished(false);
  });

  useEffect(() => {
    if (!link) return undefined;
    const controller = new AbortController();
    const run = async () => {
      setExtracting(true);
      try {
        const data = await api.extractArticle(link, controller.signal);
        if (data.content) setContent(data.content);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setExtracting(false);
          setFinished(true);
        }
      }
    };
    run();
    return () => controller.abort();
  }, [articleId, link]);

  return { content, extracting, error, settled: finished || !link };
}
