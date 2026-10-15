import { useMemo } from 'react';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import { getFaviconUrl } from '../../utils/helpers.js';
import { getDomain, searchCatalog } from './catalog.js';
import { FeedAddButton, GoogleNewsAddButton } from './FeedAddButton.jsx';

const hideOnError = (e) => { e.currentTarget.style.display = 'none'; };

function SearchHint() {
  return (
    <div className="search-empty-state">
      <HiOutlineMagnifyingGlass className="search-empty-icon" />
      <p>Start typing to search <strong>150+ curated feeds</strong> across 24 categories</p>
      <p style={{ fontSize: 12, marginTop: 4 }}>
        Try: <em>"AI"</em>, <em>"climate"</em>, <em>"design"</em>, <em>"crypto"</em>...
      </p>
    </div>
  );
}

function CatalogResults({ results, query, adder }) {
  if (results.length === 0) {
    return (
      <div className="search-empty-state" style={{ marginBottom: 16 }}>
        <p>No curated feeds match <strong>"{query}"</strong></p>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="search-results-header">
        {results.length} curated feed{results.length !== 1 ? 's' : ''} match
      </div>
      {results.map(({ feed, category, emoji }) => (
        <div key={feed.url} className="search-result-card">
          <img src={getFaviconUrl(feed.siteUrl)} alt="" className="search-result-favicon" onError={hideOnError} />
          <div className="search-result-info">
            <div className="search-result-title">{feed.title}</div>
            {feed.description && <div className="search-result-desc">{feed.description}</div>}
            <div className="search-result-meta">
              <span className="search-result-domain">{getDomain(feed.siteUrl)}</span>
              <span className="search-result-category">{emoji} {category}</span>
            </div>
          </div>
          <FeedAddButton url={feed.url} adder={adder} />
        </div>
      ))}
    </div>
  );
}

function GoogleNewsOffer({ query, loading, onFetch }) {
  return (
    <div className="google-news-subscribe-box">
      <div className="google-news-subscribe-text">
        <span>📡</span>
        <span>Subscribe to live Google News about <strong>"{query}"</strong></span>
      </div>
      <button className="btn btn-secondary btn-sm" onClick={onFetch} disabled={loading}>
        {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
        {loading ? 'Fetching...' : 'Subscribe'}
      </button>
    </div>
  );
}

function GoogleNewsCard({ result, adder }) {
  return (
    <div className="feed-preview-card">
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{result.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
          {result.articleCount} articles · updates automatically
        </div>
        {result.sampleArticles.map((a, i) => (
          <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: i < 2 ? '1px solid var(--border-primary)' : 'none' }}>
            {a.title}
          </div>
        ))}
      </div>
      <GoogleNewsAddButton url={result.feedUrl} adder={adder} />
    </div>
  );
}

/** Search tab: instant search of the curated catalog, plus a live Google News feed for the query. */
export function SearchTab({ query, onQueryChange, googleNews, loading, adder }) {
  const results = useMemo(() => searchCatalog(query), [query]);
  const hasQuery = Boolean(query.trim());
  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <HiOutlineMagnifyingGlass className="input-icon-left" />
        <input
          className="input"
          style={{ paddingLeft: 36 }}
          placeholder="Search 150+ curated feeds by name, topic, or category..."
          value={query}
          onChange={(e) => { onQueryChange(e.target.value); googleNews.reset(); }}
          autoFocus
        />
      </div>
      {!hasQuery && <SearchHint />}
      {hasQuery && <CatalogResults results={results} query={query} adder={adder} />}
      {hasQuery && !googleNews.result && <GoogleNewsOffer query={query} loading={loading} onFetch={() => googleNews.fetchFor(query)} />}
      {googleNews.result && <GoogleNewsCard result={googleNews.result} adder={adder} />}
    </div>
  );
}
