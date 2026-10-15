import { useCallback, useRef, useState } from 'react';
import { HiOutlineCheck, HiOutlinePencil } from 'react-icons/hi2';
import { saveHighlight } from '../utils/api.js';
import { HIGHLIGHT_COLORS } from '../utils/constants.js';
import { TOOLBAR_WIDTH } from './highlights/toolbarPosition.js';
import { useTextSelection } from './highlights/useTextSelection.js';

function ColorSwatches({ value, onChange }) {
  return (
    <div className="highlight-toolbar-colors">
      {Object.entries(HIGHLIGHT_COLORS).map(([id, bg]) => (
        <button key={id} className={`highlight-color-swatch${value === id ? ' active' : ''}`} style={{ background: bg }} onClick={() => onChange(id)} title={id} />
      ))}
    </div>
  );
}

const highlightRecord = ({ article, feedTitle, sel, note, color }) => ({
  article_url: article.link || '',
  article_title: article.title || '',
  article_source: feedTitle || '',
  highlighted_text: sel.text,
  note: note.trim(),
  color,
});

/** Floating toolbar for saving the selected article text as a highlight. */
export default function HighlightToolbar({ containerRef, article, feedTitle, onSaved }) {
  const [color, setColor] = useState('yellow');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [saved, setSaved] = useState(false);
  const toolbarRef = useRef(null);
  const resetDraft = useCallback(() => { setSaved(false); setNote(''); setShowNote(false); }, []);
  const [sel, setSel] = useTextSelection(containerRef, toolbarRef, resetDraft);

  const save = useCallback(async () => {
    if (!sel || !article) return;
    await saveHighlight(highlightRecord({ article, feedTitle, sel, note, color }));
    setSaved(true);
    onSaved?.();
    window.getSelection()?.removeAllRanges();
    setTimeout(() => setSel(null), 700);
  }, [sel, article, feedTitle, note, color, onSaved, setSel]);

  if (!sel) return null;

  return (
    <div ref={toolbarRef} className="highlight-toolbar" style={{ top: sel.top, left: sel.left, minWidth: TOOLBAR_WIDTH }}>
      <div className="highlight-toolbar-row">
        <ColorSwatches value={color} onChange={setColor} />
        <button className={`btn btn-ghost btn-icon btn-sm${showNote ? ' active' : ''}`} onClick={() => setShowNote((p) => !p)} title="Add note">
          <HiOutlinePencil />
        </button>
        <button className="highlight-save-btn" onClick={save} disabled={saved} style={{ background: HIGHLIGHT_COLORS[color], color: '#1a1a1a' }}>
          {saved ? <HiOutlineCheck /> : 'Save'}
        </button>
      </div>
      {showNote && (
        <textarea className="highlight-note-input" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} rows={2} autoFocus />
      )}
    </div>
  );
}
