import { useRef } from 'react';
import { HiOutlineGlobeAlt, HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { timeAgo } from '../../utils/helpers.js';
import { FeedAddButton } from './FeedAddButton.jsx';
import { EDITIONS, SEARCH_TIPS } from './googleNews.js';
import { Card, SiteIcon } from './parts.jsx';

function EditionPicker({ value, onChange }) {
  return (
    <select
      aria-label="Google News edition"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-border bg-[var(--bg-primary)] px-2 font-sans text-[13px] text-foreground outline-none focus:border-primary"
    >
      {EDITIONS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
    </select>
  );
}

function SearchForm({ form, update, onSearch, loading, queryRef }) {
  const submit = (e) => { e.preventDefault(); onSearch(); };
  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <Input
        ref={queryRef}
        className="flex-[2_1_240px]"
        icon={HiOutlineMagnifyingGlass}
        placeholder="Company, product, person or keyword"
        aria-label="Search Google News"
        value={form.query}
        onChange={(e) => update({ query: e.target.value })}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the field opens with its Add feed tab, so focus belongs in it
        autoFocus
      />
      <Input
        className="flex-[1_1_150px]"
        icon={HiOutlineGlobeAlt}
        placeholder="All news sites"
        aria-label="Only from one site, for example reuters.com"
        value={form.site}
        onChange={(e) => update({ site: e.target.value })}
      />
      <EditionPicker value={form.edition} onChange={(edition) => update({ edition })} />
      <Button type="submit" className="h-9" disabled={loading || !form.query.trim()}>
        {loading ? <Spinner /> : <HiOutlineMagnifyingGlass />} Preview
      </Button>
    </form>
  );
}

function NewsPreview({ result, adder }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <SiteIcon siteUrl="https://news.google.com" size="size-8" />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-foreground">{result.title}</div>
          <div className="mt-1 font-mono text-[11px] text-[var(--text-tertiary)]">{result.articleCount} articles now · new ones arrive with each refresh</div>
        </div>
      </div>
      <ul className="m-0 my-3 list-none p-0">
        {result.sampleArticles.map((a) => (
          <li key={a.guid || a.link} className="flex gap-3 border-b border-border py-1.5 text-[13px] text-muted-foreground last:border-b-0">
            <span className="min-w-0 flex-1">{a.title}</span>
            <span className="shrink-0 font-mono text-[11px] text-[var(--text-tertiary)]">{timeAgo(a.publishedAt)}</span>
          </li>
        ))}
      </ul>
      <FeedAddButton url={result.feedUrl} adder={adder} label="Add Google News feed" wide />
    </Card>
  );
}

function SearchTips({ onPick }) {
  return (
    <section aria-labelledby="google-news-tips">
      <h4 id="google-news-tips" className="m-0 mb-3 text-[13px] font-semibold text-foreground">Narrow your search</h4>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {SEARCH_TIPS.map(({ example, text }) => (
          <li key={example}>
            <button
              type="button"
              onClick={() => onPick(example)}
              className="cursor-pointer rounded-md border border-border bg-[var(--bg-primary)] px-2 py-1 font-mono text-[12px] text-foreground hover:border-primary"
            >
              {example}
            </button>
            <div className="mt-1 text-xs text-muted-foreground">{text}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Google News tab: follow a search across news sites as a feed, in any edition. */
export function GoogleNewsTab({ googleNews, loading, adder }) {
  const { form, update, search, result } = googleNews;
  const queryRef = useRef(null);
  // A picked example goes in the search box, ready to edit or preview with Enter.
  const pick = (example) => {
    update({ query: example });
    queryRef.current?.focus();
  };
  return (
    <div className="flex flex-col gap-4">
      <h3 className="m-0 text-[14px] font-semibold text-foreground">Follow a topic across thousands of news sites</h3>
      <SearchForm form={form} update={update} onSearch={() => search()} loading={loading} queryRef={queryRef} />
      {result
        ? <NewsPreview result={result} adder={adder} />
        : <SearchTips onPick={pick} />}
    </div>
  );
}
