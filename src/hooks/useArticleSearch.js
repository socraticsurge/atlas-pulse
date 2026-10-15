import { useEffect, useMemo, useState } from 'react';
import { searchArticleBodies } from '../utils/api.js';
import { rankArticles, tokenizeQuery } from '../utils/search.js';

const DEBOUNCE_MS = 250;

// Server returns terms and id lists aligned by index → Map<term, Set<id>>.
function toIdSets(tokens, matches) {
  return new Map(tokens.map((term, i) => [term, new Set(matches[i] || [])]));
}

/**
 * Filters and ranks articles for a search query. Title, source, topic, and
 * excerpt matches are instant; full-text body matches arrive from the server
 * index shortly after and widen the results.
 */
export function useArticleSearch(articles, query, sourceOf) {
  const [bodyMatches, setBodyMatches] = useState({ query: '', matches: new Map() });
  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchArticleBodies(trimmed)
        .then(({ tokens, matches }) => {
          if (!cancelled) setBodyMatches({ query: trimmed, matches: toIdSets(tokens, matches) });
        })
        .catch(() => { /* excerpt-only search still works */ });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [trimmed]);

  return useMemo(() => {
    if (!trimmed) return articles;
    const matches = bodyMatches.query === trimmed ? bodyMatches.matches : new Map();
    return rankArticles(articles, tokenizeQuery(trimmed), { sourceOf, bodyMatches: matches });
  }, [articles, trimmed, sourceOf, bodyMatches]);
}
