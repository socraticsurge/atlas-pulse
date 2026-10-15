import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bulkUpdateArticles } from '../utils/api.js';
import { useArticleSearch } from '../hooks/useArticleSearch.js';
import { ArticleCard, EmptyList, LoadingCards } from './article-list/ArticleCards.jsx';
import { FilterBar } from './article-list/FilterBar.jsx';
import { ListHeader, SearchBar } from './article-list/ListHeader.jsx';
import { SelectionBar } from './article-list/SelectionBar.jsx';
import {
  applyFilters, articlesToCSV, availableFilters, downloadCSV, emptyStateText, viewTitle,
} from './article-list/listLogic.js';
import { useArticleListData } from './article-list/useArticleListData.js';
import { useConfirmAction } from './article-list/useConfirmAction.js';
import { useListKeyboard } from './article-list/useListKeyboard.js';
import { useSelection } from './article-list/useSelection.js';

const VIEW_MODE_KEY = 'atlas-pulse-view-mode';

function useViewMode() {
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_MODE_KEY) || 'magazine');
  const change = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }, []);
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

// Bulk actions on the selection and on the whole list.
function useListActions({ data, selection, visible, sourceOf, onCountChanged, onOpenAIPanel }) {
  const selected = useCallback(() => visible.filter((a) => selection.has(a.id)), [visible, selection]);

  const update = useCallback(async (ids, changes) => {
    if (ids.length === 0) return;
    data.updateLocal(ids, changes);
    await bulkUpdateArticles(ids, changes);
    onCountChanged?.();
  }, [data, onCountChanged]);

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

function ListContent({ loading, articles, empty, viewMode, feedMap, selectedArticleId, selection, onSelectArticle }) {
  if (loading) return <LoadingCards />;
  if (articles.length === 0) return <EmptyList {...empty} />;
  return articles.map((article) => (
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

export default function ArticleList({
  activeView, selectedArticleId, onSelectArticle, onArticlesLoaded, sidebarHidden = false, onShowSidebar,
  batchProgress, batchQueuedCount = 0, onTriggerBatch, onOpenAIPanel, refreshKey = 0, onCountChanged,
}) {
  const data = useArticleListData(activeView, refreshKey);
  const [viewMode, setViewMode] = useViewMode();
  const [search, searchInputRef] = useSearchState();
  const [activeFilters, setActiveFilters] = useState({});
  const [aiOnly, setAiOnly] = useState(false);
  const selection = useSelection(`${activeView.type}:${activeView.id}`);

  const sourceOf = useCallback((article) => data.feedMap[article.feedId]?.title, [data.feedMap]);
  const searched = useArticleSearch(data.articles, search.query, sourceOf);
  const available = useMemo(() => availableFilters(searched), [searched]);
  const visible = useMemo(() => applyFilters(searched, { activeFilters, aiOnly }), [searched, activeFilters, aiOnly]);
  useNotifyVisible(visible, onArticlesLoaded);
  useListKeyboard({ search, selection });

  const actions = useListActions({ data, selection, visible, sourceOf, onCountChanged, onOpenAIPanel });
  const markAllRead = useConfirmAction(actions.markAllRead);
  const unreadCount = data.articles.filter((a) => !a.isRead).length;
  const hasActiveFilters = Object.values(activeFilters).some(Boolean);
  const empty = { ...emptyStateText({ hasActiveFilters, searchQuery: search.query, viewType: activeView.type }), searching: Boolean(search.query) };

  return (
    <div className={`article-list-panel${selection.size > 0 ? ' has-fab' : ''}`}>
      <ListHeader
        title={viewTitle(activeView)}
        count={visible.length}
        sidebar={{ hidden: sidebarHidden, onShow: onShowSidebar }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        aiOnly={aiOnly}
        onToggleAiOnly={() => setAiOnly((v) => !v)}
        batch={{ running: batchProgress?.running, queuedCount: batchQueuedCount, onTrigger: onTriggerBatch }}
        search={search}
        unreadCount={unreadCount}
        markAllRead={markAllRead}
      />
      <SearchBar search={search} inputRef={searchInputRef} />
      {data.articles.some((a) => a.aiAnalysis) && (
        <FilterBar available={available} active={activeFilters} onChange={setActiveFilters} />
      )}
      <div className={`article-list-content${viewMode === 'magazine' ? ' content-grid' : ''}`}>
        <ListContent
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
      <SelectionBar count={selection.size} visibleCount={visible.length} actions={actions} />
    </div>
  );
}
