import { HiOutlineCheck, HiOutlineSparkles } from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import { stripHtml } from '../../utils/helpers.js';
import { shortTime } from '../article-list/listLogic.js';

// The preview line: the AI summary when there is one, else the feed's excerpt.
const previewOf = (article) => article.aiSummary || stripHtml(article.excerpt || '', 220);

// Left gutter: a check when selected, a select circle on hover, else the unread dot.
function Gutter({ selected, unread, onToggle }) {
  return (
    <button
      type="button"
      className="group/sel absolute left-1 top-2.5 flex size-5 items-center justify-center rounded border-0 bg-transparent p-0"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={selected ? 'Deselect' : 'Select'}
      aria-label={selected ? 'Deselect article' : 'Select article'}
      aria-pressed={selected}
    >
      {selected
        ? <HiOutlineCheck className="size-3.5 text-primary" />
        : (
          <>
            <span className="hidden size-3 rounded-full border border-[var(--text-tertiary)] group-hover/row:block" />
            {unread && <span className="size-1.5 rounded-full bg-primary group-hover/row:hidden" />}
          </>
        )}
    </button>
  );
}

/**
 * One article in the Rows view (the default "Instrument" list): the title
 * and time, then the source and a one-line preview. Unread titles are bright;
 * the open article has an accent bar.
 */
const rowClass = ({ read, active, selected }) => cn(
  'article-card-row group/row relative cursor-pointer py-2 pl-7 pr-4 hover:bg-[var(--bg-hover)]',
  read && 'read',
  active && 'active bg-[var(--bg-active)] shadow-[inset_2px_0_0_var(--accent)] hover:bg-[var(--bg-active)]',
  selected && 'card-selected bg-[var(--accent-muted)]',
);

// Second line: source, the preview (the AI summary when there is one), and the AI mark.
function MetaLine({ article, feed, unread }) {
  const preview = previewOf(article);
  return (
    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-[var(--text-tertiary)]">
      <span className={cn('shrink-0', unread && 'text-[var(--text-secondary)]')}>{feed?.title || 'Unknown'}</span>
      {preview && <span className="truncate">· {preview}</span>}
      <span className="ml-auto shrink-0 pl-2"><AIMark article={article} /></span>
    </div>
  );
}

// Marker of AI work on the article: summarized, or being processed.
function AIMark({ article }) {
  if (article.aiSummary) {
    return (
      <span className="flex items-center gap-1 font-mono text-[10.5px] tracking-wide text-primary" title="AI summary ready: it's the preview line">
        <HiOutlineSparkles className="size-3" /> AI
      </span>
    );
  }
  if (article.aiStatus === 'processing') return <span className="animate-pulse font-mono text-[10.5px] text-[var(--text-tertiary)]" title="AI summary in progress">AI…</span>;
  return null;
}

export default function ArticleRow({ article, feed, active, selected, onOpen, onToggle }) {
  const unread = !article.isRead;
  return (
    <div className={rowClass({ read: article.isRead, active, selected })} onClick={onOpen}>
      <Gutter selected={selected} unread={unread} onToggle={onToggle} />
      <div className="flex items-baseline gap-3">
        <span className={cn('line-clamp-2 min-w-0 flex-1 text-[14px] leading-snug', unread ? 'font-medium text-foreground' : 'text-[var(--text-tertiary)]')}>
          {article.title}
        </span>
        <span className="shrink-0 font-mono text-[11.5px] text-[var(--text-tertiary)]">{shortTime(article.publishedAt)}</span>
      </div>
      <MetaLine article={article} feed={feed} unread={unread} />
    </div>
  );
}
