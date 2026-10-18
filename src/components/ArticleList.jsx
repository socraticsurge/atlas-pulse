import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bulkUpdateArticles } from '../utils/api.js';
import { readStored, writeStored } from '../utils/storage.js';
import { useLibrary } from '../app/LibraryContext.jsx';
import { useToast } from '../app/ToastContext.jsx';
import { useArticleSearch } from '../hooks/useArticleSearch.js';
import { EmptyList, LoadingCards } from './article-list/ArticleCards.jsx';
import { FilterBar } from './article-list/FilterBar.jsx';
import { ListHeader, SearchBar } from './article-list/ListHeader.jsx';
import { SelectionBar } from './article-list/SelectionBar.jsx';
import {
  applyFilters, articlesToCSV, availableFilters, downloadCSV, emptyStateText, viewTitle,
} from './article-list/listLogic.js';
import { useArticleListData } from './article-list/useArticleListData.js';
import { useConfirmAction } from '../hooks/useConfirmAction.js';
import { useListKeyboard } from './article-list/useListKeyboard.js';
import { useSelection } from './article-list/useSelection.js';
import { VirtualArticleList } from './article-list/VirtualArticleList.jsx';
import ListKeyHints from './shell/ListKeyHints.jsx';
import { on } from '../lib/appEvents.js';

const VIEW_MODE_KEY = 'atlas-pulse-view-mode';
// Extra class on the scroll container per view mode.
const CONTENT_MODIFIER = { magazine: ' content-grid', rows: ' content-rows' };

function useViewMode() {
  const [viewMode, setViewMode] = useState(() => readStored(VIEW_MODE_KEY, 'rows'));
  const change = useCallback((mode) => {
    setViewMode(mode);
    writeStored(VIEW_MODE_KEY, mode);
  }, []);
  useEffect(() => on('view-mode', change), [change]); // from the command palette
  return [viewMode, change];
}

// Search bar state. The input ref is returned separately so the state object
// stays a plain value that render code can read.
function useSearchState() {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const focusInput = useCallback(() => setTimeout(() => inputRef.current?.focus(), 0), []);
  const search = useMemo(() => ({
    visible, query, setQuery,
    open: () => { setVisible(true); focusInput(); },
    close: () => { setVisible(false); setQuery(''); },
    toggle: () => { if (visible) setQuery(''); setVisible(!visible); },
  }), [visible, query, focusInput]);
  return [search, inputRef];
}

// Tells the parent which articles are visible (for reader navigation), debounced.
function useNotifyVisible(articles, onArticlesLoaded) {
  useEffect(() => {
    const timer = setTimeout(() => onArticlesLoaded?.(articles), 150);
    return () => clearTimeout(timer);
  }, [articles, onArticlesLoaded]);
}

// The current values of `keys` for the articles in `ids`.
function snapshot(articles, ids, keys) {
  const idSet = new Set(ids);
  return articles
    .filter((a) => idSet.has(a.id))
    .map((a) => Object.fromEntries([['id', a.id], ...keys.map((k) => [k, a[k]])]));
}

// The view's current name (a feed or folder may have been renamed since it was opened).
function useLiveViewTitle(activeView) {
  const { feeds, folders } = useLibrary();
  const source = activeView.type === 'feed' ? feeds : folders;
  const item = source.find((x) => x.id === activeView.id);
  return viewTitle({ ...activeView, name: item?.title ?? item?.name ?? activeView.name });
}

// Applies read/bookmark changes made in the reader to the matching row.
function useReaderChanges(changedArticle, updateLocal) {
  useEffect(() => {
    if (changedArticle) {
      updateLocal([changedArticle.id], { isRead: changedArticle.isRead, isBookmarked: changedArticle.isBookmarked });
    }
  }, [changedArticle, updateLocal]);
}

// Bulk actions on the selection and on the whole list.
function useListActions({ data, selection, visible, sourceOf, onCountChanged, onOpenAIPanel }) {
  const selected = useCallback(() => visible.filter((a) => selection.has(a.id)), [visible, selection]);

  const showToast = useToast();
  // Optimistic: shown at once, and put back if the server rejects it.
  const update = useCallback(async (ids, changes) => {
    if (ids.length === 0) return;
    const before = snapshot(data.articles, ids, Object.keys(changes));
    data.updateLocal(ids, changes);
    try {
      await bulkUpdateArticles(ids, changes);
      onCountChanged?.();
    } catch (err) {
      data.restoreLocal(before);
      showToast(`Couldn't update articles: ${err.message}`, 'error');
    }
  }, [data, onCountChanged, showToast]);

  return useMemo(() => ({
    clear: selection.clear,
    selectAll: () => selection.selectAll(visible),
    markRead: async () => { await update([...selection.ids], { isRead: 1 }); selection.clear(); },
    bookmark: async () => { await update([...selection.ids], { isBookmarked: 1 }); selection.clear(); },
    exportCSV: () => { downloadCSV(articlesToCSV(selected(), sourceOf), 'atlas-pulse-articles.csv'); selection.clear(); },
    openAIPanel: (operation) => onOpenAIPanel?.(selected().map((a) => ({ ...a, feedTitle: sourceOf(a) || 'Unknown' })), operation),
    markAllRead: () => update(data.articles.filter((a) => !a.isRead).map((a) => a.id), { isRead: 1 }),
  }), [selection, visible, update, selected, sourceOf, onOpenAIPanel, data.articles]);
}

function ListContent({ loading, articles, empty, ...listProps }) {
  if (loading) return <LoadingCards />;
  if (articles.length === 0) return <EmptyList {...empty} />;
  return <VirtualArticleList articles={articles} {...listProps} />;
}

export default function ArticleList({
  activeView, selectedArticleId, onSelectArticle, onArticlesLoaded,
  batch, onOpenAIPanel, refreshKey = 0, onCountChanged, changedArticle,
}) {
  const library = useLibrary();
  const data = useArticleListData(activeView, refreshKey, library.feeds);
  useReaderChanges(changedArticle, data.updateLocal);
  const title = useLiveViewTitle(activeView);
  const [viewMode, setViewMode] = useViewMode();
  const [search, searchInputRef] = useSearchState();
  const [activeFilters, setActiveFilters] = useState({});
  const [aiOnly, setAiOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selection = useSelection(`${activeView.type}:${activeView.id}`);
  const scrollRef = useRef(null);

  const sourceOf = useCallback((article) => data.feedMap[article.feedId]?.title, [data.feedMap]);
  const searched = useArticleSearch(data.articles, search.query, sourceOf);
  const available = useMemo(() => availableFilters(searched), [searched]);
  const visible = useMemo(() => applyFilters(searched, { activeFilters, aiOnly }), [searched, activeFilters, aiOnly]);
  useNotifyVisible(visible, onArticlesLoaded);
  useListKeyboard({ search, selection });

  const actions = useListActions({ data, selection, visible, sourceOf, onCountChanged, onOpenAIPanel });
  const markAllRead = useConfirmAction(actions.markAllRead);
  const unreadCount = data.articles.filter((a) => !a.isRead).length;
  const activeCount = Object.values(activeFilters).filter(Boolean).length + (aiOnly ? 1 : 0);
  const hasActiveFilters = activeCount > 0;
  const showFilters = filtersOpen || hasActiveFilters; // an active filter stays in view
  const empty = { ...emptyStateText({ hasActiveFilters, searchQuery: search.query, viewType: activeView.type }), searching: Boolean(search.query) };

  return (
    <div className={`article-list-panel${selection.size > 0 ? ' has-fab' : ''}`}>
      <ListHeader
        title={title}
        count={visible.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={{ open: showFilters, activeCount, toggle: () => setFiltersOpen((o) => !o) }}
        batch={batch}
        search={search}
        unreadCount={unreadCount}
        markAllRead={markAllRead}
      />
      <SearchBar search={search} inputRef={searchInputRef} />
      {showFilters && (
        <FilterBar available={available} active={activeFilters} onChange={setActiveFilters} aiOnly={aiOnly} onToggleAiOnly={() => setAiOnly((v) => !v)} />
      )}
      <div ref={scrollRef} className={`article-list-content${CONTENT_MODIFIER[viewMode] ?? ''}`}>
        <ListContent
          scrollRef={scrollRef}
          loading={data.loading}
          articles={visible}
          empty={empty}
          viewMode={viewMode}
          feedMap={data.feedMap}
          selectedArticleId={selectedArticleId}
          selection={selection}
          onSelectArticle={onSelectArticle}
        />
      </div>
      <ListKeyHints />
      <SelectionBar count={selection.size} visibleCount={visible.length} actions={actions} />
    </div>
  );
}
