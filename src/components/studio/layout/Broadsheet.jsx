import { renderInline } from '../markdown.js';
import './broadsheet.css';

// The Broadsheet design system: a newspaper page drawn from an issue
// (parseIssue) and a plan (plan.js). Each role has one treatment; each layout
// arranges the treatments. Nothing here depends on what the content says.

function Inline({ md, as: Tag = 'span', className }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: renderInline(md) }} />;
}

function Paragraph({ block, dropCap }) {
  return (
    <p className={dropCap ? 'bs-p bs-dropcap' : 'bs-p'}>
      {block.label && <span className="bs-runin">{block.label} </span>}
      <span dangerouslySetInnerHTML={{ __html: renderInline(block.md) }} />
    </p>
  );
}

const PullQuote = ({ quote }) => <blockquote className="bs-pullquote">“{quote.text}”</blockquote>;

function ListBlock({ block }) {
  return (
    <ul className="bs-list">
      {block.items.map((item, i) => (
        <li key={i}>{item.label && <b>{item.label}. </b>}<span dangerouslySetInnerHTML={{ __html: renderInline(item.md) }} /></li>
      ))}
    </ul>
  );
}

// A section's blocks, with the pull quote after its second paragraph when it belongs here.
function Blocks({ section, quote, dropCap }) {
  const quoteHere = quote?.sectionId === section.id;
  let paragraphs = 0;
  return section.blocks.map((block, i) => {
    if (block.kind === 'list') return <ListBlock key={i} block={block} />;
    if (block.kind === 'quote') return <Inline key={i} as="blockquote" className="bs-quote" md={block.md} />;
    paragraphs += 1;
    const after = quoteHere && (paragraphs === 2 || (paragraphs === 1 && section.stats.paragraphs === 1));
    return [<Paragraph key={i} block={block} dropCap={dropCap && paragraphs === 1} />, after && <PullQuote key={`q${i}`} quote={quote} />];
  });
}

const Heading = ({ section, size = 'm' }) => (section.heading ? <h3 className={`bs-h bs-h-${size}`}>{section.heading}</h3> : null);

// Takeaways that belong to this story, drawn under it.
const Extras = ({ extras }) => (extras?.length ? extras.map((x) => <Takeaways key={x.id} section={x} variant="inline" />) : null);

function Story({ section, quote, size = 'm', columns = 1, extras }) {
  return (
    <article className="bs-story">
      <Heading section={section} size={size} />
      <div className={`bs-body bs-cols-${columns}`}><Blocks section={section} quote={quote} /></div>
      <Extras extras={extras} />
    </article>
  );
}

function Essay({ section, quote, columns = 2, size = 'l', extras }) {
  return (
    <article className="bs-essay">
      <Heading section={section} size={size} />
      <div className={`bs-body bs-cols-${columns}`}><Blocks section={section} quote={quote} dropCap /></div>
      <Extras extras={extras} />
    </article>
  );
}

function Takeaways({ section, variant = 'box' }) {
  const items = section.blocks.flatMap((b) => (b.kind === 'list' ? b.items : [{ md: b.md, label: b.label }]));
  return (
    <aside className={`bs-takeaways bs-takeaways-${variant}`}>
      <div className="bs-panel-title">{section.heading || 'Key points'}</div>
      <ol className="bs-panel-items">
        {items.map((item, i) => (
          <li key={i}>
            {variant === 'numbered' && <span className="bs-numeral">{i + 1}</span>}
            <span>{item.label && <b>{item.label}. </b>}<span dangerouslySetInnerHTML={{ __html: renderInline(item.md) }} /></span>
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
    <div className="bs-callout">
      <span className="bs-callout-label">{label}</span>
      <div className="bs-callout-body"><Blocks section={{ ...section, blocks }} /></div>
    </div>
  );
}

const Closing = ({ section }) => <div className="bs-closing"><Blocks section={section} /></div>;
const Intro = ({ section }) => <div className="bs-intro"><Blocks section={section} /></div>;

/** A section drawn as its role says; opts tune size and columns per layout. */
function Section({ section, role, quote, extras, opts = {} }) {
  if (role === 'takeaways') return <Takeaways section={section} variant={opts.panel} />;
  if (role === 'callout') return <Callout section={section} />;
  if (role === 'closing') return <Closing section={section} />;
  if (role === 'intro') return <Intro section={section} />;
  if (role === 'essay') return <Essay section={section} quote={quote} columns={opts.essayColumns ?? 2} size={opts.essaySize} extras={extras} />;
  return <Story section={section} quote={quote} size={opts.storySize} columns={opts.storyColumns} extras={extras} />;
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

function Front({ issue }) {
  return (
    <div className="bs-front">
      {issue.headline && <h2 className={`bs-headline ${headlineSize(issue.headline)}`}>{issue.headline}</h2>}
      {issue.standfirst && <Paragraph block={{ ...issue.standfirst, label: undefined }} />}
    </div>
  );
}

function Sources({ sources }) {
  if (!sources?.length) return null;
  return (
    <footer className="bs-sources">
      <div className="bs-panel-title">Sources</div>
      <ol>{sources.map((s, i) => <li key={i}>{s.title || s.url}{s.source && <i> — {s.source}</i>}</li>)}</ol>
    </footer>
  );
}

// ── Layouts ─────────────────────────────────────────────────────────────────

// Sections placed by the layout itself (attached takeaways go with their story).
const placed = (issue, plan) => issue.sections.filter((s) => !plan.attach?.[s.id]);
const extrasOf = (issue, plan, id) => issue.sections.filter((s) => plan.attach?.[s.id] === id);
const ofRole = (issue, plan, ...roles) => placed(issue, plan).filter((s) => roles.includes(plan.roles[s.id]));
const rest = (issue, plan, exclude) => placed(issue, plan).filter((s) => !exclude.includes(s));
const draw = (issue, plan, opts) => (s) => <Section key={s.id} section={s} role={plan.roles[s.id]} quote={plan.quote} extras={extrasOf(issue, plan, s.id)} opts={opts} />;

// R: every section in reading order, flowing through three columns.
function FlowLayout({ issue, plan }) {
  return (
    <div className="bs-flow">
      {issue.sections.map((s) => (
        <div key={s.id} className="bs-flow-item">
          <Heading section={s} />
          <Blocks section={s} quote={plan.quote} />
        </div>
      ))}
    </div>
  );
}

// A lead with a sidebar of takeaways and callouts, then the other stories.
function FrontLayout({ issue, plan }) {
  const lead = issue.sections.find((s) => s.id === plan.lead) ?? ofRole(issue, plan, 'story', 'essay')[0];
  const side = ofRole(issue, plan, 'takeaways', 'callout');
  const others = rest(issue, plan, [lead, ...side]);
  return (
    <>
      <div className="bs-grid-3">
        <div className="bs-span-2 bs-rule-right">{lead && <Essay section={lead} quote={plan.quote} size="l" extras={extrasOf(issue, plan, lead.id)} />}</div>
        <div className="bs-stack">{side.map(draw(issue, plan, { panel: 'box' }))}</div>
      </div>
      <div className="bs-grid-3 bs-below">{others.map((s) => <div key={s.id} className={plan.roles[s.id] === 'essay' ? 'bs-span-3' : ''}>{draw(issue, plan, { essayColumns: 3 })(s)}</div>)}</div>
    </>
  );
}

// Many short stories as a grid; the lead spans two columns.
function DigestLayout({ issue, plan }) {
  const top = ofRole(issue, plan, 'intro', 'callout');
  const stories = ofRole(issue, plan, 'story');
  const bands = ofRole(issue, plan, 'takeaways', 'essay', 'closing');
  return (
    <>
      {top.map(draw(issue, plan))}
      <div className="bs-grid-3 bs-cards">
        {stories.map((s) => (
          <div key={s.id} className={s.id === plan.lead ? 'bs-span-2 bs-card' : 'bs-card'}>
            <Story section={s} quote={plan.quote} size={s.id === plan.lead ? 'l' : 's'} columns={s.id === plan.lead ? 2 : 1} extras={extrasOf(issue, plan, s.id)} />
          </div>
        ))}
      </div>
      {bands.map(draw(issue, plan, { panel: 'band', essayColumns: 3 }))}
    </>
  );
}

// One long read: a single measure, panels set into it.
function LongformLayout({ issue, plan }) {
  return <div className="bs-longform">{placed(issue, plan).map(draw(issue, plan, { essayColumns: 1, storyColumns: 1, panel: 'box', essaySize: 'l' }))}</div>;
}

// Takeaways first, prominent; then the rest in two columns.
function BriefingLayout({ issue, plan }) {
  const first = [...ofRole(issue, plan, 'callout'), ...ofRole(issue, plan, 'takeaways')];
  const others = rest(issue, plan, first);
  return (
    <>
      {first.map(draw(issue, plan, { panel: 'numbered' }))}
      <div className="bs-grid-2 bs-below">{others.map((s) => <div key={s.id} className={plan.roles[s.id] === 'essay' ? 'bs-span-2' : ''}>{draw(issue, plan, { essayColumns: 2 })(s)}</div>)}</div>
    </>
  );
}

const LAYOUT_COMPONENTS = { flow: FlowLayout, front: FrontLayout, digest: DigestLayout, longform: LongformLayout, briefing: BriefingLayout };

/** An issue laid out by a plan, as a Broadsheet page. meta: masthead lines; sources: the item's sources. */
export default function Broadsheet({ issue, plan, meta, sources }) {
  const Layout = LAYOUT_COMPONENTS[plan.layout] ?? FlowLayout;
  return (
    <div className="bs">
      <Masthead meta={meta} />
      <Front issue={issue} />
      <Layout issue={issue} plan={plan} />
      <Sources sources={sources} />
    </div>
  );
}
