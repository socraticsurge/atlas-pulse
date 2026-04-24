import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  HiOutlineCheckCircle,
  HiOutlineNewspaper,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineQueueList,
  HiOutlineRectangleStack,
} from 'react-icons/hi2';
import db from '../db/database.js';
import { timeAgo, stripHtml } from '../utils/helpers.js';

export default function ArticleList({
  activeView,
  selectedArticleId,
  onSelectArticle,
  onArticlesLoaded,
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
        <div>
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
            <span className="empty-icon"><HiOutlineNewspaper /></span>
            <h3>{searchQuery ? 'No matching articles' : 'No articles'}</h3>
            <p>
              {searchQuery
                ? `No articles match "${searchQuery}"`
                : activeView.type === 'saved'
                ? 'Save articles to read them later'
                : activeView.type === 'today'
                ? 'No articles published today yet'
                : 'Add some feeds to get started'}
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

            // Magazine view (default)
            return (
              <div
                key={article.id}
                className={`article-card ${article.isRead ? 'read' : ''} ${
                  selectedArticleId === article.id ? 'active' : ''
                }`}
                onClick={() => onSelectArticle(article)}
              >
                {!article.isRead && <div className="unread-dot" />}
                <div className="article-card-meta">
                  <span className="article-card-source">{feed?.title || 'Unknown'}</span>
                  <span className="article-card-dot">●</span>
                  <span className="article-card-time">{timeAgo(article.publishedAt)}</span>
                </div>
                <h3>{article.title}</h3>
                <p>{stripHtml(article.summary || article.content)}</p>
                {article.imageUrl && (
                  <img
                    className="article-card-image"
                    src={article.imageUrl}
                    alt=""
                    loading="lazy"
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
