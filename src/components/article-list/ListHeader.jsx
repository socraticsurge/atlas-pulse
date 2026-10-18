import {
  HiOutlineCheckCircle, HiOutlineFunnel, HiOutlineMagnifyingGlass, HiOutlinePause, HiOutlineSparkles, HiOutlineXMark,
} from 'react-icons/hi2';
import { VIEW_MODES } from './viewModes.js';
import { useConfirmAction } from '../../hooks/useConfirmAction.js';

// The mode after `id`, wrapping around.
const nextMode = (id) => VIEW_MODES[(VIEW_MODES.findIndex((m) => m.id === id) + 1) % VIEW_MODES.length].id;

// One button per view mode. Clicking the active one moves to the next mode,
// which is how a narrow list (showing only the active button) switches views.
function ViewModeToggle({ viewMode, onChange }) {
  return (
    <div className="view-toggle-group">
      {VIEW_MODES.map(({ id, label, title, Icon }) => (
        <button
          key={id}
          className={`btn btn-ghost btn-sm view-toggle-btn ${viewMode === id ? 'active' : ''}`}
          onClick={() => onChange(viewMode === id ? nextMode(id) : id)}
          title={viewMode === id ? `${title} (click for the next view)` : title}
        >
          <Icon />
          <span className="view-toggle-label">{label}</span>
        </button>
      ))}
    </div>
  );
}

const PAUSE_REASONS = {
  off: 'background AI processing is off (Settings → AI Processing)',
  'no-model': 'no AI model is available',
};

// The AI queue: a ✨ button when empty; otherwise its count, running or paused.
// Clicking the count (twice, to confirm) clears the queue.
function BatchControl({ status, pauseReason, queuedCount, onTrigger, onClear }) {
  const clear = useConfirmAction(onClear);
  if (status === 'idle') {
    return (
      <button className="btn btn-ghost btn-icon btn-sm" onClick={onTrigger} title="Run AI analysis on recent articles">
        <HiOutlineSparkles />
      </button>
    );
  }
  const paused = status === 'paused';
  const title = paused
    ? `${queuedCount} queued, paused: ${PAUSE_REASONS[pauseReason]}. Click to clear the queue.`
    : `AI analyzing · ${queuedCount} remaining. Click to stop and clear the queue.`;
  return (
    <button type="button" className={`batch-running-indicator${paused ? ' paused' : ''}`} onClick={clear.trigger} title={title}>
      {paused ? <HiOutlinePause style={{ flexShrink: 0 }} /> : <span className="spinner" style={{ width: 12, height: 12, flexShrink: 0 }} />}
      <span>{clear.armed ? `Clear ${queuedCount}?` : queuedCount}</span>
    </button>
  );
}

function MarkAllReadButton({ unreadCount, confirm }) {
  if (unreadCount === 0) return null;
  if (confirm.armed) {
    return (
      <button className="btn btn-sm btn-danger" onClick={confirm.trigger} title="Click again to confirm">
        <HiOutlineCheckCircle /> Mark {unreadCount.toLocaleString()} read?
      </button>
    );
  }
  return (
    <button className="btn btn-ghost btn-sm" onClick={confirm.trigger} title="Mark all as read">
      <HiOutlineCheckCircle /><span className="view-toggle-label"> Mark all read</span>
    </button>
  );
}

// Shows or hides the filter row; the count says how many filters are on.
function FilterButton({ filters }) {
  const label = filters.activeCount > 0 ? `Filters (${filters.activeCount} on)` : 'Filters';
  return (
    <button className={`btn btn-ghost btn-sm view-toggle-btn ${filters.open ? 'active' : ''}`} onClick={filters.toggle} title={label} aria-expanded={filters.open}>
      <HiOutlineFunnel />
      {filters.activeCount > 0 && <span className="filter-count">{filters.activeCount}</span>}
    </button>
  );
}

/** Title row: view title and count, view modes, filters, batch, search, mark all read. */
export function ListHeader({ title, count, viewMode, onViewModeChange, filters, batch, search, unreadCount, markAllRead }) {
  return (
    <div className="article-list-header">
      <div className="article-list-title">
        <h2>
          {title}
          <span className="article-count"> · {count} articles</span>
        </h2>
      </div>
      <div className="article-list-actions">
        <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />
        <FilterButton filters={filters} />
        <BatchControl {...batch} />
        <button className={`btn btn-ghost btn-icon btn-sm ${search.visible ? 'active' : ''}`} onClick={search.toggle} title="Search articles">
          <HiOutlineMagnifyingGlass />
        </button>
        <MarkAllReadButton unreadCount={unreadCount} confirm={markAllRead} />
      </div>
    </div>
  );
}

export function SearchBar({ search, inputRef }) {
  if (!search.visible) return null;
  return (
    <div className="article-search-bar">
      <HiOutlineMagnifyingGlass className="search-icon" />
      <input
        ref={inputRef}
        className="search-input"
        placeholder="Search articles..."
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        autoFocus
      />
      {search.query && (
        <button className="btn btn-ghost btn-icon btn-sm search-clear" onClick={() => search.setQuery('')}>
          <HiOutlineXMark />
        </button>
      )}
    </div>
  );
}
