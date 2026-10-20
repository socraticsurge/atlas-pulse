import { renderInline } from '../markdown.js';
import { present, siteOf } from './format.js';
import './newsletter.css';

// A newsletter as a page: the same semantic structure for every design
// system (nl-* classes), in the writer's order. A design supplies its
// masthead, a stylesheet scoped to its class and a few options. The rules
// it must keep are in principles.md and are tested by pageChecks.js.

const html = (md) => ({ __html: renderInline(present(md)) });

function Paragraph({ block, className = 'nl-p', dropCap }) {
  return (
    <p className={dropCap ? `${className} nl-dropcap` : className}>
      {block.label && <span className="nl-runin">{block.label} </span>}
      <span dangerouslySetInnerHTML={html(block.md)} />
    </p>
  );
}

function ListBlock({ block }) {
  return (
    <ul className="nl-list">
      {block.items.map((item, i) => (
        <li key={i}>{item.label && <span className="nl-runin">{item.label} </span>}<span dangerouslySetInnerHTML={html(item.md)} /></li>
      ))}
    </ul>
  );
}

// A quote the writer gave stays where they put it: short ones are set as
// pull quotes, longer ones as a quoted passage.
const PULL_QUOTE_MAX_CHARS = 160;
const quoteClass = (md) => (md.length <= PULL_QUOTE_MAX_CHARS ? 'nl-pullquote' : 'nl-quote');

function Blocks({ section, dropCap }) {
  let paragraphs = 0;
  return section.blocks.map((block, i) => {
    if (block.kind === 'list') return <ListBlock key={i} block={block} />;
    if (block.kind === 'quote') return <blockquote key={i} className={quoteClass(block.md)} dangerouslySetInnerHTML={html(block.md)} />;
    paragraphs += 1;
    return <Paragraph key={i} block={block} dropCap={dropCap && paragraphs === 1} />;
  });
}

function Takeaways({ section, numbered }) {
  const items = section.blocks.flatMap((b) => (b.kind === 'list' ? b.items : [{ md: b.md, label: b.label }]));
  return (
    <aside className="nl-panel">
      <div className="nl-panel-title">{section.heading || 'Key points'}</div>
      <ol className="nl-panel-items">
        {items.map((item, i) => (
          <li key={i}>
            {numbered && <span className="nl-numeral">{i + 1}</span>}
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
    <aside className="nl-callout">
      <div className="nl-callout-label">{label}</div>
      <Blocks section={{ ...section, blocks }} />
    </aside>
  );
}

function Article({ section, role, options }) {
  const kicker = role === 'essay' ? options.essayKicker : null;
  return (
    <article className="nl-article">
      {kicker && <div className="nl-kicker">{kicker}</div>}
      {section.heading && <h3 className="nl-h" dangerouslySetInnerHTML={html(section.heading)} />}
      <Blocks section={section} dropCap={role === 'essay' && options.dropCap} />
    </article>
  );
}

function Section({ section, role, options }) {
  if (role === 'takeaways') return <Takeaways section={section} numbered={options.numberedTakeaways} />;
  if (role === 'callout') return <Callout section={section} />;
  if (role === 'intro' || role === 'closing') return <div className={`nl-${role}`}><Blocks section={section} /></div>;
  return <Article section={section} role={role} options={options} />;
}

// A short opening sits under the headline; a long one opens the column.
const STANDFIRST_MAX_WORDS = 45;
const isLongOpening = (issue) => (issue.standfirst?.md.split(/\s+/).length ?? 0) > STANDFIRST_MAX_WORDS;
const headlineSize = (text) => (text.length > 90 ? 'nl-headline-s' : text.length > 55 ? 'nl-headline-m' : 'nl-headline-l');

function Front({ issue }) {
  const opening = issue.standfirst && { ...issue.standfirst, label: undefined };
  return (
    <div className="nl-front">
      {issue.headline && <h2 className={`nl-headline ${headlineSize(issue.headline)}`} dangerouslySetInnerHTML={html(issue.headline)} />}
      {opening && !isLongOpening(issue) && <Paragraph block={opening} className="nl-standfirst" />}
    </div>
  );
}

function Sources({ sources }) {
  if (!sources?.length) return null;
  return (
    <footer className="nl-sources">
      <div className="nl-panel-title">Sources</div>
      <ol>{sources.map((s, i) => <li key={i}>{s.title || s.url}<span className="nl-source-site"> — {s.source || siteOf(s.url ?? '')}</span></li>)}</ol>
    </footer>
  );
}

/**
 * A newsletter page. design: { className, Masthead, options }; issue: from
 * parseIssue; presentation: from rules.js; meta: masthead lines (pageMeta);
 * sources: the Studio item's sources. An <article>, not a <main>: in Studio
 * the page sits inside the app's main landmark.
 */
export default function NewsletterPage({ design, issue, presentation, meta, sources }) {
  const { Masthead, options } = design;
  const opening = issue.standfirst && { ...issue.standfirst, label: undefined };
  return (
    <article className={`nl ${design.className}`}>
      <Masthead meta={meta} />
      <Front issue={issue} />
      <div className="nl-column">
        {opening && isLongOpening(issue) && <section className="nl-section nl-role-lede"><Paragraph block={opening} className="nl-p nl-lede" /></section>}
        {issue.sections.map((s) => (
          <section key={s.id} className={`nl-section nl-role-${presentation.roles[s.id]}`}>
            <Section section={s} role={presentation.roles[s.id]} options={options} />
          </section>
        ))}
      </div>
      <Sources sources={sources} />
    </article>
  );
}
