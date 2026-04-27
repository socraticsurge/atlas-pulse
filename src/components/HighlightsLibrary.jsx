import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineArrowTopRightOnSquare,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import db from '../db/database.js';
import { HIGHLIGHT_COLORS } from './HighlightToolbar.jsx';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function HighlightsLibrary() {
  const [search, setSearch] = useState('');

  const highlights = useLiveQuery(
    () => db.highlights.orderBy('createdAt').reverse().toArray()
  ) || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return highlights;
    const q = search.toLowerCase();
    return highlights.filter(h =>
      h.text.toLowerCase().includes(q) ||
      (h.note || '').toLowerCase().includes(q) ||
      (h.articleTitle || '').toLowerCase().includes(q) ||
      (h.feedTitle || '').toLowerCase().includes(q)
    );
  }, [highlights, search]);

  const handleDelete = async (id) => {
    await db.highlights.delete(id);
  };

  return (
    <div className="library-view">
      <div className="library-header">
        <div className="library-header-left">
          <HiOutlinePencilSquare className="library-header-icon" />
          <h2 className="library-title">Highlights</h2>
          <span className="library-count">{highlights.length}</span>
        </div>
      </div>

      <div className="library-search">
        <HiOutlineMagnifyingGlass className="library-search-icon" />
        <input
          className="library-search-input"
          placeholder="Search highlights, notes, articles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSearch('')}>
            <HiOutlineXMark />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="library-empty">
          <HiOutlinePencilSquare style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }} />
          <p>
            {search
              ? 'No highlights match your search.'
              : 'No highlights yet. Select any text in the article reader and click Save to keep it here.'}
          </p>
        </div>
      ) : (
        <div className="highlights-list">
          {filtered.map(h => (
            <div key={h.id} className="highlight-card">
              <div
                className="highlight-card-bar"
                style={{ background: HIGHLIGHT_COLORS[h.color] || HIGHLIGHT_COLORS.yellow }}
              />
              <div className="highlight-card-body">
                <blockquote className="highlight-card-text">{h.text}</blockquote>
                {h.note && <p className="highlight-card-note">{h.note}</p>}
                <div className="highlight-card-meta">
                  {h.feedTitle && <span className="highlight-card-source">{h.feedTitle}</span>}
                  {h.feedTitle && h.articleTitle && <span className="meta-divider">·</span>}
                  {h.articleTitle && (
                    <span className="highlight-card-article" title={h.articleTitle}>
                      {h.articleTitle.slice(0, 70)}{h.articleTitle.length > 70 ? '…' : ''}
                    </span>
                  )}
                  <span className="meta-divider">·</span>
                  <span className="highlight-card-date">{formatDate(h.createdAt)}</span>
                  {h.articleLink && (
                    <a
                      href={h.articleLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="highlight-card-link"
                      title="Open article"
                    >
                      <HiOutlineArrowTopRightOnSquare />
                    </a>
                  )}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm highlight-card-delete"
                onClick={() => handleDelete(h.id)}
                title="Delete highlight"
              >
                <HiOutlineTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
