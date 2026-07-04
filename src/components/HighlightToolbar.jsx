import { useState, useEffect, useRef, useCallback } from 'react';
import { HiOutlineCheck, HiOutlinePencil } from 'react-icons/hi2';
import { saveHighlight } from '../utils/api.js';
import { HIGHLIGHT_COLORS } from '../utils/constants.js';

// Toolbar intrinsic height (one row, no note): padding-top + row + padding-bottom
const TOOLBAR_HEIGHT = 40;
const TOOLBAR_WIDTH  = 210;

export default function HighlightToolbar({ containerRef, article, feedTitle, onSaved }) {
  const [sel, setSel]           = useState(null);
  const [color, setColor]       = useState('yellow');
  const [note, setNote]         = useState('');
  const [showNote, setShowNote] = useState(false);
  const [saved, setSaved]       = useState(false);
  const toolbarRef = useRef(null);

  useEffect(() => {
    // mousedown: immediately clear any visible toolbar so the user gets a
    // clean slate every time they start a new selection attempt.
    const onMouseDown = (e) => {
      if (toolbarRef.current?.contains(e.target)) return;
      setSel(null);
    };

    const onMouseUp = (e) => {
      if (toolbarRef.current?.contains(e.target)) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;

      const text = selection.toString().trim();
      if (!text) return;

      const container = containerRef.current;
      if (!container) return;
      const contentEl = container.querySelector('.reader-article-content');
      if (!contentEl) return;

      const range = selection.getRangeAt(0);
      if (!contentEl.contains(range.commonAncestorContainer)) return;

      const selRect       = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Horizontal: centre over selection, clamped inside the reader panel
      const left = Math.min(
        containerRect.right - TOOLBAR_WIDTH - 8,
        Math.max(containerRect.left + 8,
          selRect.left + selRect.width / 2 - TOOLBAR_WIDTH / 2)
      );

      // Vertical: prefer above the selection; fall back to below if too close to top
      const topAbove = selRect.top - TOOLBAR_HEIGHT - 8;
      const topBelow = selRect.bottom + 8;
      const top = topAbove >= containerRect.top + 8 ? topAbove : topBelow;

      setSel({ text, top, left });
      setSaved(false);
      setNote('');
      setShowNote(false);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSel(null);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup',   onMouseUp);
    document.addEventListener('keydown',   onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup',   onMouseUp);
      document.removeEventListener('keydown',   onKeyDown);
    };
  }, [containerRef]);

  const handleSave = useCallback(async () => {
    if (!sel || !article) return;
    await saveHighlight({
      article_url:      article.link  || '',
      article_title:    article.title || '',
      article_source:   feedTitle     || '',
      highlighted_text: sel.text,
      note:             note.trim(),
      color,
    });
    setSaved(true);
    onSaved?.();
    window.getSelection()?.removeAllRanges();
    setTimeout(() => setSel(null), 700);
  }, [sel, article, feedTitle, note, color, onSaved]);

  if (!sel) return null;

  return (
    <div
      ref={toolbarRef}
      className="highlight-toolbar"
      style={{ top: sel.top, left: sel.left, minWidth: TOOLBAR_WIDTH }}
    >
      <div className="highlight-toolbar-row">
        <div className="highlight-toolbar-colors">
          {Object.entries(HIGHLIGHT_COLORS).map(([id, bg]) => (
            <button
              key={id}
              className={`highlight-color-swatch${color === id ? ' active' : ''}`}
              style={{ background: bg }}
              onClick={() => setColor(id)}
              title={id}
            />
          ))}
        </div>
        <button
          className={`btn btn-ghost btn-icon btn-sm${showNote ? ' active' : ''}`}
          onClick={() => setShowNote(p => !p)}
          title="Add note"
        >
          <HiOutlinePencil />
        </button>
        <button
          className="highlight-save-btn"
          onClick={handleSave}
          disabled={saved}
          style={{ background: HIGHLIGHT_COLORS[color], color: '#1a1a1a' }}
        >
          {saved ? <HiOutlineCheck /> : 'Save'}
        </button>
      </div>
      {showNote && (
        <textarea
          className="highlight-note-input"
          placeholder="Add a note…"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          autoFocus
        />
      )}
    </div>
  );
}
