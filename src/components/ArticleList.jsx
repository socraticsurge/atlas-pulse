import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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
} from 'react-icons/hi2';
import db from '../db/database.js';
import { timeAgo, stripHtml } from '../utils/helpers.js';

const FILTER_DIMS = [
  { key: 'sentiment', label: 'Sentiment', values: { positive: '😊 Positive', neutral: '😐 Neutral', negative: '😟 Negative' } },
  { key: 'urgency',   label: 'Urgency',   values: { breaking: '🔴 Breaking', developing: '🟡 Developing', evergreen: '🟢 Evergreen' } },
  { key: 'frame',     label: 'Frame',     values: { conflict: '⚔️ Conflict', human_interest: '👤 Human', economic: '📊 Economic', analytical: '🔬 Analytical' } },
  { key: 'tone',      label: 'Tone',      values: { alarming: '🚨 Alarming', analytical: '💡 Analytical', optimistic: '✨ Optimistic', opinion: '💭 Opinion' } },
  { key: 'depth',     label: 'Depth',     values: { brief: '⚡ Brief', standard: '📄 Standard', deep_dive: '📚 Deep Dive' } },
];

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
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState(() =>
    localStorage.getItem('atlas-pulse-view-mode') || 'magazine'
  );
  const [activeFilters, setActiveFilters] = useState({});
  const [openFilterDim, setOpenFilterDim] = useState(null);
  const [showAiOnly, setShowAiOnly] = useState(false);

  const feeds = useLiveQuery(() => db.feeds.toArray()) || [];
  const feedMap = useMemo(() => {
    const m = {};
    feeds.forEach((f) => (m[f.id] = f));
    return m;
  }, [feeds]);

  const rawArticles = useLiveQuery(() => {
    switch (activeView.type) {
      case 'feed':
        return db.articles
          .where('feedId')
          .equals(activeView.id)
          .toArray()
          .then((arts) => arts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)));

      case 'folder':
        return db.feeds
          .where('folderId')
          .equals(activeView.id)
          .toArray()
          .then((fds) => {
            const feedIds = fds.map((f) => f.id);
            if (feedIds.length === 0) return [];
            return db.articles
              .where('feedId')
              .anyOf(feedIds)
              .toArray()
              .then((arts) => arts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)));
          });

      case 'today': {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const startStr = start.toISOString();
        return db.articles
          .toArray()
          .then((arts) =>
            arts
              .filter((a) => a.publishedAt >= startStr)
              .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
          );
      }

      case 'saved':
        return db.articles
          .where('isBookmarked')
          .equals(1)
          .toArray()
          .then((arts) => arts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)));

      case 'all':
      default:
        return db.articles
          .toArray()
          .then((arts) => arts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)));
    }
  }, [activeView.type, activeView.id]) || [];

  // Filter articles by search query
  const articles = useMemo(() => {
    if (!searchQuery.trim()) return rawArticles;
    const q = searchQuery.toLowerCase().trim();
    return rawArticles.filter((article) => {
      const title = (article.title || '').toLowerCase();
      const summary = stripHtml(article.summary || article.content || '').toLowerCase();
      const feedTitle = (feedMap[article.feedId]?.title || '').toLowerCase();
      return title.includes(q) || summary.includes(q) || feedTitle.includes(q);
    });
  }, [rawArticles, searchQuery, feedMap]);

  // Derive which filter values are present in the current article set
  const availableFilters = useMemo(() => {
    const result = {};
    for (const dim of FILTER_DIMS) result[dim.key] = new Set();
    for (const a of articles) {
      if (!a.aiAnalysis) continue;
      try {
        const analysis = JSON.parse(a.aiAnalysis);
        for (const dim of FILTER_DIMS) {
          if (analysis[dim.key]) result[dim.key].add(analysis[dim.key]);
        }
      } catch { /* ignore */ }
    }
    return result;
  }, [articles]);

  // Apply active AI filters on top of search-filtered articles
  const filteredArticles = useMemo(() => {
    let result = articles;
    if (showAiOnly) result = result.filter(a => a.aiStatus === 'done');
    const filterKeys = Object.keys(activeFilters).filter(k => activeFilters[k]);
    if (filterKeys.length === 0) return result;
    return result.filter((a) => {
      if (!a.aiAnalysis) return false;
      try {
        const analysis = JSON.parse(a.aiAnalysis);
        return filterKeys.every(k => analysis[k] === activeFilters[k]);
      } catch { return false; }
    });
  }, [articles, activeFilters, showAiOnly]);

  const toggleFilter = (dimKey, value) => {
    setActiveFilters(prev =>
      prev[dimKey] === value ? { ...prev, [dimKey]: null } : { ...prev, [dimKey]: value }
    );
  };

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);
  const hasAnyAnalysis = articles.some(a => a.aiAnalysis);

  // Notify parent of the unfiltered article list (for navigation)
  useEffect(() => {
    if (onArticlesLoaded) onArticlesLoaded(articles);
  }, [articles, onArticlesLoaded]);

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

  const unreadCount = rawArticles.filter(a => !a.isRead).length;

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('atlas-pulse-view-mode', mode);
  };

  return (
    <div className="article-list-panel">
      <div className="article-list-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {sidebarHidden && (
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={onShowSidebar}
              title="Show sidebar"
            >
              <HiOutlineBars3 />
            </button>
          )}
          <h2>
            {viewTitle}
            <span className="article-count"> · {filteredArticles.length} articles</span>
          </h2>
        </div>
        <div className="article-list-actions">
          {/* View mode toggle */}
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

          {/* AI Only filter toggle */}
          <button
            className={`btn btn-ghost btn-sm view-toggle-btn ${showAiOnly ? 'active' : ''}`}
            onClick={() => setShowAiOnly(prev => !prev)}
            title={showAiOnly ? 'Showing AI-analyzed only — click to show all' : 'Show only AI-analyzed articles'}
          >
            <HiOutlineSparkles />
            <span className="view-toggle-label">AI</span>
          </button>

          {/* AI batch indicator / trigger */}
          {batchProgress?.running || batchQueuedCount > 0 ? (
            <div className="batch-running-indicator" title={`AI analyzing · ${batchQueuedCount} remaining`}>
              <span className="spinner" style={{ width: 12, height: 12, flexShrink: 0 }} />
              <span>{batchQueuedCount}</span>
            </div>
          ) : (
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={onTriggerBatch}
              title="Run AI analysis on recent articles"
            >
              <HiOutlineSparkles />
            </button>
          )}

          <button
            className={`btn btn-ghost btn-icon btn-sm ${showSearch ? 'active' : ''}`}
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery('');
            }}
            title="Search articles"
          >
            <HiOutlineMagnifyingGlass />
          </button>
          {unreadCount > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const ids = rawArticles.filter(a => !a.isRead).map(a => a.id);
                if (ids.length > 0) {
                  db.articles.where('id').anyOf(ids).modify({ isRead: 1 });
                }
              }}
              title="Mark all as read"
            >
              <HiOutlineCheckCircle /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="article-search-bar">
          <HiOutlineMagnifyingGlass className="search-icon" />
          <input
            className="search-input"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              className="btn btn-ghost btn-icon btn-sm search-clear"
              onClick={() => setSearchQuery('')}
            >
              <HiOutlineXMark />
            </button>
          )}
        </div>
      )}

      {/* AI content filters — per-dimension dropdown pills */}
      {hasAnyAnalysis && (
        <>
          {openFilterDim && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              onClick={() => setOpenFilterDim(null)}
            />
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
                    <span>
                      {dim.label}
                      {activeVal ? `: ${dim.values[activeVal] || activeVal}` : ''}
                    </span>
                    <HiOutlineChevronDown className={`ai-filter-chevron ${isOpen ? 'open' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="ai-filter-dropdown">
                      <button
                        className={`ai-filter-option ${!activeVal ? 'active' : ''}`}
                        onClick={() => {
                          setActiveFilters(prev => ({ ...prev, [dim.key]: null }));
                          setOpenFilterDim(null);
                        }}
                      >
                        All
                      </button>
                      {[...presentValues].map((val) => (
                        <button
                          key={val}
                          className={`ai-filter-option ${activeVal === val ? 'active' : ''}`}
                          onClick={() => {
                            toggleFilter(dim.key, val);
                            setOpenFilterDim(null);
                          }}
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
              <button
                className="ai-filter-clear-btn"
                onClick={() => setActiveFilters({})}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </>
      )}

      <div className={`article-list-content${viewMode === 'magazine' ? ' content-grid' : ''}`}>
        {filteredArticles.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              {searchQuery ? <HiOutlineMagnifyingGlass /> : <HiOutlineSparkles />}
            </span>
            <h3>
              {hasActiveFilters
                ? 'No matching articles'
                : searchQuery
                ? 'No matching articles'
                : activeView.type === 'saved'
                ? 'Nothing saved yet'
                : activeView.type === 'today'
                ? 'All caught up'
                : 'Your feed is empty'}
            </h3>
            <p>
              {hasActiveFilters
                ? 'No articles match the active filters'
                : searchQuery
                ? `No articles match "${searchQuery}"`
                : activeView.type === 'saved'
                ? 'Bookmark articles to find them here'
                : activeView.type === 'today'
                ? 'No new articles published today'
                : 'Add feeds from the sidebar to start reading'}
            </p>
          </div>
        ) : (
          filteredArticles.map((article) => {
            const feed = feedMap[article.feedId];

            if (viewMode === 'compact') {
              return (
                <div
                  key={article.id}
                  className={`article-card-compact ${article.isRead ? 'read' : ''} ${
                    selectedArticleId === article.id ? 'active' : ''
                  }`}
                  onClick={() => onSelectArticle(article)}
                >
                  {!article.isRead && <div className="unread-dot-compact" />}
                  {feed?.favicon ? (
                    <img className="compact-favicon" src={feed.favicon} alt="" />
                  ) : (
                    <span className="compact-source-icon"><HiOutlineNewspaper /></span>
                  )}
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
                  className={`article-card-excerpt ${article.isRead ? 'read' : ''} ${
                    selectedArticleId === article.id ? 'active' : ''
                  }`}
                  onClick={() => onSelectArticle(article)}
                >
                  {!article.isRead && <div className="unread-dot-compact" />}
                  <div className="excerpt-meta">
                    {feed?.favicon ? (
                      <img className="excerpt-favicon" src={feed.favicon} alt="" />
                    ) : (
                      <span className="excerpt-source-icon"><HiOutlineNewspaper /></span>
                    )}
                    <span className="excerpt-source">{feed?.title || 'Unknown'}</span>
                    <span className="excerpt-time">{timeAgo(article.publishedAt)}</span>
                    {article.aiStatus === 'done' && (
                      <span className="excerpt-ai-badge" title="AI analyzed">
                        <HiOutlineSparkles /> AI
                      </span>
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

            // Card view (default)
            return (
              <div
                key={article.id}
                className={`article-card-grid ${article.isRead ? 'read' : ''} ${
                  selectedArticleId === article.id ? 'active' : ''
                }`}
                onClick={() => onSelectArticle(article)}
              >
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
                    <div className="card-image-placeholder">
                      <HiOutlineNewspaper />
                    </div>
                  )}
                  {article.aiStatus === 'done' && (
                    <span className="card-ai-badge" title="AI analyzed"><HiOutlineSparkles /></span>
                  )}
                </div>
                <div className="card-body">
                  <div className="card-meta">
                    {!article.isRead && <span className="card-unread-dot" />}
                    {feed?.favicon ? (
                      <img className="card-favicon" src={feed.favicon} alt="" />
                    ) : (
                      <span className="card-favicon-icon"><HiOutlineNewspaper /></span>
                    )}
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
    </div>
  );
}
