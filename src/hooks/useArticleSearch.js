import { useEffect, useMemo, useState } from 'react';
import { searchArticleBodies } from '../utils/api.js';
import { rankArticles, tokenizeQuery } from '../utils/search.js';

const DEBOUNCE_MS = 250;

// { term: [ids] } from the server → { term: Set<id> } for fast lookups.
function toIdSets(matches) {
  return Object.fromEntries(Object.entries(matches).map(([term, ids]) => [term, new Set(ids)]));
}

/**
 * Filters and ranks articles for a search query. Title, source, topic, and
 * excerpt matches are instant; full-text body matches arrive from the server
 * index shortly after and widen the results.
 */
export function useArticleSearch(articles, query, sourceOf) {
  const [bodyMatches, setBodyMatches] = useState({ query: '', matches: {} });
  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchArticleBodies(trimmed)
        .then(({ matches }) => {
          if (!cancelled) setBodyMatches({ query: trimmed, matches: toIdSets(matches) });
        })
        .catch(() => { /* excerpt-only search still works */ });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [trimmed]);

  return useMemo(() => {
    if (!trimmed) return articles;
    const matches = bodyMatches.query === trimmed ? bodyMatches.matches : {};
    return rankArticles(articles, tokenizeQuery(trimmed), { sourceOf, bodyMatches: matches });
  }, [articles, trimmed, sourceOf, bodyMatches]);
}
