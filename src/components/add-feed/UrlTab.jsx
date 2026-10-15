import { HiOutlineGlobeAlt, HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import { getFaviconUrl } from '../../utils/helpers.js';
import { DiscoveredAddButton, PreviewAddButton } from './FeedAddButton.jsx';

function FeedPreview({ preview, adder, onAdd }) {
  return (
    <div className="discovery-results">
      <div className="feed-preview-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          {preview.link && <img src={getFaviconUrl(preview.link)} alt="" style={{ width: 32, height: 32, borderRadius: 6 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>{preview.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>{preview.description}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{preview.items?.length || 0} articles available</div>
          </div>
        </div>
        <PreviewAddButton url={preview.feedUrl} adder={adder} onAdd={onAdd} />
      </div>
    </div>
  );
}

function DiscoveredFeeds({ feeds, adder, onPreview }) {
  return (
    <div className="discovery-results">
      <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
        Found {feeds.length} feed{feeds.length > 1 ? 's' : ''}
      </h4>
      {feeds.map((feed, i) => (
        <div key={i} className="discovery-result">
          <div className="discovery-result-info">
            <div className="feed-title">{feed.title || 'RSS Feed'}</div>
            <div className="feed-url">{feed.url}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => onPreview(feed.url)}>Preview</button>
            <DiscoveredAddButton url={feed.url} adder={adder} />
          </div>
        </div>
      ))}
    </div>
  );
}

function UrlInput({ discovery, loading }) {
  const { url, setUrl } = discovery;
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <HiOutlineGlobeAlt className="input-icon-left" />
        <input
          className="input"
          style={{ paddingLeft: 36 }}
          placeholder="Paste website URL or RSS feed URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && discovery.discover()}
        />
      </div>
      <button className="btn btn-primary" onClick={discovery.discover} disabled={loading || !url.trim()}>
        {loading ? <span className="spinner" /> : <HiOutlineMagnifyingGlass />}
        {loading ? 'Searching...' : 'Find Feeds'}
      </button>
    </div>
  );
}

// A previewed feed wins over the discovered list; otherwise a spinner while searching.
function UrlResults({ discovery, loading, adder }) {
  const { preview, discovered } = discovery;
  if (preview) {
    const addFromPreview = async () => {
      await adder.add(preview.feedUrl);
      discovery.clear();
    };
    return <FeedPreview preview={preview} adder={adder} onAdd={addFromPreview} />;
  }
  return (
    <>
      {discovered.length > 0 && <DiscoveredFeeds feeds={discovered} adder={adder} onPreview={discovery.previewFeed} />}
      {loading && (
        <div className="loading-overlay">
          <span className="spinner" />
          <span>Searching for feeds...</span>
        </div>
      )}
    </>
  );
}

/** URL tab: paste a site or feed URL; preview a direct feed or pick from discovered ones. */
export function UrlTab({ discovery, loading, adder }) {
  return (
    <div>
      <UrlInput discovery={discovery} loading={loading} />
      <UrlResults discovery={discovery} loading={loading} adder={adder} />
    </div>
  );
}
