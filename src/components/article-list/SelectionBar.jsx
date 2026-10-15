import { useEffect, useRef, useState } from 'react';
import { HiOutlineArrowDownTray, HiOutlineBookmark, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineSparkles, HiOutlineXMark } from 'react-icons/hi2';

const AI_OPERATIONS = {
  compare:    { min: 2, max: 5,  label: 'Compare',    hint: '2–5' },
  newsletter: { min: 3, max: 15, label: 'Newsletter', hint: '3–15' },
  briefing:   { min: 2, max: 15, label: 'Briefing',   hint: '2–15' },
};

function AIActionsMenu({ count, onOpenAIPanel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="fab-ai-wrap" ref={ref}>
      <button
        className="btn btn-accent btn-sm fab-ai-btn"
        onClick={() => setOpen((m) => !m)}
        disabled={count < 2}
        title={count < 2 ? 'Select at least 2 articles' : 'AI Actions'}
      >
        <HiOutlineSparkles /> AI Actions
        <HiOutlineChevronDown className={`fab-chevron${open ? ' open' : ''}`} />
      </button>
      {open && (
        <div className="fab-ai-menu">
          {Object.entries(AI_OPERATIONS).map(([key, op]) => {
            const disabled = count < op.min || count > op.max;
            return (
              <button
                key={key}
                className={`fab-ai-option${disabled ? ' disabled' : ''}`}
                onClick={() => { if (!disabled) { setOpen(false); onOpenAIPanel(key); } }}
                title={disabled ? `${op.hint} articles required` : ''}
              >
                <span className="fab-ai-op-label">{op.label}</span>
                <span className="fab-ai-op-hint">{op.hint}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Floating bar for the multi-selection: read, save, CSV, AI actions. */
export function SelectionBar({ count, visibleCount, actions }) {
  if (count === 0) return null;
  return (
    <div className="floating-action-bar">
      <div className="fab-left">
        <button className="btn btn-ghost btn-icon btn-sm fab-clear" onClick={actions.clear} title="Clear selection">
          <HiOutlineXMark />
        </button>
        <span className="fab-count">{count} selected</span>
        <button className="btn btn-ghost btn-sm fab-select-all" onClick={actions.selectAll} title="Select all visible">
          Select all {visibleCount}
        </button>
      </div>
      <div className="fab-actions">
        <button className="btn btn-ghost btn-sm fab-action-btn" onClick={actions.markRead} title="Mark selected as read">
          <HiOutlineCheckCircle /> Read
        </button>
        <button className="btn btn-ghost btn-sm fab-action-btn" onClick={actions.bookmark} title="Bookmark selected">
          <HiOutlineBookmark /> Save
        </button>
        <button className="btn btn-ghost btn-sm fab-action-btn" onClick={actions.exportCSV} title="Export selected as CSV">
          <HiOutlineArrowDownTray /> CSV
        </button>
      </div>
      <AIActionsMenu count={count} onOpenAIPanel={actions.openAIPanel} />
    </div>
  );
}
