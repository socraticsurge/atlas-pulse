import { useCallback, useState } from 'react';
import {
  HiOutlineArrowDownTray, HiOutlineBookmark, HiOutlineCheckCircle, HiOutlineChevronUp, HiOutlineSparkles, HiOutlineXMark,
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { useClickOutside } from '../../hooks/useClickOutside.js';

const AI_OPERATIONS = {
  compare:    { min: 2, max: 5,  label: 'Compare',    hint: '2–5' },
  newsletter: { min: 3, max: 15, label: 'Newsletter', hint: '3–15' },
  briefing:   { min: 2, max: 15, label: 'Briefing',   hint: '2–15' },
};

function OperationOption({ op, count, onPick }) {
  const disabled = count < op.min || count > op.max;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      title={disabled ? `Needs ${op.hint} articles` : undefined}
      className="flex w-full cursor-pointer items-center justify-between gap-6 rounded border-0 bg-transparent px-2 py-1.5 text-left text-[12.5px] text-foreground hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {op.label}
      <span className="font-mono text-[10.5px] text-[var(--text-tertiary)]">{op.hint}</span>
    </button>
  );
}

function AIActionsMenu({ count, onOpenAIPanel }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(open, close);
  return (
    <div className="relative" ref={ref}>
      <Button size="sm" onClick={() => setOpen((m) => !m)} disabled={count < 2} title={count < 2 ? 'Select at least 2 articles' : 'AI actions'}>
        <HiOutlineSparkles /> AI
        <HiOutlineChevronUp className={cn('transition-transform', !open && 'rotate-180')} />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 bottom-full z-30 mb-2 min-w-44 rounded-md border border-border bg-[var(--bg-modal)] p-1 shadow-lg">
          {Object.entries(AI_OPERATIONS).map(([key, op]) => (
            <OperationOption key={key} op={op} count={count} onPick={() => { setOpen(false); onOpenAIPanel(key); }} />
          ))}
        </div>
      )}
    </div>
  );
}

const ACTION = 'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-2 text-xs text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground [&_svg]:size-3.5';

/** Floating bar for the multi-selection: read, save, CSV, AI actions. */
export function SelectionBar({ count, visibleCount, actions }) {
  if (count === 0) return null;
  return (
    <div role="toolbar" aria-label="Selected articles" className="absolute right-3 bottom-11 left-3 z-20 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-[var(--bg-modal)] px-2 py-1.5 shadow-xl">
      <IconButton onClick={actions.clear} title="Clear selection (Esc)"><HiOutlineXMark /></IconButton>
      <span className="font-mono text-xs text-foreground">{count} selected</span>
      <button type="button" className={ACTION} onClick={actions.selectAll}>All {visibleCount.toLocaleString()}</button>
      <span className="mx-1 h-4 w-px bg-border" />
      <button type="button" className={ACTION} onClick={actions.markRead}><HiOutlineCheckCircle /> Read</button>
      <button type="button" className={ACTION} onClick={actions.bookmark}><HiOutlineBookmark /> Save</button>
      <button type="button" className={ACTION} onClick={actions.exportCSV}><HiOutlineArrowDownTray /> CSV</button>
      <span className="ml-auto"><AIActionsMenu count={count} onOpenAIPanel={actions.openAIPanel} /></span>
    </div>
  );
}
