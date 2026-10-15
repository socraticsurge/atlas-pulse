import { HiOutlineArrowDownTray, HiOutlineExclamationCircle, HiOutlineMagnifyingGlass, HiOutlineXMark } from 'react-icons/hi2';

/** Library header: icon, title with count, search toggle, CSV export. */
export function LibraryHeader({ Icon, title, collection, exportUrl, exportTitle }) {
  const count = collection.rows.length;
  return (
    <div className="library-header">
      <div className="library-header-left">
        <Icon style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0 }} />
        <h2>
          {title}
          {count > 0 && <span className="article-count"> · {count}</span>}
        </h2>
      </div>
      <div className="library-header-actions">
        <button className={`btn btn-ghost btn-icon btn-sm ${collection.showSearch ? 'active' : ''}`} onClick={collection.toggleSearch} title="Search">
          <HiOutlineMagnifyingGlass />
        </button>
        {count > 0 && (
          <a href={exportUrl} download className="btn btn-secondary btn-sm" title={exportTitle}>
            <HiOutlineArrowDownTray /> Export CSV
          </a>
        )}
      </div>
    </div>
  );
}

export function LibrarySearchBar({ collection, placeholder }) {
  if (!collection.showSearch) return null;
  return (
    <div className="article-search-bar">
      <HiOutlineMagnifyingGlass className="search-icon" />
      <input className="search-input" placeholder={placeholder} value={collection.search} onChange={(e) => collection.setSearch(e.target.value)} autoFocus />
      {collection.search && (
        <button className="btn btn-ghost btn-icon btn-sm search-clear" onClick={() => collection.setSearch('')}>
          <HiOutlineXMark />
        </button>
      )}
    </div>
  );
}

export function DbPath({ path }) {
  if (!path) return null;
  return (
    <div className="library-db-path">
      <span>SQLite:</span>
      <code>{path}</code>
    </div>
  );
}

/** Loading spinner, error with retry, or the empty state; children otherwise. */
export function LibraryBody({ collection, empty, children }) {
  const { loading, error, filtered } = collection;
  return (
    <div className="library-body">
      {loading && <div className="empty-state"><span className="spinner" style={{ width: 24, height: 24 }} /></div>}
      {error && (
        <div className="ai-error" style={{ margin: '20px 24px' }}>
          <HiOutlineExclamationCircle />
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={collection.retry}>Retry</button>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon"><empty.Icon /></span>
          <h3>{collection.search ? empty.noMatchTitle : empty.title}</h3>
          <p>{collection.search ? `${empty.noMatchPrefix} "${collection.search}"` : empty.body}</p>
        </div>
      )}
      {!loading && children}
    </div>
  );
}
