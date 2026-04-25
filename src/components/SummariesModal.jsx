import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineXMark,
  HiOutlineTrash,
  HiOutlineArrowDownTray,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineSparkles,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineExclamationCircle,
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
      <span key={id} className="sum-badge sum-badge-persona">
        {p.emoji} {p.label}
      </span>
    ) : null;
  });
}

function ToneBadge({ label }) {
  if (!label) return null;
  return <span className="sum-badge sum-badge-tone">{label}</span>;
}

function SummaryRow({ row, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Delete this summary? This cannot be undone.')) return;
    setDeleting(true);
    try { await onDelete(row.id); } finally { setDeleting(false); }
  };

  return (
    <div className={`sum-row ${expanded ? 'expanded' : ''}`}>
      {/* Top line */}
      <div className="sum-row-header" onClick={() => setExpanded((e) => !e)}>
        <div className="sum-row-meta">
          <span className="sum-article-source">{row.article_source || 'Unknown source'}</span>
          <span className="sum-meta-divider">·</span>
          <span className="sum-saved-at">{formatDate(row.created_at)}</span>
        </div>
        <div className="sum-row-chevron">
          {expanded ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
        </div>
      </div>

      <div className="sum-article-title">
        {row.article_url ? (
          <a href={row.article_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            {row.article_title || row.article_url}
            <HiOutlineArrowTopRightOnSquare className="sum-ext-icon" />
          </a>
        ) : (
          row.article_title || '—'
        )}
      </div>

      {/* Summary text — always visible, clamped when collapsed */}
      <div className={`sum-text ${expanded ? '' : 'clamped'}`}>
        {row.summary_text}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="sum-detail">
          <div className="sum-config-row">
            <PersonaBadges raw={row.ai_personas} />
            <ToneBadge label={row.ai_tone_voice} />
            <ToneBadge label={row.ai_tone_energy} />
            <ToneBadge label={row.ai_tone_angle} />
            {row.ai_model && (
              <span className="sum-badge sum-badge-model">{row.ai_model.split(':')[0]}</span>
            )}
          </div>
          <div className="sum-extra-meta">
            {row.article_author && <span>By {row.article_author}</span>}
            {row.article_published_at && (
              <span>Published {formatDate(row.article_published_at)}</span>
            )}
            {row.ai_custom_instructions && (
              <span className="sum-custom-instructions">"{row.ai_custom_instructions}"</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="sum-row-actions">
        <button
          className="btn btn-ghost btn-icon btn-sm sum-delete-btn"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete summary"
        >
          <HiOutlineTrash />
        </button>
      </div>
    </div>
  );
}

export default function SummariesModal({ isOpen, onClose }) {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dbPath, setDbPath] = useState('');

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
    if (!isOpen) return;
    load();
    fetchDBPath().then(({ path }) => setDbPath(path)).catch(() => {});
  }, [isOpen, load]);

  const handleDelete = useCallback(async (id) => {
    await deleteSummary(id);
    setSummaries((prev) => prev.filter((r) => r.id !== id));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal summaries-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineSparkles style={{ color: 'var(--accent)', fontSize: 18 }} />
            <h2>AI Summaries</h2>
            {summaries.length > 0 && (
              <span className="article-count">&nbsp;· {summaries.length}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {summaries.length > 0 && (
              <a
                href={getSummariesExportURL()}
                download
                className="btn btn-secondary btn-sm"
                title="Download all as CSV (opens in Excel / Google Sheets)"
              >
                <HiOutlineArrowDownTray /> Export CSV
              </a>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <HiOutlineXMark />
            </button>
          </div>
        </div>

        {/* DB path hint */}
        {dbPath && (
          <div className="sum-db-path">
            <span>SQLite file:</span>
            <code>{dbPath}</code>
          </div>
        )}

        {/* Body */}
        <div className="modal-body sum-modal-body">
          {loading && (
            <div className="empty-state">
              <span className="spinner" style={{ width: 24, height: 24 }} />
            </div>
          )}

          {error && (
            <div className="ai-error" style={{ margin: '16px 0' }}>
              <HiOutlineExclamationCircle />
              <span>{error}</span>
              <button className="btn btn-ghost btn-sm" onClick={load}>Retry</button>
            </div>
          )}

          {!loading && !error && summaries.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon"><HiOutlineSparkles /></span>
              <h3>No summaries saved yet</h3>
              <p>Generate an AI summary in the reader, then click <strong>Save</strong> to store it here.</p>
            </div>
          )}

          {!loading && summaries.map((row) => (
            <SummaryRow key={row.id} row={row} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    </div>
  );
}
