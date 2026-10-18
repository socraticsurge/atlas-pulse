import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArticleCard } from './ArticleCards.jsx';
import { chunkRows } from './listLogic.js';

const GRID_COLUMNS = 3;
// First-guess row heights in px; list rows are then measured as they render.
const ROW_ESTIMATES = { magazine: 292, excerpt: 96, compact: 37 };

// Keeps the active article (for example after j/k in the reader) in view.
function useScrollToActive(virtualizer, articles, columns, selectedArticleId) {
  useEffect(() => {
    const index = articles.findIndex((a) => a.id === selectedArticleId);
    if (index !== -1) virtualizer.scrollToIndex(Math.floor(index / columns), { align: 'auto' });
  }, [virtualizer, articles, columns, selectedArticleId]);
}

// Distance from the top of the scroll container's content to the list (the
// container's top padding), which the virtualizer needs to align rows.
function useListOffset(scrollRef, listRef, viewMode) {
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const list = listRef.current;
    if (!scroller || !list) return;
    setOffset(list.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop);
  }, [scrollRef, listRef, viewMode]);
  return offset;
}

/**
 * The article cards, rendered only near the visible part of `scrollRef`.
 * Grid view lays out rows of three cards; the list views one card per row.
 */
export function VirtualArticleList({ scrollRef, articles, viewMode, feedMap, selectedArticleId, selection, onSelectArticle }) {
  const columns = viewMode === 'magazine' ? GRID_COLUMNS : 1;
  const rows = useMemo(() => chunkRows(articles, columns), [articles, columns]);
  const listRef = useRef(null);
  const scrollMargin = useListOffset(scrollRef, listRef, viewMode);
  // This build doesn't use the React Compiler, so skipped memoization here is moot.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATES[viewMode] ?? ROW_ESTIMATES.excerpt,
    getItemKey: (index) => rows[index][0].id,
    overscan: 6,
    scrollMargin,
  });
  useScrollToActive(virtualizer, articles, columns, selectedArticleId);

  return (
    <div ref={listRef} className="virtual-list" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((item) => (
        <div
          key={item.key}
          data-index={item.index}
          ref={virtualizer.measureElement}
          className={columns > 1 ? 'virtual-row grid-row' : 'virtual-row'}
          style={{ transform: `translateY(${item.start - scrollMargin}px)` }}
        >
          {rows[item.index].map((article) => (
            <ArticleCard
              key={article.id}
              viewMode={viewMode}
              article={article}
              feed={feedMap[article.feedId]}
              active={selectedArticleId === article.id}
              selected={selection.has(article.id)}
              onSelectArticle={onSelectArticle}
              onToggleSelect={selection.toggle}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
