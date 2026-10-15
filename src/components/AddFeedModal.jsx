import { useState } from 'react';
import { HiOutlineBell, HiOutlineGlobeAlt, HiOutlineMagnifyingGlass, HiOutlineRss, HiOutlineXMark } from 'react-icons/hi2';
import { useLibrary } from '../app/LibraryContext.jsx';
import { AlertsTab } from './add-feed/AlertsTab.jsx';
import { useAsyncStatus, useFeedAdder, useFeedDiscovery, useGoogleNews } from './add-feed/hooks.js';
import { PopularTab } from './add-feed/PopularTab.jsx';
import { SearchTab } from './add-feed/SearchTab.jsx';
import { UrlTab } from './add-feed/UrlTab.jsx';

const TABS = [
  { id: 'discover', label: 'URL', Icon: HiOutlineGlobeAlt },
  { id: 'search', label: 'Search', Icon: HiOutlineMagnifyingGlass },
  { id: 'popular', label: 'Popular', Icon: HiOutlineRss },
  { id: 'google', label: 'Alerts', Icon: HiOutlineBell },
];

function FolderPicker({ folders, value, onChange }) {
  return (
    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Add to folder:</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 200 }}>
        <option value="">Uncategorized</option>
        {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
    </div>
  );
}

/** Add Content modal: add feeds by URL, catalog search, popular categories, or Google Alerts. */
export default function AddFeedModal({ isOpen, onClose }) {
  const { onAddFeed, existingFeedUrls, folders } = useLibrary();
  const [tab, setTab] = useState('discover');
  const [folderId, setFolderId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const status = useAsyncStatus();
  const discovery = useFeedDiscovery(status);
  const googleNews = useGoogleNews(status);
  const adder = useFeedAdder({ onAddFeed, existingFeedUrls, folderId, setError: status.setError });

  if (!isOpen) return null;

  const panels = {
    discover: () => <UrlTab discovery={discovery} loading={status.loading} adder={adder} />,
    search: () => <SearchTab query={searchQuery} onQueryChange={setSearchQuery} googleNews={googleNews} loading={status.loading} adder={adder} />,
    popular: () => <PopularTab category={category} onCategoryChange={setCategory} adder={adder} />,
    google: () => (
      <AlertsTab url={discovery.url} onUrlChange={discovery.setUrl} onSubmit={() => { setTab('discover'); discovery.discover(); }} />
    ),
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2>Add Content</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><HiOutlineXMark /></button>
        </div>
        <div className="modal-body">
          <div className="tabs">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                <Icon style={{ marginRight: 6 }} />
                {label}
              </button>
            ))}
          </div>
          <FolderPicker folders={folders} value={folderId} onChange={setFolderId} />
          {status.error && <div className="feed-error-banner">{status.error}</div>}
          {panels[tab]()}
        </div>
      </div>
    </div>
  );
}
