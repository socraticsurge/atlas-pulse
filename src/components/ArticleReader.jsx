import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  HiOutlineClipboardDocument,
  HiOutlineCheck,
  HiOutlineArrowUpOnSquare,
  HiOutlineArrowsPointingOut,
  HiOutlineArrowsPointingIn,
  HiOutlineEnvelope,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { SiX } from 'react-icons/si';
import { FaLinkedinIn } from 'react-icons/fa';
import { BsBookmarkFill } from 'react-icons/bs';
import db from '../db/database.js';
import { formatDate, estimateReadTime } from '../utils/helpers.js';
import * as api from '../utils/api.js';
import ReaderSettings, { getReaderSettings, getReaderCSSVars } from './ReaderSettings.jsx';
import ResizableHandle from './ResizableHandle.jsx';
import AIDrawer from './AIDrawer.jsx';

export default function ArticleReader({
  article,
  isOpen,
  isModalOpen,
  onClose,
  onNavigate,
  hasNext,
  hasPrev,
  currentIndex,
  totalCount,
  width,
  onResize,
}) {
  const [extractedContent, setExtractedContent] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [readerSettings, setReaderSettings] = useState(getReaderSettings);
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showAI, setShowAI] = useState(false);

  const contentRef = useRef(null);
  const shareMenuRef = useRef(null);

  // Live DB queries
  const feed = useLiveQuery(
    () => (article ? db.feeds.get(article.feedId) : undefined),
    [article?.feedId]
  );
  const liveArticle = useLiveQuery(
    () => (article ? db.articles.get(article.id) : undefined),
    [article?.id]
  );

  // Reading progress bar
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const total = scrollHeight - clientHeight;
      setScrollProgress(total > 0 ? Math.min(100, (scrollTop / total) * 100) : 100);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isOpen, article?.id]);

  // Reset scroll + progress when article changes
  useEffect(() => {
    setScrollProgress(0);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [article?.id]);

  // Close share menu on outside click
  useEffect(() => {
    if (!showShareMenu) return;
    const handler = (e) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showShareMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (isModalOpen) return;
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
        case 'k':
          e.preventDefault();
          if (hasPrev) onNavigate(-1);
          break;
        case 'ArrowDown':
        case 'ArrowRight':
        case 'j':
          e.preventDefault();
          if (hasNext) onNavigate(1);
          break;
        case 'b':
          e.preventDefault();
          toggleBookmark();
          break;
        case 'o':
          e.preventDefault();
          if (article?.link) window.open(article.link, '_blank', 'noopener,noreferrer');
          break;
        case 'f':
          e.preventDefault();
          setZenMode((z) => !z);
          break;
        case 'Escape':
          e.preventDefault();
          if (zenMode) setZenMode(false);
          else onClose();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isModalOpen, hasPrev, hasNext, onNavigate, onClose, article?.link, zenMode]);

  // Slide animation
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Reset extraction state when article changes
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

  // Auto-extract full article — AbortController cancels the in-flight request on article change
  useEffect(() => {
    if (!article?.link) return;
    const controller = new AbortController();
    const extractFull = async () => {
      setExtracting(true);
      try {
        const data = await api.extractArticle(article.link, controller.signal);
        if (data.content) setExtractedContent(data.content);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setExtractError(err.message);
      } finally {
        if (!controller.signal.aborted) setExtracting(false);
      }
    };
    extractFull();
    return () => controller.abort();
  }, [article?.id, article?.link]);

  const toggleBookmark = useCallback(async () => {
    if (!article) return;
    const current = liveArticle || article;
    await db.articles.update(article.id, { isBookmarked: current.isBookmarked ? 0 : 1 });
  }, [article, liveArticle]);

  const toggleRead = useCallback(async () => {
    if (!article) return;
    const current = liveArticle || article;
    await db.articles.update(article.id, { isRead: !current.isRead });
  }, [article, liveArticle]);

  const handleCopyLink = useCallback(() => {
    if (!article?.link) return;
    navigator.clipboard.writeText(article.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [article?.link]);

  const handleShare = useCallback((platform) => {
    const url = encodeURIComponent(article?.link || '');
    const title = encodeURIComponent(article?.title || '');
    switch (platform) {
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=600,noopener');
        break;
      case 'twitter':
        window.open(`https://x.com/intent/tweet?url=${url}&text=${title}`, '_blank', 'width=600,height=400,noopener');
        break;
      case 'email':
        window.open(`mailto:?subject=${title}&body=${url}`);
        break;
      case 'native':
        navigator.share?.({ title: article?.title, url: article?.link }).catch(() => {});
        break;
      default:
        break;
    }
    setShowShareMenu(false);
  }, [article?.link, article?.title]);

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

  if (!article) return null;

  const currentArticle = liveArticle || article;
  const hasRSSContent = article.content || article.summary;
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <>
      <div
        className={`reader-overlay-backdrop ${isVisible ? 'visible' : ''} ${zenMode ? 'zen' : ''}`}
        onClick={zenMode ? () => setZenMode(false) : onClose}
      />

      <div
        className={`article-reader-panel ${isVisible ? 'visible' : ''} ${zenMode ? 'zen' : ''}`}
        style={zenMode ? undefined : { width: `${width}px` }}
      >
        {/* Reading progress bar */}
        <div
          className="reading-progress-bar"
          style={{ width: `${scrollProgress}%` }}
        />

        {!zenMode && <ResizableHandle className="overlay-resize-handle" onResize={onResize} />}

        <div className="reader-toolbar">
          <div className="reader-toolbar-left">
            <button
              className="btn btn-ghost btn-icon"
              onClick={zenMode ? () => setZenMode(false) : onClose}
              title={zenMode ? 'Exit focus mode (Esc)' : 'Close reader (Esc)'}
            >
              <HiOutlineXMark />
            </button>

            {!zenMode && (
              <div className="reader-nav-controls">
                <button
                  className="btn btn-ghost btn-icon reader-nav-btn"
                  onClick={() => onNavigate(-1)}
                  disabled={!hasPrev}
                  title="Previous article (k / ↑)"
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
                  title="Next article (j / ↓)"
                >
                  <HiOutlineArrowRight />
                </button>
              </div>
            )}

            <button
              className="btn btn-ghost btn-icon"
              onClick={toggleBookmark}
              title={currentArticle.isBookmarked ? 'Remove bookmark (b)' : 'Bookmark (b)'}
            >
              {currentArticle.isBookmarked
                ? <BsBookmarkFill style={{ color: 'var(--accent)' }} />
                : <HiOutlineBookmark />}
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={toggleRead}
              title={currentArticle.isRead ? 'Mark as unread' : 'Mark as read'}
            >
              {currentArticle.isRead ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
            </button>

            {extracting && (
              <span className="reader-status extracting">
                <span className="spinner" style={{ width: 12, height: 12 }} /> Loading…
              </span>
            )}
            {extractedContent && !extracting && (
              <span className="reader-status extracted">✓ Full article</span>
            )}
            {extractError && !extracting && !extractedContent && (
              <span className="reader-status error">Feed content only</span>
            )}
          </div>

          <div className="reader-toolbar-right">
            {/* AI Assistant */}
            <button
              className={`btn btn-ghost btn-sm ${showAI ? 'active' : ''}`}
              onClick={() => setShowAI((s) => !s)}
              title="AI Assistant — summary & chat"
            >
              <HiOutlineSparkles /> AI
            </button>

            {/* Zen / focus mode */}
            <button
              className={`btn btn-ghost btn-icon ${zenMode ? 'active' : ''}`}
              onClick={() => setZenMode((z) => !z)}
              title={zenMode ? 'Exit focus mode (f)' : 'Focus mode (f)'}
            >
              {zenMode ? <HiOutlineArrowsPointingIn /> : <HiOutlineArrowsPointingOut />}
            </button>

            <ReaderSettings settings={readerSettings} onSettingsChange={setReaderSettings} />

            {/* Share popover */}
            <div className="share-popover-anchor" ref={shareMenuRef}>
              <button
                className={`btn btn-ghost btn-sm ${showShareMenu ? 'active' : ''}`}
                onClick={() => setShowShareMenu((s) => !s)}
                title="Share"
              >
                <HiOutlineArrowUpOnSquare /> Share
              </button>
              {showShareMenu && (
                <div className="share-popover">
                  <button className="share-option" onClick={() => handleShare('linkedin')}>
                    <FaLinkedinIn style={{ color: '#0a66c2' }} /> LinkedIn
                  </button>
                  <button className="share-option" onClick={() => handleShare('twitter')}>
                    <SiX /> X / Twitter
                  </button>
                  <button className="share-option" onClick={() => handleShare('email')}>
                    <HiOutlineEnvelope /> Email
                  </button>
                  {canNativeShare && (
                    <button className="share-option" onClick={() => handleShare('native')}>
                      <HiOutlineArrowUpOnSquare /> More…
                    </button>
                  )}
                  <div className="share-divider" />
                  <button className="share-option" onClick={handleCopyLink}>
                    {copied
                      ? <HiOutlineCheck style={{ color: 'var(--accent)' }} />
                      : <HiOutlineClipboardDocument />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              )}
            </div>

            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              title="Open in new tab (o)"
            >
              <HiOutlineArrowTopRightOnSquare /> Open
            </a>
          </div>
        </div>

        <AIDrawer
          isOpen={showAI}
          onClose={() => setShowAI(false)}
          article={liveArticle || article}
          extractedContent={extractedContent}
          feedTitle={feed?.title || null}
        />

        <div className="reader-content" ref={contentRef} style={readerCSSVars}>
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

          {extracting && hasRSSContent && (
            <div
              className="reader-article-content"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content || article.summary) }}
            />
          )}
          {!extracting && (
            <div
              className="reader-article-content"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          )}
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
