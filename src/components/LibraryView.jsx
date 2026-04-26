import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  HiOutlineSparkles,
  HiOutlineTrash,
  HiOutlineArrowDownTray,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineExclamationCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { fetchSummaries, deleteSummary, getSummariesExportURL, fetchDBPath } from '../utils/api.js';
import { PERSONAS } from '../utils/aiSettings.js';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function parsePersonas(raw) {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return [raw]; }
}

function PersonaBadges({ raw }) {
  const ids = parsePersonas(raw);
  return ids.map((id) => {
    const p = PERSONAS.find((x) => x.id === id);
    return p ? (
      <span key={id} className="sum-badge sum-badge-persona">{p.emoji} {p.label}</span>
    ) : null;
  });
}

function ToneBadge({ label }) {
  if (!label) return null;
  return <span className="sum-badge sum-badge-tone">{label}</span>;
}

const SummaryCard = memo(function SummaryCard({ row, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimerRef = useRef(null);

  const handleDeleteClick = async () => {
    if (confirmDelete) {
      clearTimeout(confirmTimerRef.current);
      setConfirmDelete(false);
      setDeleting(true);
      try { await onDelete(row.id); } finally { setDeleting(false); }
    } else {
      setConfirmDelete(true);
      confirmTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div className={`lib-card ${expanded ? 'expanded' : ''}`}>
      <div className="lib-card-header" onClick={() => setExpanded((e) => !e)}>
        <div className="lib-card-meta">
          <span className="lib-source">{row.article_source || 'Unknown source'}</span>
          <span className="lib-dot" />
          <span className="lib-date">{formatDate(row.created_at)}</span>
        </div>
        <span className="lib-chevron">
          {expanded ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
        </span>
      </div>

      <div className="lib-card-title">
        {row.article_url ? (
          <a href={row.article_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            {row.article_title || row.article_url}
            <HiOutlineArrowTopRightOnSquare className="lib-ext-icon" />
          </a>
        ) : (
          row.article_title || '—'
        )}
      </div>

      <div className={`lib-summary-text ${expanded ? '' : 'clamped'}`}>
        {row.summary_text}
      </div>

      {expanded && (
        <div className="lib-detail">
          <div className="lib-badges">
            <PersonaBadges raw={row.ai_personas} />
            <ToneBadge label={row.ai_tone_voice} />
            <ToneBadge label={row.ai_tone_energy} />
            <ToneBadge label={row.ai_tone_angle} />
            {row.ai_model && (
              <span className="sum-badge sum-badge-model">{row.ai_model.split(':')[0]}</span>
            )}
          </div>
          <div className="lib-extra-meta">
            {row.article_author && <span>By {row.article_author}</span>}
            {row.article_published_at && <span>Published {formatDate(row.article_published_at)}</span>}
          </div>
        </div>
      )}

      <div className="lib-card-actions">
        <button
          className={`btn btn-ghost btn-icon btn-sm${confirmDelete ? ' btn-danger-confirm' : ''}`}
          onClick={handleDeleteClick}
          disabled={deleting}
          title={confirmDelete ? 'Click again to confirm delete' : 'Delete summary'}
        >
          {confirmDelete ? <HiOutlineExclamationCircle /> : <HiOutlineTrash />}
        </button>
      </div>
    </div>
  );
});

export default function LibraryView() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dbPath, setDbPath] = useState('');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSummaries();
      setSummaries(rows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetchDBPath().then(({ path }) => setDbPath(path)).catch(() => {});
  }, [load]);

  const handleDelete = useCallback(async (id) => {
    await deleteSummary(id);
    setSummaries((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return summaries;
    const q = search.toLowerCase();
    return summaries.filter((r) =>
      (r.article_title || '').toLowerCase().includes(q) ||
      (r.summary_text || '').toLowerCase().includes(q) ||
      (r.article_source || '').toLowerCase().includes(q)
    );
  }, [summaries, search]);

  return (
    <div className="library-panel">
      <div className="library-header">
        <div className="library-header-left">
          <HiOutlineSparkles style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0 }} />
          <h2>
            Summaries Library
            {summaries.length > 0 && (
              <span className="article-count"> · {summaries.length}</span>
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
          {summaries.length > 0 && (
            <a
              href={getSummariesExportURL()}
              download
              className="btn btn-secondary btn-sm"
              title="Export all as CSV"
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
            placeholder="Search summaries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            <button className="btn btn-ghost btn-sm" onClick={load}>Retry</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon"><HiOutlineSparkles /></span>
            <h3>{search ? 'No matching summaries' : 'No summaries saved yet'}</h3>
            <p>
              {search
                ? `No summaries match "${search}"`
                : 'Open an article, generate an AI summary, then click Save to build your library.'}
            </p>
          </div>
        )}

        {!loading && filtered.map((row) => (
          <SummaryCard key={row.id} row={row} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
