import { HiOutlineArrowTopRightOnSquare, HiOutlineNewspaper, HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2';
import { deleteHighlight, fetchHighlights, fetchHighlightsDBPath, getHighlightsExportURL } from '../utils/api.js';
import { HIGHLIGHT_COLORS } from '../utils/constants.js';
import { DbPath, LibraryBody, LibraryHeader, LibrarySearchBar } from './library/LibraryChrome.jsx';
import { truncate } from './library/libraryModel.js';
import { useLibraryCollection, useOpenInReader } from './library/useLibraryCollection.js';

const SEARCH_FIELDS = ['highlighted_text', 'note', 'article_title', 'article_source'];
const EMPTY = {
  Icon: HiOutlinePencilSquare,
  title: 'No highlights yet',
  body: 'Select any text while reading an article and click Save to keep it here.',
  noMatchTitle: 'No matching highlights',
  noMatchPrefix: 'No highlights match',
};

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function HighlightMeta({ h }) {
  return (
    <div className="highlight-card-meta">
      {h.article_source && <span className="highlight-card-source">{h.article_source}</span>}
      {h.article_source && h.article_title && <span className="meta-divider">·</span>}
      {h.article_title && <span className="highlight-card-article" title={h.article_title}>{truncate(h.article_title, 70)}</span>}
      <span className="meta-divider">·</span>
      <span className="highlight-card-date">{formatDate(h.created_at)}</span>
    </div>
  );
}

function HighlightCard({ h, onOpenInReader, onDelete }) {
  return (
    <div className="highlight-card">
      <div className="highlight-card-bar" style={{ background: HIGHLIGHT_COLORS[h.color] || HIGHLIGHT_COLORS.yellow }} />
      <div className="highlight-card-body">
        <blockquote className="highlight-card-text">{h.highlighted_text}</blockquote>
        {h.note && <p className="highlight-card-note">{h.note}</p>}
        <HighlightMeta h={h} />
      </div>
      <div className="highlight-card-actions">
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onOpenInReader(h.article_url)} title="Open article in reader">
          <HiOutlineNewspaper />
        </button>
        {h.article_url && (
          <a href={h.article_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Open original article">
            <HiOutlineArrowTopRightOnSquare />
          </a>
        )}
        <button className="btn btn-ghost btn-icon btn-sm highlight-card-delete" onClick={() => onDelete(h.id)} title="Delete highlight">
          <HiOutlineTrash />
        </button>
      </div>
    </div>
  );
}

/** Saved highlights across all articles: search, open, delete, export. */
export default function HighlightsLibrary({ onOpenArticle }) {
  const collection = useLibraryCollection({ fetchRows: fetchHighlights, fetchDbPath: fetchHighlightsDBPath, deleteRow: deleteHighlight, searchFields: SEARCH_FIELDS });
  const openInReader = useOpenInReader(onOpenArticle);
  const showList = !collection.error && collection.filtered.length > 0;
  return (
    <div className="library-panel">
      <LibraryHeader Icon={HiOutlinePencilSquare} title="Highlights" collection={collection} exportUrl={getHighlightsExportURL()} exportTitle="Export all highlights as CSV" />
      <LibrarySearchBar collection={collection} placeholder="Search highlights, notes, articles…" />
      <DbPath path={collection.dbPath} />
      <LibraryBody collection={collection} empty={EMPTY}>
        {showList && (
          <div className="highlights-list">
            {collection.filtered.map((h) => <HighlightCard key={h.id} h={h} onOpenInReader={openInReader} onDelete={collection.remove} />)}
          </div>
        )}
      </LibraryBody>
    </div>
  );
}
