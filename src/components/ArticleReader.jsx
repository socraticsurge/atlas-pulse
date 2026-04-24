import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import DOMPurify from 'dompurify';
import {
  HiOutlineBookmark,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineXMark,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
} from 'react-icons/hi2';
import { BsBookmarkFill } from 'react-icons/bs';
import db from '../db/database.js';
import { formatDate, estimateReadTime } from '../utils/helpers.js';
import * as api from '../utils/api.js';
import ReaderSettings, { getReaderSettings, getReaderCSSVars } from './ReaderSettings.jsx';
import ResizableHandle from './ResizableHandle.jsx';

export default function ArticleReader({ 
  article, 
  isOpen, 
  onClose,
  onNavigate,
  hasNext,
  hasPrev,
  currentIndex,
  totalCount,
  width,
  onResize
}) {
  const [extractedContent, setExtractedContent] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [readerSettings, setReaderSettings] = useState(getReaderSettings);
  const [isVisible, setIsVisible] = useState(false);

  // ALL hooks must be called before any conditional returns
  const feed = useLiveQuery(
    () => (article ? db.feeds.get(article.feedId) : undefined),
    [article?.feedId]
  );

  // Re-query the article for live bookmark/read state
  const liveArticle = useLiveQuery(
    () => (article ? db.articles.get(article.id) : undefined),
    [article?.id]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Don't trigger navigation if the user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          if (hasPrev) onNavigate(-1);
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          if (hasNext) onNavigate(1);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, onNavigate, onClose]);

  // Handle slide animation visibility
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow display: block to apply before setting transform
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Reset when article changes
  useEffect(() => {
    setExtractedContent(null);
    setExtractError(null);
    setExtracting(false);
  }, [article?.id]);

  // Mark as read when opened
  useEffect(() => {
    if (article && !article.isRead) {
      db.articles.update(article.id, { isRead: true });
    }
  }, [article?.id]);

  // Auto-extract full article on select
  useEffect(() => {
    if (!article?.link) return;

    let cancelled = false;
    const extractFull = async () => {
      setExtracting(true);
      try {
        const data = await api.extractArticle(article.link);
        if (!cancelled && data.content) {
          setExtractedContent(data.content);
        }
      } catch (err) {
        if (!cancelled) {
          setExtractError(err.message);
        }
      } finally {
        if (!cancelled) {
          setExtracting(false);
        }
      }
    };

    extractFull();
    return () => { cancelled = true; };
  }, [article?.id, article?.link]);

  const toggleBookmark = useCallback(async () => {
    if (!article) return;
    const current = liveArticle || article;
    await db.articles.update(article.id, {
      isBookmarked: current.isBookmarked ? 0 : 1,
    });
  }, [article, liveArticle]);

  const toggleRead = useCallback(async () => {
    if (!article) return;
    const current = liveArticle || article;
    await db.articles.update(article.id, {
      isRead: !current.isRead,
    });
  }, [article, liveArticle]);

  const displayContent = useMemo(() => {
    if (!article) return '';
    return extractedContent || article.content || article.summary || '';
  }, [article, extractedContent]);

  const sanitizedContent = useMemo(() => {
    return DOMPurify.sanitize(displayContent, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
    });
  }, [displayContent]);

  const readerCSSVars = useMemo(() => getReaderCSSVars(readerSettings), [readerSettings]);

  // Return null if no article (empty state is no longer needed since it's an overlay)
  if (!article) {
    return null;
  }

  const currentArticle = liveArticle || article;
  const hasRSSContent = article.content || article.summary;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`reader-overlay-backdrop ${isVisible ? 'visible' : ''}`} 
        onClick={onClose}
      />
      
      {/* Slide-in panel */}
      <div 
        className={`article-reader-panel ${isVisible ? 'visible' : ''}`}
        style={{ width: `${width}px` }}
      >
        <ResizableHandle className="overlay-resize-handle" onResize={onResize} />
        <div className="reader-toolbar">
          <div className="reader-toolbar-left">
            <button
              className="btn btn-ghost btn-icon"
              onClick={onClose}
              title="Close reader (Esc)"
            >
              <HiOutlineXMark />
            </button>
            <div className="reader-nav-controls">
              <button
                className="btn btn-ghost btn-icon reader-nav-btn"
                onClick={() => onNavigate(-1)}
                disabled={!hasPrev}
                title="Previous article (↑/←)"
              >
                <HiOutlineArrowLeft />
              </button>
              <span className="reader-nav-counter">
                {currentIndex + 1} of {totalCount}
              </span>
              <button
                className="btn btn-ghost btn-icon reader-nav-btn"
                onClick={() => onNavigate(1)}
                disabled={!hasNext}
                title="Next article (↓/→)"
              >
                <HiOutlineArrowRight />
              </button>
            </div>
            
            <button
              className="btn btn-ghost btn-icon"
              onClick={toggleBookmark}
              title={currentArticle.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {currentArticle.isBookmarked ? (
                <BsBookmarkFill style={{ color: 'var(--accent)' }} />
              ) : (
                <HiOutlineBookmark />
              )}
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={toggleRead}
              title={currentArticle.isRead ? 'Mark as unread' : 'Mark as read'}
            >
              {currentArticle.isRead ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
            </button>

            {/* Extraction status indicator */}
            {extracting && (
              <span className="reader-status extracting">
                <span className="spinner" style={{ width: 12, height: 12 }} /> Loading full article…
              </span>
            )}
            {extractedContent && !extracting && (
              <span className="reader-status extracted">
                ✓ Full article loaded
              </span>
            )}
            {extractError && !extracting && !extractedContent && (
              <span className="reader-status error">
                Feed content only
              </span>
            )}
          </div>
          <div className="reader-toolbar-right">
            <ReaderSettings
              settings={readerSettings}
              onSettingsChange={setReaderSettings}
            />
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              title="Open in new tab"
            >
              <HiOutlineArrowTopRightOnSquare /> Open Original
            </a>
          </div>
        </div>

        <div className="reader-content" style={readerCSSVars}>
          <h1 className="article-title">{article.title}</h1>

          <div className="reader-meta">
            <span className="meta-source">{feed?.title || 'Unknown Source'}</span>
            <span className="meta-divider">·</span>
            <span>{formatDate(article.publishedAt)}</span>
            <span className="meta-divider">·</span>
            <span>{estimateReadTime(displayContent)}</span>
            {article.author && (
              <>
                <span className="meta-divider">·</span>
                <span>By {article.author}</span>
              </>
            )}
          </div>

          {/* Show loading state while extracting, with RSS content as fallback */}
          {extracting && hasRSSContent && (
            <div
              className="reader-article-content"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content || article.summary) }}
            />
          )}

          {/* Show extracted or fallback content when not extracting */}
          {!extracting && (
            <div
              className="reader-article-content"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          )}

          {/* If extraction failed and no RSS content, show fallback */}
          {!extracting && !displayContent && (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>No content available for this article.</p>
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <HiOutlineArrowTopRightOnSquare /> Read on Original Site
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
