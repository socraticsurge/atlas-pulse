import { useState, useEffect, useRef, useCallback } from 'react';
import { HiOutlineCheck, HiOutlinePencil } from 'react-icons/hi2';
import db from '../db/database.js';

export const HIGHLIGHT_COLORS = {
  yellow: '#fef08a',
  green:  '#bbf7d0',
  blue:   '#bfdbfe',
  pink:   '#fecdd3',
};

export default function HighlightToolbar({ containerRef, article, feedTitle }) {
  const [sel, setSel] = useState(null);
  const [color, setColor] = useState('yellow');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [saved, setSaved] = useState(false);
  const toolbarRef = useRef(null);

  useEffect(() => {
    const onMouseUp = (e) => {
      if (toolbarRef.current?.contains(e.target)) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        setSel(null); return;
      }
      const text = selection.toString().trim();
      if (!text) { setSel(null); return; }

      const container = containerRef.current;
      if (!container) return;
      const contentEl = container.querySelector('.reader-article-content');
      if (!contentEl) return;

      const range = selection.getRangeAt(0);
      if (!contentEl.contains(range.commonAncestorContainer)) { setSel(null); return; }

      const rect = range.getBoundingClientRect();
      const toolbarWidth = 192;
      const left = Math.min(
        window.innerWidth - toolbarWidth - 8,
        Math.max(8, rect.left + rect.width / 2 - toolbarWidth / 2)
      );
      const top = rect.top < 64 ? rect.bottom + 8 : rect.top - 50;

      setSel({ text, top, left });
      setSaved(false);
      setNote('');
      setShowNote(false);
    };

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [containerRef]);

  const handleSave = useCallback(async () => {
    if (!sel || !article) return;
    await db.highlights.add({
      articleId: article.id,
      articleTitle: article.title || '',
      feedTitle: feedTitle || '',
      articleLink: article.link || '',
      text: sel.text,
      note: note.trim(),
      color,
      createdAt: new Date().toISOString(),
    });
    setSaved(true);
    window.getSelection()?.removeAllRanges();
    setTimeout(() => setSel(null), 700);
  }, [sel, article, feedTitle, note, color]);

  if (!sel) return null;

  return (
    <div ref={toolbarRef} className="highlight-toolbar" style={{ top: sel.top, left: sel.left }}>
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
          placeholder="Add a note..."
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          autoFocus
        />
      )}
    </div>
  );
}
