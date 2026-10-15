import { memo, useState } from 'react';
import {
  HiOutlineArrowTopRightOnSquare, HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineExclamationCircle,
  HiOutlineNewspaper, HiOutlineSparkles, HiOutlineTrash,
} from 'react-icons/hi2';
import { deleteSummary, fetchDBPath, fetchSummaries, getSummariesExportURL } from '../utils/api.js';
import { PERSONAS } from '../utils/aiSettings.js';
import { useConfirmAction } from '../hooks/useConfirmAction.js';
import { DbPath, LibraryBody, LibraryHeader, LibrarySearchBar } from './library/LibraryChrome.jsx';
import { useLibraryCollection, useOpenInReader } from './library/useLibraryCollection.js';

const SEARCH_FIELDS = ['article_title', 'summary_text', 'article_source'];
const EMPTY = {
  Icon: HiOutlineSparkles,
  title: 'No summaries saved yet',
  body: 'Open an article, generate an AI summary, then click Save to build your library.',
  noMatchTitle: 'No matching summaries',
  noMatchPrefix: 'No summaries match',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function parsePersonas(raw) {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return [raw]; }
}

function PersonaBadges({ raw }) {
  return parsePersonas(raw).map((id) => {
    const p = PERSONAS.find((x) => x.id === id);
    return p ? <span key={id} className="sum-badge sum-badge-persona">{p.emoji} {p.label}</span> : null;
  });
}

const ToneBadge = ({ label }) => (label ? <span className="sum-badge sum-badge-tone">{label}</span> : null);

function CardTitle({ row }) {
  if (!row.article_url) return <div className="lib-card-title">{row.article_title || '—'}</div>;
  return (
    <div className="lib-card-title">
      <a href={row.article_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        {row.article_title || row.article_url}
        <HiOutlineArrowTopRightOnSquare className="lib-ext-icon" />
      </a>
    </div>
  );
}

function CardDetail({ row }) {
  return (
    <div className="lib-detail">
      <div className="lib-badges">
        <PersonaBadges raw={row.ai_personas} />
        <ToneBadge label={row.ai_tone_voice} />
        <ToneBadge label={row.ai_tone_energy} />
        <ToneBadge label={row.ai_tone_angle} />
        {row.ai_model && <span className="sum-badge sum-badge-model">{row.ai_model.split(':')[0]}</span>}
      </div>
      <div className="lib-extra-meta">
        {row.article_author && <span>By {row.article_author}</span>}
        {row.article_published_at && <span>Published {formatDate(row.article_published_at)}</span>}
      </div>
    </div>
  );
}

// Delete with a 3 s two-click confirmation.
function DeleteButton({ onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const confirm = useConfirmAction(async () => {
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  }, 3000);
  return (
    <button
      className={`btn btn-ghost btn-icon btn-sm${confirm.armed ? ' btn-danger-confirm' : ''}`}
      onClick={confirm.trigger}
      disabled={deleting}
      title={confirm.armed ? 'Click again to confirm delete' : 'Delete summary'}
    >
      {confirm.armed ? <HiOutlineExclamationCircle /> : <HiOutlineTrash />}
    </button>
  );
}

const SummaryCard = memo(function SummaryCard({ row, onDelete, onOpenInReader }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`lib-card ${expanded ? 'expanded' : ''}`}>
      <div className="lib-card-header" onClick={() => setExpanded((e) => !e)}>
        <div className="lib-card-meta">
          <span className="lib-source">{row.article_source || 'Unknown source'}</span>
          <span className="lib-dot" />
          <span className="lib-date">{formatDate(row.created_at)}</span>
        </div>
        <span className="lib-chevron">{expanded ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}</span>
      </div>
      <CardTitle row={row} />
      <div className={`lib-summary-text ${expanded ? '' : 'clamped'}`}>{row.summary_text}</div>
      {expanded && <CardDetail row={row} />}
      <div className="lib-card-actions">
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onOpenInReader(row.article_url)} title="Open article in reader">
          <HiOutlineNewspaper />
        </button>
        <DeleteButton onDelete={() => onDelete(row.id)} />
      </div>
    </div>
  );
});

/** Saved AI summaries: browse, search, expand, open in reader, delete, export. */
export default function LibraryView({ onOpenArticle }) {
  const collection = useLibraryCollection({ fetchRows: fetchSummaries, fetchDbPath: fetchDBPath, deleteRow: deleteSummary, searchFields: SEARCH_FIELDS });
  const openInReader = useOpenInReader(onOpenArticle);
  return (
    <div className="library-panel">
      <LibraryHeader Icon={HiOutlineSparkles} title="Summaries Library" collection={collection} exportUrl={getSummariesExportURL()} exportTitle="Export all as CSV" />
      <LibrarySearchBar collection={collection} placeholder="Search summaries…" />
      <DbPath path={collection.dbPath} />
      <LibraryBody collection={collection} empty={EMPTY}>
        {collection.filtered.map((row) => (
          <SummaryCard key={row.id} row={row} onDelete={collection.remove} onOpenInReader={openInReader} />
        ))}
      </LibraryBody>
    </div>
  );
}
