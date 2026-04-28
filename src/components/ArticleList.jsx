import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineNewspaper,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineQueueList,
  HiOutlineRectangleStack,
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineBars3,
  HiOutlineChevronDown,
  HiOutlineCheck,
  HiOutlineBookmark,
  HiOutlineArrowDownTray,
} from 'react-icons/hi2';
import { fetchArticles, fetchFeeds, patchArticle, bulkUpdateArticles } from '../utils/api.js';
import { timeAgo, stripHtml } from '../utils/helpers.js';

const FILTER_DIMS = [
  { key: 'sentiment', label: 'Sentiment', values: { positive: '😊 Positive', neutral: '😐 Neutral', negative: '😟 Negative' } },
  { key: 'urgency',   label: 'Urgency',   values: { breaking: '🔴 Breaking', developing: '🟡 Developing', evergreen: '🟢 Evergreen' } },
  { key: 'frame',     label: 'Frame',     values: { conflict: '⚔️ Conflict', human_interest: '👤 Human', economic: '📊 Economic', analytical: '🔬 Analytical' } },
  { key: 'tone',      label: 'Tone',      values: { alarming: '🚨 Alarming', analytical: '💡 Analytical', optimistic: '✨ Optimistic', opinion: '💭 Opinion' } },
  { key: 'depth',     label: 'Depth',     values: { brief: '⚡ Brief', standard: '📄 Standard', deep_dive: '📚 Deep Dive' } },
];

const OP_LIMITS = {
  compare:    { min: 2, max: 5,  label: 'Compare',    hint: '2–5' },
  newsletter: { min: 3, max: 15, label: 'Newsletter',  hint: '3–15' },
  briefing:   { min: 2, max: 15, label: 'Briefing',    hint: '2–15' },
};

function exportAsCSV(articles, feedMap) {
  const header = 'Title,Source,Published,URL,Read,Bookmarked';
  const rows = articles.map(a => [
    `"${(a.title || '').replace(/"/g, '""')}"`,
    `"${(feedMap[a.feedId]?.title || '').replace(/"/g, '""')}"`,
    a.publishedAt ? new Date(a.publishedAt).toISOString() : '',
    `"${a.link || ''}"`,
    a.isRead ? 'yes' : 'no',
    a.isBookmarked ? 'yes' : 'no',
  ].join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url;
  el.download = 'atlas-pulse-articles.csv';
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
  URL.revokeObjectURL(url);
}

export default function ArticleList({
  activeView,
  selectedArticleId,
  onSelectArticle,
  onArticlesLoaded,
  sidebarHidden = false,
  onShowSidebar,
  batchProgress,
  batchQueuedCount = 0,
  onTriggerBatch,
  onOpenAIPanel,
  refreshKey = 0,
  onCountChanged,
}) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feeds, setFeeds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef(null);
  const [viewMode, setViewMode] = useState(() =>
    localStorage.getItem('atlas-pulse-view-mode') || 'magazine'
  );
  const [activeFilters, setActiveFilters] = useState({});
  const [openFilterDim, setOpenFilterDim] = useState(null);
  const [showAiOnly, setShowAiOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAiMenu, setShowAiMenu] = useState(false);
  const aiMenuRef = useRef(null);

  // Load feeds for feedMap (rarely changes, so a single load is fine)
  useEffect(() => {
    fetchFeeds().then(setFeeds).catch(() => {});
  }, []);

  // Load articles whenever the view or refreshKey changes
  useEffect(() => {
    setLoading(true);
    fetchArticles(activeView.type, activeView.id)
      .then(data => { setArticles(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeView.type, activeView.id, refreshKey]);

  const feedMap = useMemo(() => {
    const m = {};
    feeds.forEach(f => (m[f.id] = f));
    return m;
  }, [feeds]);

  // Optimistic update: update a single article in local state
  const updateArticleLocal = useCallback((id, changes) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));
  }, []);

  // Filter articles by search query
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const tokens = [];
    const tokenRe = /"([^"]+)"|(\S+)/g;
    let m;
    while ((m = tokenRe.exec(searchQuery)) !== null) tokens.push((m[1] || m[2]).toLowerCase());

    const scored = [];
    for (const article of articles) {
      const title = (article.title || '').toLowerCase();
      const body = stripHtml(article.summary || article.content || '').toLowerCase();
      const source = (feedMap[article.feedId]?.title || '').toLowerCase();
      let topics = '';
      if (article.aiAnalysis) {
        try { topics = (JSON.parse(article.aiAnalysis).topics || []).join(' ').toLowerCase(); } catch {}
      }
      let score = 0, allMatch = true;
      for (const token of tokens) {
        const inTitle = title.includes(token);
        const inBody = body.includes(token);
        const inSource = source.includes(token);
        const inTopics = topics.includes(token);
        if (!inTitle && !inBody && !inSource && !inTopics) { allMatch = false; break; }
        if (inTitle) score += 10;
        if (inSource) score += 5;
        if (inTopics) score += 3;
        if (inBody) score += 1;
      }
      if (allMatch) scored.push({ article, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.article);
  }, [articles, searchQuery, feedMap]);

  const availableFilters = useMemo(() => {
    const result = {};
    for (const dim of FILTER_DIMS) result[dim.key] = new Set();
    for (const a of filteredBySearch) {
      if (!a.aiAnalysis) continue;
      try {
        const analysis = JSON.parse(a.aiAnalysis);
        for (const dim of FILTER_DIMS) if (analysis[dim.key]) result[dim.key].add(analysis[dim.key]);
      } catch {}
    }
    return result;
  }, [filteredBySearch]);

  const filteredArticles = useMemo(() => {
    let result = filteredBySearch;
    if (showAiOnly) result = result.filter(a => a.aiStatus === 'done');
    const filterKeys = Object.keys(activeFilters).filter(k => activeFilters[k]);
    if (filterKeys.length === 0) return result;
    return result.filter(a => {
      if (!a.aiAnalysis) return false;
      try {
        const analysis = JSON.parse(a.aiAnalysis);
        return filterKeys.every(k => analysis[k] === activeFilters[k]);
      } catch { return false; }
    });
  }, [filteredBySearch, activeFilters, showAiOnly]);

  const toggleFilter = (dimKey, value) => {
    setActiveFilters(prev =>
      prev[dimKey] === value ? { ...prev, [dimKey]: null } : { ...prev, [dimKey]: value }
    );
  };

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);
  const hasAnyAnalysis = articles.some(a => a.aiAnalysis);

  const notifyTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(notifyTimerRef.current);
    notifyTimerRef.current = setTimeout(() => {
      if (onArticlesLoaded) onArticlesLoaded(filteredArticles);
    }, 150);
    return () => clearTimeout(notifyTimerRef.current);
  }, [filteredArticles, onArticlesLoaded]);

  useEffect(() => { setSelectedIds(new Set()); }, [activeView.type, activeView.id]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else if (e.key === 'Escape') {
        if (selectedIds.size > 0) setSelectedIds(new Set());
        else if (showSearch) { setShowSearch(false); setSearchQuery(''); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showSearch, selectedIds]);

  useEffect(() => {
    if (!showAiMenu) return;
    const handler = (e) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target)) setShowAiMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAiMenu]);

  const toggleSelect = useCallback((e, articleId) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(articleId) ? next.delete(articleId) : next.add(articleId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const selectAll = useCallback(() => setSelectedIds(new Set(filteredArticles.map(a => a.id))), [filteredArticles]);

  const handleMarkReadSelected = useCallback(async () => {
    const ids = [...selectedIds];
    ids.forEach(id => updateArticleLocal(id, { isRead: 1 }));
    await bulkUpdateArticles(ids, { isRead: 1 });
    onCountChanged?.();
    clearSelection();
  }, [selectedIds, updateArticleLocal, clearSelection, onCountChanged]);

  const handleBookmarkSelected = useCallback(async () => {
    const ids = [...selectedIds];
    ids.forEach(id => updateArticleLocal(id, { isBookmarked: 1 }));
    await bulkUpdateArticles(ids, { isBookmarked: 1 });
    onCountChanged?.();
    clearSelection();
  }, [selectedIds, updateArticleLocal, clearSelection, onCountChanged]);

  const handleExportSelected = useCallback(() => {
    const selected = filteredArticles.filter(a => selectedIds.has(a.id));
    exportAsCSV(selected, feedMap);
    clearSelection();
  }, [selectedIds, filteredArticles, feedMap, clearSelection]);

  const handleOpenAIPanel = useCallback((operation) => {
    const selected = filteredArticles
      .filter(a => selectedIds.has(a.id))
      .map(a => ({ ...a, feedTitle: feedMap[a.feedId]?.title || 'Unknown' }));
    setShowAiMenu(false);
    onOpenAIPanel?.(selected, operation);
  }, [selectedIds, filteredArticles, feedMap, onOpenAIPanel]);

  const handleMarkAllRead = useCallback(async () => {
    const ids = articles.filter(a => !a.isRead).map(a => a.id);
    if (ids.length === 0) return;
    ids.forEach(id => updateArticleLocal(id, { isRead: 1 }));
    await bulkUpdateArticles(ids, { isRead: 1 });
    onCountChanged?.();
  }, [articles, updateArticleLocal, onCountChanged]);

  const viewTitle = useMemo(() => {
    switch (activeView.type) {
      case 'all': return 'All Articles';
      case 'today': return 'Today';
      case 'saved': return 'Saved';
      case 'feed': return activeView.name || 'Feed';
      case 'folder': return activeView.name || 'Folder';
      default: return 'Articles';
    }
  }, [activeView]);

  const unreadCount = articles.filter(a => !a.isRead).length;
  const selCount = selectedIds.size;
  const showFab = selCount > 0;

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('atlas-pulse-view-mode', mode);
  };

  const renderCheckbox = (article, extraClass = '') => (
    <button
      className={`article-select-btn${selectedIds.has(article.id) ? ' selected' : ''}${extraClass ? ` ${extraClass}` : ''}`}
      onClick={(e) => toggleSelect(e, article.id)}
      title={selectedIds.has(article.id) ? 'Deselect' : 'Select'}
    >
      {selectedIds.has(article.id) ? <HiOutlineCheck /> : <span className="select-circle" />}
    </button>
  );

  return (
    <div className={`article-list-panel${showFab ? ' has-fab' : ''}`}>
      <div className="article-list-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {sidebarHidden && (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onShowSidebar} title="Show sidebar">
              <HiOutlineBars3 />
            </button>
          )}
          <h2>
            {viewTitle}
            <span className="article-count"> · {filteredArticles.length} articles</span>
          </h2>
        </div>
        <div className="article-list-actions">
          <div className="view-toggle-group">
            <button
              className={`btn btn-ghost btn-sm view-toggle-btn ${viewMode === 'magazine' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('magazine')}
              title="Grid view — portrait thumbnail cards"
            >
              <HiOutlineRectangleStack />
              <span className="view-toggle-label">Grid</span>
            </button>
            <button
              className={`btn btn-ghost btn-sm view-toggle-btn ${viewMode === 'excerpt' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('excerpt')}
              title="List view — title with excerpt and thumbnail"
            >
              <HiOutlineDocumentText />
              <span className="view-toggle-label">List</span>
            </button>
            <button
              className={`btn btn-ghost btn-sm view-toggle-btn ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('compact')}
              title="Compact view — dense single-line rows"
            >
              <HiOutlineQueueList />
              <span className="view-toggle-label">Compact</span>
            </button>
          </div>

          <button
            className={`btn btn-ghost btn-sm view-toggle-btn ${showAiOnly ? 'active' : ''}`}
            onClick={() => setShowAiOnly(prev => !prev)}
            title={showAiOnly ? 'Showing AI-analyzed only — click to show all' : 'Show only AI-analyzed articles'}
          >
            <HiOutlineSparkles />
            <span className="view-toggle-label">AI</span>
          </button>

          {batchProgress?.running || batchQueuedCount > 0 ? (
            <div className="batch-running-indicator" title={`AI analyzing · ${batchQueuedCount} remaining`}>
              <span className="spinner" style={{ width: 12, height: 12, flexShrink: 0 }} />
              <span>{batchQueuedCount}</span>
            </div>
          ) : (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onTriggerBatch} title="Run AI analysis on recent articles">
              <HiOutlineSparkles />
            </button>
          )}

          <button
            className={`btn btn-ghost btn-icon btn-sm ${showSearch ? 'active' : ''}`}
            onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
            title="Search articles"
          >
            <HiOutlineMagnifyingGlass />
          </button>
          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead} title="Mark all as read">
              <HiOutlineCheckCircle /> Mark all read
            </button>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="article-search-bar">
          <HiOutlineMagnifyingGlass className="search-icon" />
          <input
            ref={searchInputRef}
            className="search-input"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button className="btn btn-ghost btn-icon btn-sm search-clear" onClick={() => setSearchQuery('')}>
              <HiOutlineXMark />
            </button>
          )}
        </div>
      )}

      {hasAnyAnalysis && (
        <>
          {openFilterDim && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpenFilterDim(null)} />
          )}
          <div className="ai-filter-row">
            <span className="ai-filter-label">Filter</span>
            {FILTER_DIMS.map((dim) => {
              const presentValues = availableFilters[dim.key];
              if (!presentValues || presentValues.size === 0) return null;
              const activeVal = activeFilters[dim.key];
              const isOpen = openFilterDim === dim.key;
              return (
                <div key={dim.key} className="ai-filter-pill-wrap">
                  <button
                    className={`ai-filter-pill ${activeVal ? 'active' : ''}`}
                    onClick={() => setOpenFilterDim(isOpen ? null : dim.key)}
                  >
                    <span>{dim.label}{activeVal ? `: ${dim.values[activeVal] || activeVal}` : ''}</span>
                    <HiOutlineChevronDown className={`ai-filter-chevron ${isOpen ? 'open' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="ai-filter-dropdown">
                      <button
                        className={`ai-filter-option ${!activeVal ? 'active' : ''}`}
                        onClick={() => { setActiveFilters(prev => ({ ...prev, [dim.key]: null })); setOpenFilterDim(null); }}
                      >
                        All
                      </button>
                      {[...presentValues].map((val) => (
                        <button
                          key={val}
                          className={`ai-filter-option ${activeVal === val ? 'active' : ''}`}
                          onClick={() => { toggleFilter(dim.key, val); setOpenFilterDim(null); }}
                        >
                          {dim.values[val] || val}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {hasActiveFilters && (
              <button className="ai-filter-clear-btn" onClick={() => setActiveFilters({})}>✕ Clear</button>
            )}
          </div>
        </>
      )}

      <div className={`article-list-content${viewMode === 'magazine' ? ' content-grid' : ''}`}>
        {loading ? (
          Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="article-card-skeleton">
              <div className="skeleton-line skeleton-short" />
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-medium" />
            </div>
          ))
        ) : filteredArticles.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              {searchQuery ? <HiOutlineMagnifyingGlass /> : <HiOutlineSparkles />}
            </span>
            <h3>
              {hasActiveFilters ? 'No matching articles'
                : searchQuery ? 'No matching articles'
                : activeView.type === 'saved' ? 'Nothing saved yet'
                : activeView.type === 'today' ? 'All caught up'
                : 'Your feed is empty'}
            </h3>
            <p>
              {hasActiveFilters ? 'No articles match the active filters'
                : searchQuery ? `No articles match "${searchQuery}"`
                : activeView.type === 'saved' ? 'Bookmark articles to find them here'
                : activeView.type === 'today' ? 'No new articles published today'
                : 'Add feeds from the sidebar to start reading'}
            </p>
          </div>
        ) : (
          filteredArticles.map((article) => {
            const feed = feedMap[article.feedId];
            const isSelected = selectedIds.has(article.id);

            if (viewMode === 'compact') {
              return (
                <div
                  key={article.id}
                  className={`article-card-compact ${article.isRead ? 'read' : ''} ${selectedArticleId === article.id ? 'active' : ''} ${isSelected ? 'card-selected' : ''}`}
                  onClick={() => onSelectArticle(article)}
                >
                  {renderCheckbox(article, 'compact-checkbox')}
                  {!article.isRead && <div className="unread-dot-compact" />}
                  {feed?.favicon
                    ? <img className="compact-favicon" src={feed.favicon} alt="" />
                    : <span className="compact-source-icon"><HiOutlineNewspaper /></span>}
                  <span className="compact-source">{feed?.title || 'Unknown'}</span>
                  <span className="compact-title">{article.title}</span>
                  <span className="compact-ai-col">
                    {article.aiStatus === 'done' && <HiOutlineSparkles title="AI analyzed" />}
                  </span>
                  <span className="compact-time">{timeAgo(article.publishedAt)}</span>
                </div>
              );
            }

            if (viewMode === 'excerpt') {
              const summary = stripHtml(article.summary || article.content || '');
              return (
                <div
                  key={article.id}
                  className={`article-card-excerpt ${article.isRead ? 'read' : ''} ${selectedArticleId === article.id ? 'active' : ''} ${isSelected ? 'card-selected' : ''}`}
                  onClick={() => onSelectArticle(article)}
                >
                  {renderCheckbox(article, 'excerpt-checkbox')}
                  {!article.isRead && <div className="unread-dot-compact" />}
                  <div className="excerpt-meta">
                    {feed?.favicon
                      ? <img className="excerpt-favicon" src={feed.favicon} alt="" />
                      : <span className="excerpt-source-icon"><HiOutlineNewspaper /></span>}
                    <span className="excerpt-source">{feed?.title || 'Unknown'}</span>
                    <span className="excerpt-time">{timeAgo(article.publishedAt)}</span>
                    {article.aiStatus === 'done' && (
                      <span className="excerpt-ai-badge" title="AI analyzed"><HiOutlineSparkles /> AI</span>
                    )}
                  </div>
                  <div className="excerpt-body">
                    <div className="excerpt-text">
                      <div className="excerpt-title">{article.title}</div>
                      {summary && <div className="excerpt-summary">{summary}</div>}
                    </div>
                    {article.imageUrl && (
                      <img
                        className="excerpt-thumbnail"
                        src={article.imageUrl}
                        alt=""
                        loading="lazy"
                        onError={(e) => (e.target.style.display = 'none')}
                      />
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={article.id}
                className={`article-card-grid ${article.isRead ? 'read' : ''} ${selectedArticleId === article.id ? 'active' : ''} ${isSelected ? 'card-selected' : ''}`}
                onClick={() => onSelectArticle(article)}
              >
                {renderCheckbox(article, 'grid-checkbox')}
                <div className="card-image-wrap">
                  {article.imageUrl ? (
                    <img
                      className="card-image"
                      src={article.imageUrl}
                      alt=""
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="card-image-placeholder"><HiOutlineNewspaper /></div>
                  )}
                  {article.aiStatus === 'done' && (
                    <span className="card-ai-badge" title="AI analyzed"><HiOutlineSparkles /></span>
                  )}
                </div>
                <div className="card-body">
                  <div className="card-meta">
                    {!article.isRead && <span className="card-unread-dot" />}
                    {feed?.favicon
                      ? <img className="card-favicon" src={feed.favicon} alt="" />
                      : <span className="card-favicon-icon"><HiOutlineNewspaper /></span>}
                    <span className="card-source">{feed?.title || 'Unknown'}</span>
                    <span className="card-dot" />
                    <span className="card-time">{timeAgo(article.publishedAt)}</span>
                  </div>
                  <h3 className="card-title">{article.title}</h3>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showFab && (
        <div className="floating-action-bar">
          <div className="fab-left">
            <button className="btn btn-ghost btn-icon btn-sm fab-clear" onClick={clearSelection} title="Clear selection">
              <HiOutlineXMark />
            </button>
            <span className="fab-count">{selCount} selected</span>
            <button className="btn btn-ghost btn-sm fab-select-all" onClick={selectAll} title="Select all visible">
              Select all {filteredArticles.length}
            </button>
          </div>
          <div className="fab-actions">
            <button className="btn btn-ghost btn-sm fab-action-btn" onClick={handleMarkReadSelected} title="Mark selected as read">
              <HiOutlineCheckCircle /> Read
            </button>
            <button className="btn btn-ghost btn-sm fab-action-btn" onClick={handleBookmarkSelected} title="Bookmark selected">
              <HiOutlineBookmark /> Save
            </button>
            <button className="btn btn-ghost btn-sm fab-action-btn" onClick={handleExportSelected} title="Export selected as CSV">
              <HiOutlineArrowDownTray /> CSV
            </button>
          </div>
          <div className="fab-ai-wrap" ref={aiMenuRef}>
            <button
              className="btn btn-accent btn-sm fab-ai-btn"
              onClick={() => setShowAiMenu(m => !m)}
              disabled={selCount < 2}
              title={selCount < 2 ? 'Select at least 2 articles' : 'AI Actions'}
            >
              <HiOutlineSparkles /> AI Actions
              <HiOutlineChevronDown className={`fab-chevron${showAiMenu ? ' open' : ''}`} />
            </button>
            {showAiMenu && (
              <div className="fab-ai-menu">
                {Object.entries(OP_LIMITS).map(([key, def]) => {
                  const disabled = selCount < def.min || selCount > def.max;
                  return (
                    <button
                      key={key}
                      className={`fab-ai-option${disabled ? ' disabled' : ''}`}
                      onClick={() => !disabled && handleOpenAIPanel(key)}
                      title={disabled ? `${def.hint} articles required` : ''}
                    >
                      <span className="fab-ai-op-label">{def.label}</span>
                      <span className="fab-ai-op-hint">{def.hint}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
