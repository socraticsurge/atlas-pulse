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
} from 'react-icons/hi2';
import db from '../db/database.js';
import { timeAgo, stripHtml } from '../utils/helpers.js';

export default function ArticleList({
  activeView,
  selectedArticleId,
  onSelectArticle,
  onArticlesLoaded,
  sidebarHidden = false,
  onShowSidebar,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState(() =>
    localStorage.getItem('atlas-pulse-view-mode') || 'magazine'
  );

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

  // Filter articles by search query (local search across title + summary + source)
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

  // Notify parent of the current visible articles list
  useEffect(() => {
    if (onArticlesLoaded) {
      onArticlesLoaded(articles);
    }
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
            <span className="article-count"> · {articles.length} articles</span>
          </h2>
        </div>
        <div className="article-list-actions">
          {/* View mode toggle */}
          <div className="view-toggle-group">
            <button
              className={`btn btn-ghost btn-icon btn-sm ${viewMode === 'magazine' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('magazine')}
              title="Magazine view"
            >
              <HiOutlineRectangleStack />
            </button>
            <button
              className={`btn btn-ghost btn-icon btn-sm ${viewMode === 'excerpt' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('excerpt')}
              title="Excerpt view"
            >
              <HiOutlineDocumentText />
            </button>
            <button
              className={`btn btn-ghost btn-icon btn-sm ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('compact')}
              title="Compact view"
            >
              <HiOutlineQueueList />
            </button>
          </div>

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
                  db.articles.where('id').anyOf(ids).modify({ isRead: true });
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

      <div className="article-list-content">
        {articles.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              {searchQuery ? <HiOutlineMagnifyingGlass /> : <HiOutlineSparkles />}
            </span>
            <h3>
              {searchQuery
                ? 'No matching articles'
                : activeView.type === 'saved'
                ? 'Nothing saved yet'
                : activeView.type === 'today'
                ? 'All caught up'
                : 'Your feed is empty'}
            </h3>
            <p>
              {searchQuery
                ? `No articles match "${searchQuery}"`
                : activeView.type === 'saved'
                ? 'Bookmark articles to find them here'
                : activeView.type === 'today'
                ? 'No new articles published today'
                : 'Add feeds from the sidebar to start reading'}
            </p>
          </div>
        ) : (
          articles.map((article) => {
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
                {article.imageUrl && (
                  <div className="card-image-wrap">
                    <img
                      className="card-image"
                      src={article.imageUrl}
                      alt=""
                      loading="lazy"
                      onError={(e) => { const w = e.target.closest('.card-image-wrap'); if (w) w.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="card-body">
                  <div className="card-meta">
                    {!article.isRead && <span className="card-unread-dot" />}
                    {feed?.favicon ? (
                      <img className="card-favicon" src={feed.favicon} alt="" />
                    ) : (
                      <span className="card-favicon-icon"><HiOutlineNewspaper /></span>
                    )}
                    <span className="card-source">{feed?.title || 'Unknown'}</span>
                    <span className="card-time">{timeAgo(article.publishedAt)}</span>
                  </div>
                  <h3 className="card-title">{article.title}</h3>
                  <p className="card-excerpt">{stripHtml(article.summary || article.content)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
