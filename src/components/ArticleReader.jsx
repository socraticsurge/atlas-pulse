import { useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../utils/api.js';
import { on } from '../lib/appEvents.js';
import { getReaderCSSVars, getReaderSettings } from '../utils/readerSettings.js';
import { useOnKeyChange } from '../hooks/useOnKeyChange.js';
import AIDrawer from './AIDrawer.jsx';
import HighlightToolbar from './HighlightToolbar.jsx';
import ResizableHandle from './ResizableHandle.jsx';
import ReaderBody from './reader/ReaderBody.jsx';
import ReaderToolbar from './reader/ReaderToolbar.jsx';
import { sanitizeArticleHtml, sanitizeFeedHtml } from './reader/sanitize.js';
import { briefOf, panelLayout } from './reader/panelLayout.js';
import { useAIRail } from './reader/useAIRail.js';
import { useArticleExtraction } from './reader/useArticleExtraction.js';
import { applyHighlights, useArticleHighlights } from './reader/useArticleHighlights.js';
import { useLiveArticle } from './reader/useLiveArticle.js';
import { useReaderKeyboard } from './reader/useReaderKeyboard.js';
import { useReaderScroll } from './reader/useReaderScroll.js';

// Title of the article's feed (for the meta line, AI context, and highlights).
function useFeedTitle(feedId) {
  const [feed, setFeed] = useState(null);
  useOnKeyChange(feedId, () => setFeed(null));
  useEffect(() => {
    if (feedId) api.fetchFeed(feedId).then(setFeed).catch(() => setFeed(null));
  }, [feedId]);
  return feed?.title || null;
}

// Slide-in animation: becomes visible just after opening, hidden on close.
function useSlideIn(isOpen) {
  const [visible, setVisible] = useState(false);
  useOnKeyChange(isOpen, () => { if (!isOpen) setVisible(false); });
  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, [isOpen]);
  return visible;
}

// Reader typography; Settings changes it too (via an app event).
function useReaderSettingsState() {
  const [settings, setSettings] = useState(getReaderSettings);
  useEffect(() => on('reader-settings', setSettings), []);
  return [settings, setSettings];
}

// Best available content: extracted full text, else the feed's own HTML.
function useArticleContent(current, extractedContent) {
  const feedHtml = current?.content || current?.summary || '';
  const displayContent = extractedContent || feedHtml;
  const html = useMemo(() => sanitizeArticleHtml(displayContent), [displayContent]);
  const previewHtml = useMemo(() => (feedHtml ? sanitizeFeedHtml(feedHtml) : ''), [feedHtml]);
  return { displayContent, html, previewHtml };
}

// Focus ("zen") mode plus the reader's keyboard shortcuts, which depend on it.
function useZenAndKeyboard({ isOpen, isModalOpen, hasPrev, hasNext, onNavigate, onClose, link, toggleBookmark, toggleAI }) {
  const [on, setOn] = useState(false);
  const keyboardActions = useMemo(() => ({
    isModalOpen, hasPrev, hasNext, onNavigate, link, toggleBookmark, toggleAI,
    toggleZen: () => setOn((z) => !z),
    escape: () => (on ? setOn(false) : onClose()),
  }), [isModalOpen, hasPrev, hasNext, onNavigate, link, toggleBookmark, toggleAI, on, onClose]);
  useReaderKeyboard(isOpen, keyboardActions);
  return { on, exit: () => setOn(false), toggle: () => setOn((z) => !z) };
}

export default function ArticleReader({
  article, isOpen, isModalOpen, onClose, onNavigate, hasNext, hasPrev, currentIndex, totalCount,
  width, onResize, onSummarySaved, onArticleChanged,
}) {
  const [readerSettings, setReaderSettings] = useReaderSettingsState();
  const rail = useAIRail();
  const contentRef = useRef(null);

  const { id: articleId, link, feedId } = article || {};
  const live = useLiveArticle(article, onArticleChanged);
  const current = live.current;
  const extraction = useArticleExtraction(articleId, link);
  const { highlights, reload: reloadHighlights, remove: removeHighlight } = useArticleHighlights(articleId, link);
  const feedTitle = useFeedTitle(feedId);
  const progress = useReaderScroll(contentRef, articleId, isOpen, extraction.settled);
  const visible = useSlideIn(isOpen);
  const zen = useZenAndKeyboard({ isOpen, isModalOpen, hasPrev, hasNext, onNavigate, onClose, link, toggleBookmark: live.toggleBookmark, toggleAI: rail.toggle });
  const { displayContent, html, previewHtml } = useArticleContent(current, extraction.content);
  const cssVars = useMemo(() => getReaderCSSVars(readerSettings), [readerSettings]);

  // Draw saved highlights onto the rendered article.
  useEffect(() => {
    const container = contentRef.current?.querySelector('.reader-article-content');
    if (container) applyHighlights(container, highlights);
  }, [highlights, html, extraction.extracting]);

  if (!article) return null;

  const panel = panelLayout({ visible, zen, rail, width });

  return (
    <>
      <div className={`reader-overlay-backdrop ${panel.stateClasses}`} onClick={zen.on ? zen.exit : onClose} />

      <div className={panel.className} style={panel.style}>
        <div className="reading-progress-bar" style={{ width: `${progress}%` }} />
        {!zen.on && <ResizableHandle className="overlay-resize-handle" onResize={onResize} />}

        <div className="reader-main">
          <ReaderToolbar
            article={article}
            live={live}
            extraction={extraction}
            nav={{ onNavigate, onClose, hasPrev, hasNext, currentIndex, totalCount }}
            zen={zen}
            ai={{ open: rail.open, toggle: rail.toggle }}
            settings={{ value: readerSettings, onChange: setReaderSettings }}
          />

          <div className="reader-content" ref={contentRef} style={cssVars}>
            <ReaderBody
              article={article}
              brief={briefOf(current, article)}
              feedTitle={feedTitle}
              extracting={extraction.extracting}
              previewHtml={previewHtml}
              html={html}
              displayContent={displayContent}
            />
          </div>
        </div>

        <AIDrawer
          isOpen={rail.open}
          onClose={rail.toggle}
          width={rail.width}
          onResize={rail.resize}
          article={current}
          extractedContent={extraction.content}
          feedTitle={feedTitle}
          onSummarySaved={onSummarySaved}
          highlights={highlights}
          onHighlightDeleted={removeHighlight}
        />
      </div>

      <HighlightToolbar containerRef={contentRef} article={current} feedTitle={feedTitle || ''} onSaved={reloadHighlights} />
    </>
  );
}
