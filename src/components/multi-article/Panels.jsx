import { useEffect, useRef, useState } from 'react';
import {
  HiOutlineArrowDownTray, HiOutlineArrowPath, HiOutlineCheck, HiOutlineClipboardDocument,
  HiOutlineEnvelope, HiOutlineExclamationCircle, HiOutlineSparkles, HiOutlineXMark,
} from 'react-icons/hi2';
import { downloadAsDocx, downloadAsMarkdown } from '../../utils/docx.js';
import { NEWSLETTER_TEMPLATES, OPERATIONS, placeholderText } from './operations.js';

export function PanelHeader({ operation, onOperationChange, onClose }) {
  return (
    <div className="map-header">
      <div className="map-header-left">
        <HiOutlineSparkles className="map-header-icon" />
        <span className="map-header-title">{OPERATIONS[operation].title}</span>
      </div>
      <div className="map-header-ops">
        {Object.entries(OPERATIONS).map(([key, def]) => (
          <button key={key} className={`btn btn-ghost btn-sm map-op-btn${operation === key ? ' active' : ''}`} onClick={() => onOperationChange(key)}>
            {def.label}
          </button>
        ))}
      </div>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} title="Close"><HiOutlineXMark /></button>
    </div>
  );
}

const chipTitle = (a) => `${a.feedTitle || 'Unknown'} — ${a.title?.slice(0, 40)}${a.title?.length > 40 ? '…' : ''}`;

export function ArticleChips({ articles, activeIds, onRemove, hint, ok }) {
  return (
    <div className="map-chips-section">
      <div className="map-chips-row">
        {articles.map((a) => {
          const active = activeIds.includes(a.id);
          return (
            <div key={a.id} className={`map-chip${active ? '' : ' map-chip-removed'}`}>
              <span className="map-chip-title">{chipTitle(a)}</span>
              {active && <button className="map-chip-remove" onClick={() => onRemove(a.id)} title="Remove"><HiOutlineXMark /></button>}
            </div>
          );
        })}
      </div>
      <div className={`map-count-hint${ok ? '' : ' map-count-warn'}`}>{hint}</div>
    </div>
  );
}

export function TemplatePicker({ value, onChange }) {
  return (
    <div className="map-templates">
      {NEWSLETTER_TEMPLATES.map((t) => (
        <button key={t.id} className={`btn btn-sm map-template-btn${value === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Instructions({ operation, value, onChange, gen, ok, onGenerate }) {
  const op = OPERATIONS[operation];
  const briefing = operation === 'briefing';
  return (
    <div className="map-instructions">
      <textarea
        className="map-instructions-input"
        placeholder={briefing ? 'Your prompt — e.g. "What are the conflicting claims?" or "Draft talking points for a meeting"' : 'Additional instructions (optional)'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={briefing ? 3 : 2}
      />
      <div className="map-generate-row">
        {gen.generating
          ? <button className="btn btn-secondary btn-sm" onClick={gen.stop}>Stop</button>
          : (
            <button className="btn btn-accent btn-sm" onClick={onGenerate} disabled={!ok} title={ok ? 'Generate' : `Need ${op.min}–${op.max} articles`}>
              <HiOutlineSparkles /> Generate
            </button>
          )}
      </div>
    </div>
  );
}

function OutputError({ error, onRetry }) {
  return (
    <div className="ai-error" style={{ margin: '16px 20px' }}>
      <HiOutlineExclamationCircle />
      <span>{error}</span>
      <button className="btn btn-ghost btn-sm" onClick={onRetry}><HiOutlineArrowPath /> Retry</button>
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
    <div className="map-output-text">
      <pre className="map-output-pre">{output}</pre>
      {generating && <span className="map-cursor" />}
      <div ref={endRef} />
    </div>
  );
}

export function Output({ operation, gen, onRetry }) {
  const empty = !gen.error && !gen.output && !gen.generating;
  return (
    <div className="map-output">
      {gen.error && <OutputError error={gen.error} onRetry={onRetry} />}
      {gen.notice && !gen.error && <div className="map-notice">{gen.notice}</div>}
      {empty && (
        <div className="map-placeholder">
          <HiOutlineSparkles />
          <p>{placeholderText(operation)}</p>
        </div>
      )}
      {gen.output && <OutputText output={gen.output} generating={gen.generating} />}
    </div>
  );
}

export function ExportBar({ operation, output }) {
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
    <div className="map-export-bar">
      <button className="btn btn-ghost btn-sm" onClick={copy} title="Copy to clipboard">
        {copied ? <HiOutlineCheck /> : <HiOutlineClipboardDocument />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => downloadAsMarkdown(filename, output)} title="Download as Markdown">
        <HiOutlineArrowDownTray /> Markdown
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => downloadAsDocx(filename, output)} title="Download as Word document">
        <HiOutlineArrowDownTray /> Word
      </button>
      <button className="btn btn-ghost btn-sm" onClick={email} title="Open in email client">
        <HiOutlineEnvelope /> Email
      </button>
    </div>
  );
}
