import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';

// Feed HTML is untrusted. We allow <iframe> for legitimate video embeds only:
// any iframe whose src is not on this host allowlist is dropped, so a malicious
// feed cannot embed an arbitrary phishing/clickjacking frame in the trusted UI.
const IFRAME_HOST_ALLOWLIST = [
  'www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com',
  'player.vimeo.com', 'w.soundcloud.com',
];
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName !== 'iframe') return;
  let host = '';
  try { host = new URL(node.getAttribute('src') || '', 'https://x.invalid').hostname; }
  catch { /* invalid/relative src → leave host empty so the iframe is dropped */ }
  if (!IFRAME_HOST_ALLOWLIST.includes(host)) {
    node.parentNode?.removeChild(node);
  }
});
// Runs after attribute sanitization, so the forced sandbox value survives
// (it isn't in ADD_ATTR) and overrides any sandbox the feed tried to set.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IFRAME') {
    node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
  }
});
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
import { formatDate, estimateReadTime } from '../utils/helpers.js';
import * as api from '../utils/api.js';
import ReaderSettings from './ReaderSettings.jsx';
import ResizableHandle from './ResizableHandle.jsx';
import AIDrawer from './AIDrawer.jsx';
import HighlightToolbar from './HighlightToolbar.jsx';
import { getReaderSettings, getReaderCSSVars } from '../utils/readerSettings.js';
import { HIGHLIGHT_COLORS } from '../utils/constants.js';

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
  onSummarySaved,
  onArticleChanged,
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
  const scrollMapRef = useRef({});

  const [feed, setFeed] = useState(null);
  const [liveArticle, setLiveArticle] = useState(null);
  const [highlights, setHighlights] = useState([]);

  const articleId = article?.id;
  const articleLink = article?.link;
  const articleFeedId = article?.feedId;

  // Reset per-article state during render rather than in effects, so the reset
  // and the first paint of the new article happen in a single render pass.
  const [prevArticleId, setPrevArticleId] = useState(articleId);
  if (prevArticleId !== articleId) {
    setPrevArticleId(articleId);
    setLiveArticle(null);
    setHighlights([]);
    setExtractedContent(null);
    setExtractError(null);
    setExtracting(false);
    setScrollProgress(0);
  }

  const [prevFeedId, setPrevFeedId] = useState(articleFeedId);
  if (prevFeedId !== articleFeedId) {
    setPrevFeedId(articleFeedId);
    setFeed(null);
  }

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) setIsVisible(false);
  }

  useEffect(() => {
    if (articleFeedId) {
      api.fetchFeed(articleFeedId).then(setFeed).catch(() => setFeed(null));
    }
  }, [articleFeedId]);

  useEffect(() => {
    if (articleId) {
      api.fetchArticle(articleId).then(setLiveArticle).catch(() => setLiveArticle(null));
    }
  }, [articleId]);

  const loadHighlights = useCallback(() => {
    if (!articleLink) return;
    api.fetchHighlightsByArticle(articleLink)
      .then(data => setHighlights(data))
      .catch(() => setHighlights([]));
  }, [articleLink]);

  useEffect(() => { loadHighlights(); }, [loadHighlights]);

  const handleHighlightDeleted = useCallback(async (id) => {
    await api.deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
  }, []);

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
  }, [isOpen, articleId]);

  // Save scroll position when leaving an article; restore it when returning
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !articleId) return;
    const scrollMap = scrollMapRef.current;
    el.scrollTop = scrollMap[articleId] || 0;
    return () => {
      scrollMap[articleId] = el.scrollTop;
    };
  }, [articleId]);

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

  const toggleBookmark = useCallback(async () => {
    if (!articleId) return;
    const current = liveArticle || article;
    const updated = await api.patchArticle(articleId, { isBookmarked: current.isBookmarked ? 0 : 1 });
    setLiveArticle(updated);
    onArticleChanged?.();
  }, [articleId, article, liveArticle, onArticleChanged]);

  const toggleRead = useCallback(async () => {
    if (!articleId) return;
    const current = liveArticle || article;
    const updated = await api.patchArticle(articleId, { isRead: current.isRead ? 0 : 1 });
    setLiveArticle(updated);
    onArticleChanged?.();
  }, [articleId, article, liveArticle, onArticleChanged]);

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
          if (articleLink) window.open(articleLink, '_blank', 'noopener,noreferrer');
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
  }, [isOpen, isModalOpen, hasPrev, hasNext, onNavigate, onClose, articleLink, zenMode, toggleBookmark]);

  // Slide animation (closing reset happens in the render-time adjustment above)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Mark as read when opened — the ref guards against re-patching the same
  // article when the parent re-renders with a stale isRead flag.
  const markedReadRef = useRef(null);
  useEffect(() => {
    if (article && !article.isRead && markedReadRef.current !== article.id) {
      markedReadRef.current = article.id;
      api.patchArticle(article.id, { isRead: 1 })
        .then(updated => { setLiveArticle(updated); onArticleChanged?.(); })
        .catch(() => {});
    }
  }, [article, onArticleChanged]);

  // Auto-extract full article — AbortController cancels the in-flight request on article change
  useEffect(() => {
    if (!articleLink) return;
    const controller = new AbortController();
    const extractFull = async () => {
      setExtracting(true);
      try {
        const data = await api.extractArticle(articleLink, controller.signal);
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
  }, [articleId, articleLink]);

  const handleCopyLink = useCallback(() => {
    if (!articleLink) return;
    navigator.clipboard.writeText(articleLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [articleLink]);

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

  // Apply saved highlights to the rendered article DOM
  useEffect(() => {
    const contentEl = contentRef.current?.querySelector('.reader-article-content');
    if (!contentEl) return;

    // Remove existing marks first
    contentEl.querySelectorAll('mark[data-highlight-id]').forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });

    for (const h of highlights) {
      const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const idx = node.nodeValue.indexOf(h.highlighted_text);
        if (idx === -1) continue;
        const before = node.nodeValue.slice(0, idx);
        const after = node.nodeValue.slice(idx + h.highlighted_text.length);
        const mark = document.createElement('mark');
        mark.setAttribute('data-highlight-id', String(h.id));
        mark.style.background = HIGHLIGHT_COLORS[h.color] || HIGHLIGHT_COLORS.yellow;
        mark.style.borderRadius = '2px';
        if (h.note) mark.title = h.note;
        mark.textContent = h.highlighted_text;
        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        frag.appendChild(mark);
        if (after) frag.appendChild(document.createTextNode(after));
        node.parentNode.replaceChild(frag, node);
        break; // first occurrence only
      }
    }
  }, [highlights, sanitizedContent, extracting]);

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
          onSummarySaved={onSummarySaved}
          highlights={highlights}
          onHighlightDeleted={handleHighlightDeleted}
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

      <HighlightToolbar
        containerRef={contentRef}
        article={currentArticle}
        feedTitle={feed?.title || ''}
        onSaved={loadHighlights}
      />
    </>
  );
}
