import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineArrowTopRightOnSquare,
  HiOutlinePencilSquare,
  HiOutlineNewspaper,
} from 'react-icons/hi2';
import db from '../db/database.js';
import { HIGHLIGHT_COLORS } from './HighlightToolbar.jsx';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function HighlightsLibrary({ onOpenArticle }) {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

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

  const handleOpenInReader = async (articleId, articleLink) => {
    const article = await db.articles.get(articleId);
    if (article && onOpenArticle) {
      onOpenArticle(article);
    } else if (articleLink) {
      window.open(articleLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="library-panel">
      <div className="library-header">
        <div className="library-header-left">
          <HiOutlinePencilSquare style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0 }} />
          <h2>
            Highlights
            {highlights.length > 0 && (
              <span className="article-count"> · {highlights.length}</span>
            )}
          </h2>
        </div>
        <div className="library-header-actions">
          <button
            className={`btn btn-ghost btn-icon btn-sm ${showSearch ? 'active' : ''}`}
            onClick={() => { setShowSearch(s => !s); setSearch(''); }}
            title="Search"
          >
            <HiOutlineMagnifyingGlass />
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="article-search-bar">
          <HiOutlineMagnifyingGlass className="search-icon" />
          <input
            className="search-input"
            placeholder="Search highlights, notes, articles…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button className="btn btn-ghost btn-icon btn-sm search-clear" onClick={() => setSearch('')}>
              <HiOutlineXMark />
            </button>
          )}
        </div>
      )}

      <div className="library-body">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><HiOutlinePencilSquare /></span>
            <h3>{search ? 'No matching highlights' : 'No highlights yet'}</h3>
            <p>
              {search
                ? `No highlights match "${search}"`
                : 'Select any text while reading an article and click Save to keep it here.'}
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
                  </div>
                </div>
                <div className="highlight-card-actions">
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => handleOpenInReader(h.articleId, h.articleLink)}
                    title="Open article in reader"
                  >
                    <HiOutlineNewspaper />
                  </button>
                  {h.articleLink && (
                    <a
                      href={h.articleLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Open original article"
                    >
                      <HiOutlineArrowTopRightOnSquare />
                    </a>
                  )}
                  <button
                    className="btn btn-ghost btn-icon btn-sm highlight-card-delete"
                    onClick={() => handleDelete(h.id)}
                    title="Delete highlight"
                  >
                    <HiOutlineTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
