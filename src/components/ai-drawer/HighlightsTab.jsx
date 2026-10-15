import { HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2';
import { HIGHLIGHT_COLORS } from '../../utils/constants.js';

/** Highlights tab: the article's saved highlights. */
export default function HighlightsTab({ highlights, onDelete }) {
  return (
    <div className="ai-drawer-body highlights-tab">
      {highlights.length === 0 ? (
        <div className="ai-empty-state">
          <HiOutlinePencilSquare />
          <p>No highlights for this article yet. Select any text to save it.</p>
        </div>
      ) : (
        <div className="highlights-tab-list">
          {highlights.map((h) => (
            <div key={h.id} className="highlight-tab-item">
              <div className="highlight-tab-bar" style={{ background: HIGHLIGHT_COLORS[h.color] || HIGHLIGHT_COLORS.yellow }} />
              <div className="highlight-tab-content">
                <p className="highlight-tab-text">"{h.highlighted_text}"</p>
                {h.note && <p className="highlight-tab-note">{h.note}</p>}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm highlight-tab-delete" onClick={() => onDelete?.(h.id)} title="Delete">
                <HiOutlineTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
