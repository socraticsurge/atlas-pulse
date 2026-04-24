import { useState, useCallback } from 'react';
import {
  HiOutlineXMark,
  HiOutlineGlobeAlt,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineCheckCircle,
  HiOutlineRss,
  HiOutlineBell,
} from 'react-icons/hi2';
import { POPULAR_FEEDS } from '../utils/constants.js';
import { getFaviconUrl, normalizeUrl } from '../utils/helpers.js';
import * as api from '../utils/api.js';

export default function AddFeedModal({ isOpen, onClose, onAddFeed, existingFeedUrls, folders }) {
  const [activeTab, setActiveTab] = useState('discover');
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [discoveredFeeds, setDiscoveredFeeds] = useState([]);
  const [feedPreview, setFeedPreview] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [addedUrls, setAddedUrls] = useState(new Set(existingFeedUrls || []));
  const [popularFilter, setPopularFilter] = useState('');

  const handleDiscover = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setDiscoveredFeeds([]);
    setFeedPreview(null);
    setSearchResults(null);

    const normalizedUrl = normalizeUrl(url.trim());

    try {
      // Check if it's directly an RSS feed
      try {
        const feed = await api.parseFeed(normalizedUrl);
        if (feed && feed.title && feed.items) {
          setFeedPreview({ ...feed, feedUrl: normalizedUrl });
          setLoading(false);
          return;
        }
      } catch {
        // Not a direct feed, try discovery
      }

      // Try to discover feeds from the URL
      const result = await api.discoverFeeds(normalizedUrl);
      if (result.feeds && result.feeds.length > 0) {
        setDiscoveredFeeds(result.feeds);
      } else {
        setError('No RSS feeds found for this URL. Try pasting a direct RSS feed URL, or use the Search tab to find feeds by keyword.');
      }
    } catch (err) {
      setError(err.message || 'Failed to discover feeds');
    } finally {
      setLoading(false);
    }
  }, [url]);

  // Keyword search using Google News RSS
  const handleKeywordSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    setSearchResults(null);

    const query = searchQuery.trim();
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`;

    try {
      const feed = await api.parseFeed(googleNewsUrl);
      if (feed && feed.items && feed.items.length > 0) {
        setSearchResults({
          query,
          feedUrl: googleNewsUrl,
          title: `Google News: ${query}`,
          description: `Latest news about "${query}" from Google News`,
          articleCount: feed.items.length,
          sampleArticles: feed.items.slice(0, 5),
        });
      } else {
        setError(`No results found for "${query}". Try a different search term.`);
      }
    } catch (err) {
      setError(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const handlePreviewFeed = useCallback(async (feedUrl) => {
    setLoading(true);
    setError('');
    try {
      const feed = await api.parseFeed(feedUrl);
      setFeedPreview({ ...feed, feedUrl });
    } catch (err) {
      setError(`Could not parse feed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddFeed = useCallback(async (feedUrl) => {
    try {
      await onAddFeed(feedUrl, selectedFolder ? parseInt(selectedFolder) : null);
      setAddedUrls((prev) => new Set([...prev, feedUrl]));
    } catch (err) {
      setError(err.message);
    }
  }, [onAddFeed, selectedFolder]);

  const handleAddFromPreview = useCallback(async () => {
    if (!feedPreview) return;
    await handleAddFeed(feedPreview.feedUrl);
    setFeedPreview(null);
    setUrl('');
  }, [feedPreview, handleAddFeed]);

  // Filter popular feeds by search
  const filteredPopularFeeds = popularFilter
    ? POPULAR_FEEDS.map((cat) => ({
        ...cat,
        feeds: cat.feeds.filter(
          (f) =>
            f.title.toLowerCase().includes(popularFilter.toLowerCase()) ||
            cat.category.toLowerCase().includes(popularFilter.toLowerCase())
        ),
      })).filter((cat) => cat.feeds.length > 0)
    : POPULAR_FEEDS;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2>Add Content</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <HiOutlineXMark />
          </button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'discover' ? 'active' : ''}`}
              onClick={() => setActiveTab('discover')}
            >
              <HiOutlineGlobeAlt style={{ marginRight: 6 }} />
              URL
            </button>
            <button
              className={`tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <HiOutlineMagnifyingGlass style={{ marginRight: 6 }} />
              Search
            </button>
            <button
              className={`tab ${activeTab === 'popular' ? 'active' : ''}`}
              onClick={() => setActiveTab('popular')}
            >
              <HiOutlineRss style={{ marginRight: 6 }} />
              Popular
            </button>
            <button
              className={`tab ${activeTab === 'google' ? 'active' : ''}`}
              onClick={() => setActiveTab('google')}
            >
              <HiOutlineBell style={{ marginRight: 6 }} />
              Alerts
            </button>
          </div>

          {/* Folder selector */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Add to folder:
            </label>
            <select
              className="input"
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              style={{ maxWidth: 200 }}
            >
              <option value="">Uncategorized</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--danger-muted)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          {/* Discover Tab (URL-based) */}
          {activeTab === 'discover' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <HiOutlineGlobeAlt
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    className="input"
                    style={{ paddingLeft: 36 }}
                    placeholder="Paste website URL or RSS feed URL..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleDiscover}
                  disabled={loading || !url.trim()}
                >
                  {loading ? <span className="spinner" /> : <HiOutlineMagnifyingGlass />}
                  {loading ? 'Searching...' : 'Find Feeds'}
                </button>
              </div>

              {/* Feed Preview */}
              {feedPreview && (
                <div className="discovery-results">
                  <div
                    style={{
                      padding: 16,
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      {feedPreview.link && (
                        <img
                          src={getFaviconUrl(feedPreview.link)}
                          alt=""
                          style={{ width: 32, height: 32, borderRadius: 6 }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {feedPreview.title}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>
                          {feedPreview.description}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {feedPreview.items?.length || 0} articles available
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleAddFromPreview}
                      disabled={addedUrls.has(feedPreview.feedUrl)}
                      style={{ width: '100%' }}
                    >
                      {addedUrls.has(feedPreview.feedUrl) ? (
                        <><HiOutlineCheckCircle /> Already Added</>
                      ) : (
                        <><HiOutlinePlus /> Add This Feed</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Discovered Feeds List */}
              {discoveredFeeds.length > 0 && !feedPreview && (
                <div className="discovery-results">
                  <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Found {discoveredFeeds.length} feed{discoveredFeeds.length > 1 ? 's' : ''}
                  </h4>
                  {discoveredFeeds.map((feed, i) => (
                    <div key={i} className="discovery-result">
                      <div className="discovery-result-info">
                        <div className="feed-title">{feed.title || 'RSS Feed'}</div>
                        <div className="feed-url">{feed.url}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handlePreviewFeed(feed.url)}
                        >
                          Preview
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddFeed(feed.url)}
                          disabled={addedUrls.has(feed.url)}
                        >
                          {addedUrls.has(feed.url) ? '✓ Added' : 'Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loading && !feedPreview && (
                <div className="loading-overlay">
                  <span className="spinner" />
                  <span>Searching for feeds...</span>
                </div>
              )}
            </div>
          )}

          {/* Search Tab (keyword-based) */}
          {activeTab === 'search' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Search by keyword to find Google News RSS feeds you can subscribe to.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <HiOutlineMagnifyingGlass
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    className="input"
                    style={{ paddingLeft: 36 }}
                    placeholder="e.g. artificial intelligence, climate change, startup funding..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleKeywordSearch()}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleKeywordSearch}
                  disabled={loading || !searchQuery.trim()}
                >
                  {loading ? <span className="spinner" /> : <HiOutlineMagnifyingGlass />}
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              {searchResults && (
                <div className="discovery-results">
                  <div
                    style={{
                      padding: 16,
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {searchResults.title}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {searchResults.description}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
                        {searchResults.articleCount} articles available
                      </div>

                      {/* Sample articles preview */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>
                          Recent articles
                        </div>
                        {searchResults.sampleArticles.map((article, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '6px 0',
                              borderBottom: i < searchResults.sampleArticles.length - 1 ? '1px solid var(--border-primary)' : 'none',
                              fontSize: 13,
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {article.title}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={() => handleAddFeed(searchResults.feedUrl)}
                      disabled={addedUrls.has(searchResults.feedUrl)}
                      style={{ width: '100%' }}
                    >
                      {addedUrls.has(searchResults.feedUrl) ? (
                        <><HiOutlineCheckCircle /> Already Added</>
                      ) : (
                        <><HiOutlinePlus /> Subscribe to this feed</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="loading-overlay">
                  <span className="spinner" />
                  <span>Searching Google News...</span>
                </div>
              )}
            </div>
          )}

          {/* Popular Feeds Tab */}
          {activeTab === 'popular' && (
            <div className="discover-categories">
              <div style={{ marginBottom: 12 }}>
                <input
                  className="input"
                  placeholder="Filter feeds..."
                  value={popularFilter}
                  onChange={(e) => setPopularFilter(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              {filteredPopularFeeds.map((category) => (
                <div key={category.category} className="discover-category">
                  <h3>{category.category}</h3>
                  <div className="discover-feeds-grid">
                    {category.feeds.map((feed) => (
                      <div
                        key={feed.url}
                        className={`discover-feed-card ${addedUrls.has(feed.url) ? 'added' : ''}`}
                        onClick={() => !addedUrls.has(feed.url) && handleAddFeed(feed.url)}
                      >
                        <img src={getFaviconUrl(feed.siteUrl)} alt="" />
                        <span>{feed.title}</span>
                        {addedUrls.has(feed.url) && (
                          <HiOutlineCheckCircle style={{ color: 'var(--accent)', marginLeft: 'auto' }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredPopularFeeds.length === 0 && (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <p>No feeds match "{popularFilter}"</p>
                </div>
              )}
            </div>
          )}

          {/* Google Alerts Tab */}
          {activeTab === 'google' && (
            <div>
              <div className="google-alerts-info">
                <h4>
                  <HiOutlineBell /> How to add Google Alerts as RSS
                </h4>
                <ol>
                  <li>Go to <a href="https://www.google.com/alerts" target="_blank" rel="noopener noreferrer">google.com/alerts</a></li>
                  <li>Enter your search term and click &quot;Show options&quot;</li>
                  <li>Change &quot;Deliver to&quot; from Email to <strong>RSS feed</strong></li>
                  <li>Click &quot;Create Alert&quot;</li>
                  <li>Click the RSS icon next to your alert and copy the URL</li>
                  <li>Paste the URL in the URL tab above</li>
                </ol>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    placeholder="Paste your Google Alerts RSS URL here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setActiveTab('discover');
                        handleDiscover();
                      }
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setActiveTab('discover');
                      handleDiscover();
                    }}
                    disabled={!url.trim()}
                  >
                    <HiOutlinePlus /> Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
