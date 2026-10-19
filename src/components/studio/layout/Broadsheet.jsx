import { renderInline } from '../markdown.js';
import './broadsheet.css';

// The Broadsheet design system: a newspaper in one reading column. Its
// character comes from type, rules and set-off panels; the plan (plan.js)
// decides emphasis — what leads, what is set off, which quote is pulled —
// never geometry. See principles.md.

// Bare links ("https://…" or "dev.to/a/b") show their site name.
const URL_LIKE = /(^|\s)((?:https?:\/\/)[^\s)<>\]]+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s)<>\]]*)/gi;
// [dev.to/a/b](…) — link text that is itself an address — shows the site too.
const URL_TEXT_LINK = /\[((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\]]*)?)\]\(/gi;
const hostOf = (url) => new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');

function linkify(md) {
  const named = md.replace(URL_TEXT_LINK, (match, text) => {
    try { return `[${hostOf(text)}](`; } catch { return match; }
  });
  return named.replace(URL_LIKE, (match, before, raw) => {
    const url = raw.replace(/[.,;:!?]+$/, '');
    const trailing = raw.slice(url.length);
    const href = url.startsWith('http') ? url : `https://${url}`;
    try {
      return `${before}[${hostOf(href)}](${href})${trailing}`;
    } catch {
      return match;
    }
  });
}

// Typesetting only (the words never change): curly quotes and apostrophes,
// and spaced hyphens as en dashes. Link targets in (…) are left alone.
function typeset(md) {
  return md
    .replace(/(^|[\s([{\u2014\u2013-])"(?=\S)/g, '$1\u201c')
    .replace(/"/g, '\u201d')
    .replace(/(\p{L})'(\p{L})/gu, '$1\u2019$2')
    .replace(/(^|[\s([{])'(?=\S)/g, '$1\u2018')
    .replace(/'/g, '\u2019')
    .replace(/ - /g, ' \u2013 ');
}

const html = (md) => ({ __html: renderInline(linkify(typeset(md || ''))) });

function Paragraph({ block, dropCap, className = 'bs-p' }) {
  return (
    <p className={dropCap ? `${className} bs-dropcap` : className}>
      {block.label && <span className="bs-runin">{block.label} </span>}
      <span dangerouslySetInnerHTML={html(block.md)} />
    </p>
  );
}

const PullQuote = ({ quote }) => <blockquote className="bs-pullquote">{quote.text}</blockquote>;

function ListBlock({ block }) {
  return (
    <ul className="bs-list">
      {block.items.map((item, i) => (
        <li key={i}>{item.label && <span className="bs-runin">{item.label} </span>}<span dangerouslySetInnerHTML={html(item.md)} /></li>
      ))}
    </ul>
  );
}

// Where the pull quote goes: after the paragraph in the middle of a section
// with three or more paragraphs, so it never opens or closes the section.
function quoteSlot(section, quote) {
  if (quote?.sectionId !== section.id || section.stats.paragraphs < 3) return -1;
  return Math.floor(section.stats.paragraphs / 2);
}

function Blocks({ section, quote, dropCap }) {
  const slot = quoteSlot(section, quote);
  let paragraphs = 0;
  return section.blocks.map((block, i) => {
    if (block.kind === 'list') return <ListBlock key={i} block={block} />;
    if (block.kind === 'quote') return <blockquote key={i} className="bs-quote" dangerouslySetInnerHTML={html(block.md)} />;
    paragraphs += 1;
    return [
      <Paragraph key={i} block={block} dropCap={dropCap && paragraphs === 1} />,
      paragraphs === slot && <PullQuote key={`q${i}`} quote={quote} />,
    ];
  });
}

// A pull quote whose section is too short to carry it goes after that section.
const quoteAfter = (section, quote) => quote?.sectionId === section.id && quoteSlot(section, quote) === -1;

function Takeaways({ section, inset }) {
  const items = section.blocks.flatMap((b) => (b.kind === 'list' ? b.items : [{ md: b.md, label: b.label }]));
  return (
    <aside className={inset ? 'bs-panel bs-panel-inset' : 'bs-panel'}>
      <div className="bs-panel-title">{section.heading || 'Key points'}</div>
      <ol className="bs-panel-items">
        {items.map((item, i) => (
          <li key={i}>
            {!inset && <span className="bs-numeral">{i + 1}</span>}
            <span>{item.label && <b>{item.label}. </b>}<span dangerouslySetInnerHTML={html(item.md)} /></span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function Callout({ section }) {
  const label = section.heading || section.blocks[0]?.label || 'Note';
  const blocks = section.heading ? section.blocks : section.blocks.map((b, i) => (i === 0 ? { ...b, label: undefined } : b));
  return (
    <aside className="bs-callout">
      <div className="bs-callout-label">{label}</div>
      <Blocks section={{ ...section, blocks }} />
    </aside>
  );
}

const KICKERS = { essay: 'Analysis', story: null };

// A story or essay: a kicker, its heading, its text, and any takeaways that belong to it.
function Article({ section, role, lead, number, quote, extras }) {
  const kicker = number ? `${number}` : KICKERS[role];
  return (
    <article className={lead ? 'bs-article bs-lead' : 'bs-article'}>
      {kicker && <div className="bs-kicker">{kicker}</div>}
      {section.heading && <h3 className="bs-h" dangerouslySetInnerHTML={html(section.heading)} />}
      <Blocks section={section} quote={quote} dropCap={lead || role === 'essay'} />
      {extras.map((x) => <Takeaways key={x.id} section={x} inset />)}
    </article>
  );
}

/** One section as its role says. */
function Section({ section, role, plan, extras, number }) {
  if (role === 'takeaways') return <Takeaways section={section} />;
  if (role === 'callout') return <Callout section={section} />;
  if (role === 'closing') return <div className="bs-closing"><Blocks section={section} /></div>;
  if (role === 'intro') return <div className="bs-intro"><Blocks section={section} /></div>;
  return <Article section={section} role={role} lead={section.id === plan.lead} number={number} quote={plan.quote} extras={extras} />;
}

// ── Page furniture ──────────────────────────────────────────────────────────

function Masthead({ meta }) {
  return (
    <header className="bs-masthead">
      <div className="bs-ears"><span>{meta.issueLabel}</span><span>{meta.edition}</span><span>{meta.sourceLine}</span></div>
      <h1 className="bs-title">The Atlas Pulse</h1>
      <div className="bs-dateline"><span>{meta.date}</span><span>{meta.model}</span></div>
    </header>
  );
}

const headlineSize = (text) => (text.length > 90 ? 'bs-headline-s' : text.length > 55 ? 'bs-headline-m' : 'bs-headline-l');

// A short opening sits under the headline as a standfirst; a long one reads
// better as the column's first paragraph (the lede).
const STANDFIRST_MAX_WORDS = 45;
const isLongOpening = (issue) => (issue.standfirst?.md.split(/\s+/).length ?? 0) > STANDFIRST_MAX_WORDS;

function Front({ issue }) {
  return (
    <div className="bs-front">
      {issue.headline && <h2 className={`bs-headline ${headlineSize(issue.headline)}`} dangerouslySetInnerHTML={html(issue.headline)} />}
      {issue.standfirst && !isLongOpening(issue) && <Paragraph block={{ ...issue.standfirst, label: undefined }} className="bs-standfirst" />}
    </div>
  );
}

function siteOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function Sources({ sources }) {
  if (!sources?.length) return null;
  return (
    <footer className="bs-sources">
      <div className="bs-panel-title">Sources</div>
      <ol>{sources.map((s, i) => <li key={i}>{s.title || s.url}<span className="bs-source-site"> — {s.source || siteOf(s.url)}</span></li>)}</ol>
    </footer>
  );
}

// ── Order ───────────────────────────────────────────────────────────────────

// The sections in reading order; a summary-first (briefing) plan lifts the
// takeaways and callouts to the top. Attached takeaways travel with their story.
function orderedSections(issue, plan) {
  const placed = issue.sections.filter((s) => !plan.attach?.[s.id]);
  if (plan.layout !== 'briefing') return placed;
  const first = placed.filter((s) => ['callout', 'takeaways'].includes(plan.roles[s.id]));
  return [...first, ...placed.filter((s) => !first.includes(s))];
}

// Digest plans number their stories ("1 of 6").
function storyNumbers(sections, plan) {
  if (plan.layout !== 'digest') return {};
  const stories = sections.filter((s) => ['story', 'essay'].includes(plan.roles[s.id]));
  return Object.fromEntries(stories.map((s, i) => [s.id, `${i + 1} of ${stories.length}`]));
}

/** An issue laid out by a plan, as a Broadsheet page. meta: masthead lines; sources: the item's sources. */
export default function Broadsheet({ issue, plan, meta, sources }) {
  const sections = orderedSections(issue, plan);
  const numbers = storyNumbers(sections, plan);
  return (
    <div className="bs">
      <Masthead meta={meta} />
      <Front issue={issue} />
      <main className="bs-column">
        {isLongOpening(issue) && <section className="bs-section bs-role-lede"><Paragraph block={{ ...issue.standfirst, label: undefined }} className="bs-p bs-lede" /></section>}
        {sections.map((s) => (
          <section key={s.id} className={`bs-section bs-role-${plan.roles[s.id]}`}>
            <Section section={s} role={plan.roles[s.id]} plan={plan} number={numbers[s.id]} extras={issue.sections.filter((x) => plan.attach?.[x.id] === s.id)} />
            {quoteAfter(s, plan.quote) && <PullQuote quote={plan.quote} />}
          </section>
        ))}
      </main>
      <Sources sources={sources} />
    </div>
  );
}
