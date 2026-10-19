import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArticleCard } from './ArticleCards.jsx';
import { chunkRows, withDayHeaders } from './listLogic.js';
import ArticleRow from '../shell/ArticleRow.jsx';
import DayHeading from '../shell/DayHeading.jsx';

const GRID_COLUMNS = 3;
const ROW = 'absolute top-0 left-0 w-full';
// First-guess heights in px; items are then measured as they render.
const ESTIMATES = { header: 30, rows: 58, magazine: 292, excerpt: 96, compact: 37 };
// Load the next page when the rendered items come within this many of the end.
const END_MARGIN = 15;

// The virtualized items for a view mode. Rows: day headings (unless the list
// is ranked by relevance, not date) and one article each. Grid: rows of three
// cards. List and Compact: one card each.
function listItems(articles, viewMode, ranked, grouping) {
  if (viewMode === 'rows' && ranked) return articles.map((article) => ({ type: 'article', key: article.id, article }));
  if (viewMode === 'rows') return withDayHeaders(articles, new Date(), grouping);
  const columns = viewMode === 'magazine' ? GRID_COLUMNS : 1;
  return chunkRows(articles, columns).map((cards) => ({ type: 'cards', key: cards[0].id, articles: cards }));
}

// Index of the item that shows each article, for scrolling to it.
function itemIndexById(items) {
  const index = new Map();
  items.forEach((item, i) => {
    if (item.type === 'article') index.set(item.article.id, i);
    if (item.type === 'cards') item.articles.forEach((a) => index.set(a.id, i));
  });
  return index;
}

// Keeps the active article (for example after j/k in the reader) in view.
function useScrollToActive(virtualizer, indexById, selectedArticleId) {
  useEffect(() => {
    const index = indexById.get(selectedArticleId);
    if (index !== undefined) virtualizer.scrollToIndex(index, { align: 'auto' });
  }, [virtualizer, indexById, selectedArticleId]);
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

// Asks for more items once the last rendered one is near the end of the list.
function useEndReached(lastRenderedIndex, count, onEndReached) {
  useEffect(() => {
    if (count > 0 && lastRenderedIndex >= count - END_MARGIN) onEndReached?.();
  }, [lastRenderedIndex, count, onEndReached]);
}

function ItemContent({ item, viewMode, props }) {
  const { feedMap, selectedArticleId, selection, onSelectArticle } = props;
  if (item.type === 'header') return <DayHeading label={item.label} />;
  if (item.type === 'article') {
    const { article } = item;
    return (
      <ArticleRow
        article={article}
        feed={feedMap[article.feedId]}
        active={selectedArticleId === article.id}
        selected={selection.has(article.id)}
        onOpen={() => onSelectArticle(article)}
        onToggle={() => selection.toggle(article.id)}
      />
    );
  }
  return item.articles.map((article) => (
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
  ));
}

/**
 * The articles, rendered only near the visible part of `scrollRef`; calls
 * onEndReached as the reader nears the end, to load the next page.
 * Rows (default) shows day headings and dense two-line rows; Grid lays out
 * rows of three cards; List and Compact one card per row.
 */
export function VirtualArticleList({ scrollRef, articles, viewMode, ranked, grouping, onEndReached, ...props }) {
  const items = useMemo(() => listItems(articles, viewMode, ranked, grouping), [articles, viewMode, ranked, grouping]);
  const indexById = useMemo(() => itemIndexById(items), [items]);
  const listRef = useRef(null);
  const scrollMargin = useListOffset(scrollRef, listRef, viewMode);
  // This build doesn't use the React Compiler, so skipped memoization here is moot.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => ESTIMATES[items[index].type === 'header' ? 'header' : viewMode] ?? ESTIMATES.excerpt,
    getItemKey: (index) => items[index].key,
    overscan: 8,
    scrollMargin,
  });
  useScrollToActive(virtualizer, indexById, props.selectedArticleId);
  const virtualItems = virtualizer.getVirtualItems();
  useEndReached(virtualItems.at(-1)?.index ?? -1, items.length, onEndReached);

  return (
    <div ref={listRef} className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {virtualItems.map((virtualItem) => {
        const item = items[virtualItem.index];
        return (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            className={item.type === 'cards' && viewMode === 'magazine' ? `${ROW} grid auto-rows-[280px] grid-cols-3 gap-3 pb-3` : ROW}
            style={{ transform: `translateY(${virtualItem.start - scrollMargin}px)` }}
          >
            <ItemContent item={item} viewMode={viewMode} props={props} />
          </div>
        );
      })}
    </div>
  );
}
