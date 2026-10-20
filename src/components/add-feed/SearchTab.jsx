import { useMemo } from 'react';
import { HiOutlineMagnifyingGlass, HiOutlineSignal } from 'react-icons/hi2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getDomain, searchCatalog } from './catalog.js';
import { FeedAddButton } from './FeedAddButton.jsx';
import { Card, FeedRow, Hint } from './parts.jsx';

function CatalogResults({ results, query, adder }) {
  if (results.length === 0) return <Hint>No curated feeds match “{query}”.</Hint>;
  return (
    <div>
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">{results.length} curated feed{results.length !== 1 ? 's' : ''}</div>
      {results.map(({ feed, category, emoji }) => (
        <FeedRow key={feed.url} siteUrl={feed.siteUrl} title={feed.title} description={feed.description} meta={`${getDomain(feed.siteUrl)} · ${emoji} ${category}`}>
          <FeedAddButton url={feed.url} adder={adder} />
        </FeedRow>
      ))}
    </div>
  );
}

function GoogleNewsOffer({ query, loading, onFetch }) {
  return (
    <Card className="flex items-center gap-3 py-3">
      <HiOutlineSignal className="size-4 shrink-0 text-primary" />
      <span className="flex-1 text-[13px] text-foreground">Follow live Google News about “{query}”</span>
      <Button variant="outline" size="sm" onClick={onFetch} disabled={loading}>{loading && <Spinner />} Preview</Button>
    </Card>
  );
}

function GoogleNewsCard({ result, adder }) {
  return (
    <Card>
      <div className="text-[14px] font-semibold text-foreground">{result.title}</div>
      <div className="mt-0.5 mb-2 font-mono text-[11px] text-[var(--text-tertiary)]">{result.articleCount} articles · updates automatically</div>
      {result.sampleArticles.map((a) => <div key={a.title} className="border-b border-border py-1.5 text-[13px] text-muted-foreground last:border-b-0">{a.title}</div>)}
      <div className="mt-3"><FeedAddButton url={result.feedUrl} adder={adder} label="Add Google News feed" wide /></div>
    </Card>
  );
}

/** Search tab: instant search of the curated catalog, plus a live Google News feed for the query. */
export function SearchTab({ query, onQueryChange, googleNews, loading, adder }) {
  const results = useMemo(() => searchCatalog(query), [query]);
  const hasQuery = Boolean(query.trim());
  return (
    <div className="flex flex-col gap-4">
      <Input
        icon={HiOutlineMagnifyingGlass}
        placeholder="Search 150+ curated feeds by name, topic or category"
        aria-label="Search curated feeds"
        value={query}
        onChange={(e) => { onQueryChange(e.target.value); googleNews.reset(); }}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the field opens with its Add feed tab, so focus belongs in it
        autoFocus
      />
      {!hasQuery && <Hint>Search <strong className="text-foreground">150+ curated feeds</strong> across 24 categories. Try “AI”, “climate”, “design”.</Hint>}
      {hasQuery && <CatalogResults results={results} query={query} adder={adder} />}
      {hasQuery && !googleNews.result && <GoogleNewsOffer query={query} loading={loading} onFetch={() => googleNews.fetchFor(query)} />}
      {googleNews.result && <GoogleNewsCard result={googleNews.result} adder={adder} />}
    </div>
  );
}
