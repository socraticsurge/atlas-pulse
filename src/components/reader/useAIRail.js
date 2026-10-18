import { usePersistedToggle, usePersistedWidth } from '../../app/useLayout.js';

/**
 * The AI side rail beside the article: open or closed, and its width. Both
 * are remembered, so the rail stays as you left it from article to article.
 */
export function useAIRail() {
  const [open, toggle] = usePersistedToggle('atlas-pulse-ai-rail-open', true);
  const [width, resize] = usePersistedWidth('atlas-pulse-ai-rail-width', { fallback: 340, min: 280, max: 560, direction: -1 });
  return { open, toggle, width, resize };
}
