import { useState, useCallback, useMemo } from 'react';
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

function getDomain(siteUrl) {
  try {
    return new URL(siteUrl).hostname.replace(/^www\./, '');
  } catch {
    return siteUrl;
  }
}

export default function AddFeedModal({ isOpen, onClose, onAddFeed, existingFeedUrls, folders }) {
  const [activeTab, setActiveTab] = useState('discover');
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingUrl, setAddingUrl] = useState(null);
  const [error, setError] = useState('');
  const [discoveredFeeds, setDiscoveredFeeds] = useState([]);
  const [feedPreview, setFeedPreview] = useState(null);
  const [googleNewsResult, setGoogleNewsResult] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [addedUrls, setAddedUrls] = useState(new Set(existingFeedUrls || []));
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Instant catalog search — no network, purely client-side
  const searchCatalogResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    for (const cat of POPULAR_FEEDS) {
      for (const feed of cat.feeds) {
        if (
          feed.title.toLowerCase().includes(q) ||
          (feed.description || '').toLowerCase().includes(q) ||
          cat.category.toLowerCase().includes(q)
        ) {
          results.push({ feed, category: cat.category, emoji: cat.emoji });
        }
      }
    }
    return results;
  }, [searchQuery]);

  const displayedCategories = useMemo(() =>
    selectedCategory === 'all'
      ? POPULAR_FEEDS
      : POPULAR_FEEDS.filter((c) => c.category === selectedCategory),
    [selectedCategory]
  );

  const handleDiscover = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setDiscoveredFeeds([]);
    setFeedPreview(null);

    const normalizedUrl = normalizeUrl(url.trim());

    try {
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

  // Fetches Google News RSS for the current searchQuery and shows a subscribe card
  const handleSubscribeGoogleNews = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    setGoogleNewsResult(null);

    const query = searchQuery.trim();
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`;

    try {
      const feed = await api.parseFeed(googleNewsUrl);
      if (feed && feed.items && feed.items.length > 0) {
        setGoogleNewsResult({
          query,
          feedUrl: googleNewsUrl,
          title: `Google News: ${query}`,
          description: `Live news about "${query}" from Google News`,
          articleCount: feed.items.length,
          sampleArticles: feed.items.slice(0, 3),
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
    if (addingUrl) return;
    setAddingUrl(feedUrl);
    setError('');
    try {
      await onAddFeed(feedUrl, selectedFolder ? parseInt(selectedFolder) : null);
      setAddedUrls((prev) => new Set([...prev, feedUrl]));
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingUrl(null);
    }
  }, [onAddFeed, selectedFolder, addingUrl]);

  const handleAddFromPreview = useCallback(async () => {
    if (!feedPreview) return;
    await handleAddFeed(feedPreview.feedUrl);
    setFeedPreview(null);
    setUrl('');
  }, [feedPreview, handleAddFeed]);

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
            <div className="feed-error-banner">{error}</div>
          )}

          {/* ── URL Tab ── */}
          {activeTab === 'discover' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <HiOutlineGlobeAlt className="input-icon-left" />
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

              {feedPreview && (
                <div className="discovery-results">
                  <div className="feed-preview-card">
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
                      disabled={addedUrls.has(feedPreview.feedUrl) || addingUrl === feedPreview.feedUrl}
                      style={{ width: '100%' }}
                    >
                      {addingUrl === feedPreview.feedUrl ? (
                        <><span className="spinner" style={{ width: 14, height: 14 }} /> Adding…</>
                      ) : addedUrls.has(feedPreview.feedUrl) ? (
                        <><HiOutlineCheckCircle /> Already Added</>
                      ) : (
                        <><HiOutlinePlus /> Add This Feed</>
                      )}
                    </button>
                  </div>
                </div>
              )}

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
                          disabled={addedUrls.has(feed.url) || !!addingUrl}
                        >
                          {addingUrl === feed.url
                            ? <span className="spinner" style={{ width: 12, height: 12 }} />
                            : addedUrls.has(feed.url) ? '✓ Added' : 'Add'}
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

          {/* ── Search Tab ── */}
          {activeTab === 'search' && (
            <div>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <HiOutlineMagnifyingGlass className="input-icon-left" />
                <input
                  className="input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Search 150+ curated feeds by name, topic, or category..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setGoogleNewsResult(null);
                  }}
                  autoFocus
                />
              </div>

              {/* Empty state */}
              {!searchQuery.trim() && (
                <div className="search-empty-state">
                  <HiOutlineMagnifyingGlass className="search-empty-icon" />
                  <p>Start typing to search <strong>150+ curated feeds</strong> across 24 categories</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>
                    Try: <em>"AI"</em>, <em>"climate"</em>, <em>"design"</em>, <em>"crypto"</em>...
                  </p>
                </div>
              )}

              {/* Catalog results */}
              {searchQuery.trim() && searchCatalogResults.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="search-results-header">
                    {searchCatalogResults.length} curated feed{searchCatalogResults.length !== 1 ? 's' : ''} match
                  </div>
                  {searchCatalogResults.map(({ feed, category, emoji }) => (
                    <div key={feed.url} className="search-result-card">
                      <img
                        src={getFaviconUrl(feed.siteUrl)}
                        alt=""
                        className="search-result-favicon"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="search-result-info">
                        <div className="search-result-title">{feed.title}</div>
                        {feed.description && (
                          <div className="search-result-desc">{feed.description}</div>
                        )}
                        <div className="search-result-meta">
                          <span className="search-result-domain">{getDomain(feed.siteUrl)}</span>
                          <span className="search-result-category">{emoji} {category}</span>
                        </div>
                      </div>
                      <button
                        className={`btn btn-sm ${addedUrls.has(feed.url) ? 'btn-ghost' : 'btn-primary'}`}
                        onClick={() => !addedUrls.has(feed.url) && handleAddFeed(feed.url)}
                        disabled={addedUrls.has(feed.url) || !!addingUrl}
                        style={{ flexShrink: 0 }}
                      >
                        {addingUrl === feed.url
                          ? <span className="spinner" style={{ width: 12, height: 12 }} />
                          : addedUrls.has(feed.url) ? <><HiOutlineCheckCircle /> Added</> : <><HiOutlinePlus /> Add</>}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* No catalog matches */}
              {searchQuery.trim() && searchCatalogResults.length === 0 && (
                <div className="search-empty-state" style={{ marginBottom: 16 }}>
                  <p>No curated feeds match <strong>"{searchQuery}"</strong></p>
                </div>
              )}

              {/* Google News subscribe option */}
              {searchQuery.trim() && !googleNewsResult && (
                <div className="google-news-subscribe-box">
                  <div className="google-news-subscribe-text">
                    <span>📡</span>
                    <span>Subscribe to live Google News about <strong>"{searchQuery}"</strong></span>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleSubscribeGoogleNews}
                    disabled={loading}
                  >
                    {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                    {loading ? 'Fetching...' : 'Subscribe'}
                  </button>
                </div>
              )}

              {/* Google News result card */}
              {googleNewsResult && (
                <div className="feed-preview-card">
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {googleNewsResult.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
                      {googleNewsResult.articleCount} articles · updates automatically
                    </div>
                    {googleNewsResult.sampleArticles.map((a, i) => (
                      <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: i < 2 ? '1px solid var(--border-primary)' : 'none' }}>
                        {a.title}
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAddFeed(googleNewsResult.feedUrl)}
                    disabled={addedUrls.has(googleNewsResult.feedUrl)}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    {addedUrls.has(googleNewsResult.feedUrl) ? (
                      <><HiOutlineCheckCircle /> Already Added</>
                    ) : (
                      <><HiOutlinePlus /> Add Google News Feed</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Popular Tab ── */}
          {activeTab === 'popular' && (
            <div>
              {/* Category pills */}
              <div className="category-pills-scroll">
                <button
                  className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  All
                </button>
                {POPULAR_FEEDS.map((cat) => (
                  <button
                    key={cat.category}
                    className={`category-pill ${selectedCategory === cat.category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.category)}
                  >
                    {cat.emoji} {cat.category}
                  </button>
                ))}
              </div>

              {/* Feed list */}
              <div className="discover-categories">
                {displayedCategories.map((cat) => (
                  <div key={cat.category} className="discover-category">
                    <h3>
                      <span className="category-heading-emoji">{cat.emoji}</span>
                      {cat.category}
                      <span className="category-heading-desc">{cat.description}</span>
                    </h3>
                    <div className="popular-feeds-list">
                      {cat.feeds.map((feed) => (
                        <div
                          key={feed.url}
                          className={`popular-feed-card ${addedUrls.has(feed.url) ? 'added' : ''}`}
                        >
                          <img
                            src={getFaviconUrl(feed.siteUrl)}
                            alt=""
                            className="popular-feed-favicon"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <div className="popular-feed-info">
                            <div className="popular-feed-title">{feed.title}</div>
                            {feed.description && (
                              <div className="popular-feed-desc">{feed.description}</div>
                            )}
                            <div className="popular-feed-domain">{getDomain(feed.siteUrl)}</div>
                          </div>
                          <button
                            className={`btn btn-sm ${addedUrls.has(feed.url) ? 'btn-ghost' : 'btn-primary'}`}
                            onClick={() => !addedUrls.has(feed.url) && handleAddFeed(feed.url)}
                            disabled={addedUrls.has(feed.url) || !!addingUrl}
                            style={{ flexShrink: 0 }}
                          >
                            {addingUrl === feed.url
                              ? <span className="spinner" style={{ width: 12, height: 12 }} />
                              : addedUrls.has(feed.url) ? <><HiOutlineCheckCircle /> Added</> : <><HiOutlinePlus /> Add</>}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Google Alerts Tab ── */}
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
