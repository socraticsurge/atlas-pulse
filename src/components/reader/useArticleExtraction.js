import { useEffect, useState } from 'react';
import * as api from '../../utils/api.js';
import { useOnKeyChange } from '../../hooks/useOnKeyChange.js';

/** Full-text extraction from the source URL; aborted when the article changes. */
export function useArticleExtraction(articleId, link) {
  const [content, setContent] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);

  useOnKeyChange(articleId, () => {
    setContent(null);
    setError(null);
    setExtracting(false);
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
        if (!controller.signal.aborted) setExtracting(false);
      }
    };
    run();
    return () => controller.abort();
  }, [articleId, link]);

  return { content, extracting, error };
}
