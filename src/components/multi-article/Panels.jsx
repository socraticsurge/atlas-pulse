import { useEffect, useRef, useState } from 'react';
import {
  HiOutlineArrowDownTray, HiOutlineArrowPath, HiOutlineCheck, HiOutlineClipboardDocument,
  HiOutlineEnvelope, HiOutlineExclamationCircle, HiOutlinePaintBrush, HiOutlineSparkles, HiOutlineXMark,
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { downloadAsDocx, downloadAsMarkdown } from '../../utils/docx.js';
import { emit } from '../../lib/appEvents.js';
import { RailAction, RailEmpty, RailError, TypingCursor } from '../ai-drawer/parts.jsx';
import { NEWSLETTER_TEMPLATES, OPERATIONS, placeholderText } from './operations.js';

const SEGMENT = 'h-7 cursor-pointer rounded-md border-0 px-2.5 text-xs transition-colors';
const segmentState = (on) => (on ? 'bg-[var(--bg-active)] text-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground');

export function PanelHeader({ operation, onOperationChange, onClose }) {
  return (
    <div className="flex h-[var(--pane-header-height)] shrink-0 items-center gap-2 border-b border-border pr-2 pl-4">
      <HiOutlineSparkles className="size-4 text-primary" />
      <span className="mr-auto text-[13.5px] font-semibold text-foreground">{OPERATIONS[operation].title}</span>
      <div role="tablist" className="flex rounded-md bg-[var(--bg-tertiary)] p-0.5">
        {Object.entries(OPERATIONS).map(([key, def]) => (
          <button key={key} type="button" role="tab" aria-selected={operation === key} onClick={() => onOperationChange(key)} className={cn(SEGMENT, segmentState(operation === key))}>
            {def.label}
          </button>
        ))}
      </div>
      <IconButton onClick={onClose} title="Close"><HiOutlineXMark /></IconButton>
    </div>
  );
}

const chipTitle = (a) => `${a.feedTitle || 'Unknown'} — ${a.title?.slice(0, 40)}${a.title?.length > 40 ? '…' : ''}`;

export function ArticleChips({ articles, activeIds, onRemove, hint, ok }) {
  return (
    <div className="shrink-0 border-b border-border px-4 py-3">
      <div className="flex flex-wrap gap-1.5">
        {articles.map((a) => {
          const active = activeIds.includes(a.id);
          return (
            <span key={a.id} className={cn('inline-flex max-w-full items-center gap-1 rounded-full border border-border py-0.5 pr-1 pl-2.5 text-[11.5px]', active ? 'text-foreground' : 'text-[var(--text-tertiary)] line-through opacity-60')}>
              <span className="truncate">{chipTitle(a)}</span>
              {active && (
                <button type="button" onClick={() => onRemove(a.id)} title="Remove" aria-label="Remove article" className="flex size-4 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground">
                  <HiOutlineXMark className="size-3" />
                </button>
              )}
            </span>
          );
        })}
      </div>
      <div className={cn('mt-2 font-mono text-[11px]', ok ? 'text-[var(--text-tertiary)]' : 'text-[var(--danger)]')}>{hint}</div>
    </div>
  );
}

export function TemplatePicker({ value, onChange }) {
  return (
    <div className="flex shrink-0 gap-1 border-b border-border px-4 py-2">
      {NEWSLETTER_TEMPLATES.map((t) => (
        <button key={t.id} type="button" aria-pressed={value === t.id} onClick={() => onChange(t.id)} className={cn(SEGMENT, segmentState(value === t.id))}>{t.label}</button>
      ))}
    </div>
  );
}

export function Instructions({ operation, value, onChange, gen, ok, onGenerate }) {
  const op = OPERATIONS[operation];
  const briefing = operation === 'briefing';
  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-3">
      <textarea
        aria-label={briefing ? 'Your question' : 'Additional instructions'}
        placeholder={briefing ? 'Your question, e.g. "What are the conflicting claims?" or "Draft talking points for a meeting"' : 'Additional instructions (optional)'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={briefing ? 3 : 2}
        className="w-full resize-y rounded-md border border-border bg-[var(--bg-primary)] p-2.5 font-sans text-[13px] leading-relaxed text-foreground outline-none focus:border-primary"
      />
      <div className="flex justify-end">
        {gen.generating
          ? <Button variant="outline" size="sm" onClick={gen.stop}>Stop</Button>
          : <Button size="sm" onClick={onGenerate} disabled={!ok} title={ok ? 'Generate' : `Needs ${op.min}–${op.max} articles`}><HiOutlineSparkles /> Generate</Button>}
      </div>
    </div>
  );
}

// Streamed text with a cursor while generating; keeps the end in view.
function OutputText({ output, generating }) {
  const endRef = useRef(null);
  useEffect(() => {
    if (generating) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output, generating]);
  return (
    <div className="px-5 py-4">
      <pre className="m-0 font-sans text-[14px] leading-relaxed whitespace-pre-wrap text-foreground">{output}{generating && <TypingCursor />}</pre>
      <div ref={endRef} />
    </div>
  );
}

export function Output({ operation, gen, onRetry }) {
  const empty = !gen.error && !gen.output && !gen.generating;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {gen.error && <div className="p-4"><RailError message={gen.error}><RailAction onClick={onRetry}><HiOutlineArrowPath /> Retry</RailAction></RailError></div>}
      {gen.notice && !gen.error && <div className="mx-4 mt-3 rounded-md bg-[var(--bg-tertiary)] px-3 py-2 text-xs text-muted-foreground">{gen.notice}</div>}
      {empty && <RailEmpty Icon={HiOutlineSparkles} text={placeholderText(operation)} />}
      {gen.output && <OutputText output={gen.output} generating={gen.generating} />}
    </div>
  );
}

// Save to Studio, then a link to the saved item.
function StudioAction({ studio }) {
  if (studio.status === 'saved') return <RailAction onClick={() => emit('open-studio', studio.id)}><HiOutlinePaintBrush /> Open in Studio</RailAction>;
  if (studio.status === 'error') return <RailAction onClick={studio.save} title={studio.error}><HiOutlineExclamationCircle /> Couldn't save · Retry</RailAction>;
  const saving = studio.status === 'saving';
  return <RailAction onClick={studio.save} disabled={saving}><HiOutlinePaintBrush /> {saving ? 'Saving…' : 'Save to Studio'}</RailAction>;
}

export function ExportBar({ operation, output, studio }) {
  const [copied, setCopied] = useState(false);
  const filename = `atlas-pulse-${operation}`;
  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const email = () => {
    const subject = encodeURIComponent(`Atlas Pulse ${OPERATIONS[operation].label}`);
    window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(output.slice(0, 2000))}`, '_self');
  };
  return (
    <div className="flex shrink-0 flex-wrap gap-0.5 border-t border-border px-3 py-2">
      {studio && <StudioAction studio={studio} />}
      <RailAction onClick={copy}>{copied ? <HiOutlineCheck /> : <HiOutlineClipboardDocument />} {copied ? 'Copied' : 'Copy'}</RailAction>
      <RailAction onClick={() => downloadAsMarkdown(filename, output)}><HiOutlineArrowDownTray /> Markdown</RailAction>
      <RailAction onClick={() => downloadAsDocx(filename, output)}><HiOutlineArrowDownTray /> Word</RailAction>
      <RailAction onClick={email}><HiOutlineEnvelope /> Email</RailAction>
    </div>
  );
}
