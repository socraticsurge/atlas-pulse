import { useMemo, useState } from 'react';
import {
  HiOutlineArrowDownTray, HiOutlineCheck, HiOutlineClipboardDocument, HiOutlineExclamationCircle,
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import { readStored, writeStored } from '../../utils/storage.js';
import { downloadAsDocx, downloadAsMarkdown } from '../../utils/docx.js';
import { DeleteButton } from '../library/ItemActions.jsx';
import { renderMarkdown } from './markdown.js';
import { styleLabel } from '../../ai/newsletter.js';
import { wordCount } from './studioModel.js';
import { useStudioDraft } from './useStudio.js';

const MODE_KEY = 'atlas-pulse-studio-mode';
const MODES = [['write', 'Write'], ['split', 'Split'], ['preview', 'Preview']];
const ACTION = 'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-2 text-xs text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground [&_svg]:size-3.5';
const SEGMENT = 'h-7 cursor-pointer rounded-md border-0 px-2.5 text-xs transition-colors';

function useEditorMode() {
  const [mode, setMode] = useState(() => readStored(MODE_KEY, 'split'));
  const change = (next) => { setMode(next); writeStored(MODE_KEY, next); };
  return [mode, change];
}

const STATUS_TEXT = { saved: 'Saved', unsaved: 'Edited', saving: 'Saving…', error: "Couldn't save" };

function SaveStatus({ status, onRetry }) {
  if (status === 'error') {
    return (
      <button type="button" onClick={onRetry} className={cn(ACTION, 'text-[var(--danger)] hover:text-[var(--danger)]')}>
        <HiOutlineExclamationCircle /> Couldn't save · Retry
      </button>
    );
  }
  return <span className="font-mono text-[11px] text-[var(--text-tertiary)]" aria-live="polite">{STATUS_TEXT[status]}</span>;
}

function ModeToggle({ mode, onChange }) {
  return (
    <div role="tablist" aria-label="Editor layout" className="flex rounded-md bg-[var(--bg-tertiary)] p-0.5">
      {MODES.map(([id, label]) => (
        <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => onChange(id)} className={cn(SEGMENT, mode === id ? 'bg-[var(--bg-active)] text-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground')}>
          {label}
        </button>
      ))}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return <button type="button" onClick={copy} className={ACTION}>{copied ? <HiOutlineCheck /> : <HiOutlineClipboardDocument />} {copied ? 'Copied' : 'Copy'}</button>;
}

// Title, save state, layout and the item's actions.
function EditorBar({ draft, status, onEdit, onRetry, mode, onModeChange, onDelete }) {
  const filename = draft.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase() || 'newsletter';
  return (
    <div className="shrink-0 border-b border-border px-6 pt-4 pb-3">
      <input
        value={draft.title}
        onChange={(e) => onEdit({ title: e.target.value })}
        aria-label="Title"
        placeholder="Title"
        maxLength={200}
        className="w-full border-0 bg-transparent p-0 text-[22px] font-semibold text-foreground shadow-none outline-none"
        style={{ fontFamily: 'var(--reader-font-family)' }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ModeToggle mode={mode} onChange={onModeChange} />
        <SaveStatus status={status} onRetry={onRetry} />
        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">· {wordCount(draft.bodyMd).toLocaleString()} words</span>
        <div className="ml-auto flex flex-wrap gap-0.5">
          <CopyButton text={draft.bodyMd} />
          <button type="button" onClick={() => downloadAsMarkdown(filename, draft.bodyMd)} className={ACTION}><HiOutlineArrowDownTray /> Markdown</button>
          <button type="button" onClick={() => downloadAsDocx(filename, draft.bodyMd)} className={ACTION}><HiOutlineArrowDownTray /> Word</button>
          <DeleteButton what="newsletter" onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

function Preview({ markdown }) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);
  return <div className="reader-article-content mx-auto max-w-[700px]" dangerouslySetInnerHTML={{ __html: html }} />;
}

// How the newsletter was made, and the articles it came from.
function Provenance({ item, onOpenSource }) {
  const how = [styleLabel(item.style), item.model?.split(':')[0], new Date(item.createdAt).toLocaleDateString()].filter(Boolean).join(' · ');
  return (
    <aside className="mx-auto mt-10 max-w-[700px] border-t border-border pt-4">
      <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">Made from {item.sources.length} articles · {how}</div>
      <ol className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
        {item.sources.map((s, i) => (
          <li key={`${i}-${s.url}`} className="flex items-baseline gap-2 text-[13px]">
            <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{i + 1}</span>
            <button type="button" onClick={() => onOpenSource(s.url)} disabled={!s.url} className="min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left text-foreground hover:text-primary disabled:cursor-default" title="Open in reader">
              {s.title || s.url || 'Untitled'}
            </button>
            {s.source && <span className="shrink-0 text-[12px] text-[var(--text-tertiary)]">{s.source}</span>}
          </li>
        ))}
      </ol>
    </aside>
  );
}

function Panes({ mode, draft, item, onEdit, onOpenSource }) {
  const writing = mode !== 'preview';
  const previewing = mode !== 'write';
  return (
    <div className="flex min-h-0 flex-1">
      {writing && (
        <textarea
          value={draft.bodyMd}
          onChange={(e) => onEdit({ bodyMd: e.target.value })}
          aria-label="Newsletter Markdown"
          spellCheck
          className={cn('min-h-0 flex-1 resize-none border-0 bg-background px-6 py-5 font-mono text-[13.5px] leading-relaxed text-foreground outline-none', previewing && 'border-r border-border')}
        />
      )}
      {previewing && (
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <Preview markdown={draft.bodyMd} />
          <Provenance item={item} onOpenSource={onOpenSource} />
        </div>
      )}
    </div>
  );
}

/** A saved newsletter: its title and Markdown, edited with a live preview and saved as you type. */
export default function StudioEditor({ item, onDelete, onOpenSource }) {
  const { draft, status, edit, retry } = useStudioDraft(item);
  const [mode, setMode] = useEditorMode();
  if (!draft) return null;
  return (
    <section aria-label="Editor" className="flex min-w-0 flex-1 flex-col">
      <EditorBar draft={draft} status={status} onEdit={edit} onRetry={retry} mode={mode} onModeChange={setMode} onDelete={onDelete} />
      <Panes mode={mode} draft={draft} item={item} onEdit={edit} onOpenSource={onOpenSource} />
    </section>
  );
}
