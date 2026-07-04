import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineArrowTopRightOnSquare,
  HiOutlinePencilSquare,
  HiOutlineNewspaper,
  HiOutlineArrowDownTray,
  HiOutlineExclamationCircle,
} from 'react-icons/hi2';
import {
  fetchHighlights,
  deleteHighlight,
  getHighlightsExportURL,
  fetchHighlightsDBPath,
  fetchArticleByLink,
} from '../utils/api.js';
import { HIGHLIGHT_COLORS } from '../utils/constants.js';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function HighlightsLibrary({ onOpenArticle }) {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbPath, setDbPath] = useState('');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const load = useCallback(() => (
    fetchHighlights()
      .then(rows => { setHighlights(rows); setError(null); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  ), []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    load();
  }, [load]);

  useEffect(() => {
    load();
    fetchHighlightsDBPath().then(({ path }) => setDbPath(path)).catch(() => {});
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return highlights;
    const q = search.toLowerCase();
    return highlights.filter(h =>
      (h.highlighted_text || '').toLowerCase().includes(q) ||
      (h.note || '').toLowerCase().includes(q) ||
      (h.article_title || '').toLowerCase().includes(q) ||
      (h.article_source || '').toLowerCase().includes(q)
    );
  }, [highlights, search]);

  const handleDelete = useCallback(async (id) => {
    await deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
  }, []);

  const handleOpenInReader = useCallback(async (articleUrl) => {
    if (!articleUrl) return;
    const article = await fetchArticleByLink(articleUrl).catch(() => null);
    if (article && onOpenArticle) {
      onOpenArticle(article);
    } else {
      window.open(articleUrl, '_blank', 'noopener,noreferrer');
    }
  }, [onOpenArticle]);

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
          {highlights.length > 0 && (
            <a
              href={getHighlightsExportURL()}
              download
              className="btn btn-secondary btn-sm"
              title="Export all highlights as CSV"
            >
              <HiOutlineArrowDownTray /> Export CSV
            </a>
          )}
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

      {dbPath && (
        <div className="library-db-path">
          <span>SQLite:</span>
          <code>{dbPath}</code>
        </div>
      )}

      <div className="library-body">
        {loading && (
          <div className="empty-state">
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        )}

        {error && (
          <div className="ai-error" style={{ margin: '20px 24px' }}>
            <HiOutlineExclamationCircle />
            <span>{error}</span>
            <button className="btn btn-ghost btn-sm" onClick={retry}>Retry</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon"><HiOutlinePencilSquare /></span>
            <h3>{search ? 'No matching highlights' : 'No highlights yet'}</h3>
            <p>
              {search
                ? `No highlights match "${search}"`
                : 'Select any text while reading an article and click Save to keep it here.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="highlights-list">
            {filtered.map(h => (
              <div key={h.id} className="highlight-card">
                <div
                  className="highlight-card-bar"
                  style={{ background: HIGHLIGHT_COLORS[h.color] || HIGHLIGHT_COLORS.yellow }}
                />
                <div className="highlight-card-body">
                  <blockquote className="highlight-card-text">{h.highlighted_text}</blockquote>
                  {h.note && <p className="highlight-card-note">{h.note}</p>}
                  <div className="highlight-card-meta">
                    {h.article_source && <span className="highlight-card-source">{h.article_source}</span>}
                    {h.article_source && h.article_title && <span className="meta-divider">·</span>}
                    {h.article_title && (
                      <span className="highlight-card-article" title={h.article_title}>
                        {h.article_title.slice(0, 70)}{h.article_title.length > 70 ? '…' : ''}
                      </span>
                    )}
                    <span className="meta-divider">·</span>
                    <span className="highlight-card-date">{formatDate(h.created_at)}</span>
                  </div>
                </div>
                <div className="highlight-card-actions">
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => handleOpenInReader(h.article_url)}
                    title="Open article in reader"
                  >
                    <HiOutlineNewspaper />
                  </button>
                  {h.article_url && (
                    <a
                      href={h.article_url}
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
