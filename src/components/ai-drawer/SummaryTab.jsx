import {
  HiOutlineArrowPath, HiOutlineBookmarkSquare, HiOutlineCheck, HiOutlineClipboardDocument,
  HiOutlineExclamationCircle, HiOutlineSparkles,
} from 'react-icons/hi2';
import { FaLinkedinIn } from 'react-icons/fa';
import { shareOnLinkedIn, shareOnX } from '../../utils/share.js';

function SaveButton({ saving, saved, onSave }) {
  let icon = <HiOutlineBookmarkSquare />;
  let label = 'Save';
  if (saving) {
    icon = <span className="spinner" style={{ width: 12, height: 12 }} />;
    label = 'Saving…';
  } else if (saved) {
    icon = <HiOutlineCheck style={{ color: 'var(--accent)' }} />;
    label = 'Saved';
  }
  return (
    <button
      className={`btn btn-sm ${saved ? 'btn-ghost' : 'btn-primary'} ai-save-btn`}
      onClick={onSave}
      disabled={saving || saved}
      title={saved ? 'Saved to library' : 'Save to Summaries library'}
    >
      {icon}
      {label}
    </button>
  );
}

function SummaryActions({ article, s }) {
  if (s.summarizing) {
    return <button className="btn btn-ghost btn-sm" onClick={s.stop}>Stop</button>;
  }
  const xText = s.summary ? s.summary.slice(0, 200) + '…' : article?.title || '';
  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={s.generate} title="Regenerate">
        <HiOutlineArrowPath /> Regenerate
      </button>
      <button className="btn btn-ghost btn-sm" onClick={s.copy} title="Copy summary">
        {s.copied ? <HiOutlineCheck style={{ color: 'var(--accent)' }} /> : <HiOutlineClipboardDocument />}
        {s.copied ? 'Copied!' : 'Copy'}
      </button>
      <button className="btn btn-ghost btn-sm ai-linkedin-btn" onClick={() => shareOnLinkedIn(article?.link)}>
        <FaLinkedinIn style={{ color: '#0a66c2' }} /> LinkedIn
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => shareOnX(article?.link, xText)}>
        Share on X
      </button>
      <div className="ai-summary-actions-divider" />
      <SaveButton saving={s.saving} saved={s.saved} onSave={s.save} />
    </>
  );
}

function EmptySummary({ queued, canGenerate, onGenerate }) {
  if (queued) {
    return (
      <div className="ai-batch-pending">
        <span className="spinner" style={{ width: 14, height: 14 }} />
        <span>Summary queued — will appear here shortly</span>
      </div>
    );
  }
  return (
    <div className="ai-summary-prompt">
      <p className="ai-summary-hint">Generate a concise summary, ready to share.</p>
      <button className="btn btn-primary ai-generate-btn" onClick={onGenerate} disabled={!canGenerate}>
        <HiOutlineSparkles /> Generate Summary
      </button>
    </div>
  );
}

function SummaryResult({ article, s }) {
  return (
    <div className="ai-summary-result">
      {s.isBatchSummary && (
        <div className="ai-batch-label">Batch summary · <span onClick={s.generate}>regenerate for custom persona</span></div>
      )}
      <div className="ai-summary-text">
        {s.summary || <span className="ai-typing-cursor" />}
        {s.summarizing && <span className="ai-typing-cursor" />}
      </div>
      <div className="ai-summary-actions">
        <SummaryActions article={article} s={s} />
      </div>
    </div>
  );
}

function SummaryError({ error, onRetry }) {
  return (
    <div className="ai-error">
      <HiOutlineExclamationCircle />
      <span>{error}</span>
      <button className="btn btn-ghost btn-sm" onClick={onRetry}>Retry</button>
    </div>
  );
}

/** Summary tab: generate, stream, copy, share, and save a summary. s = useArticleSummary(). */
export default function SummaryTab({ article, s, canGenerate }) {
  const hasResult = Boolean(s.summary || s.summarizing);
  const idle = !hasResult && !s.error;
  return (
    <div className="ai-drawer-body">
      {idle && <EmptySummary queued={article?.aiStatus === 'queued'} canGenerate={canGenerate} onGenerate={s.generate} />}
      {s.error && <SummaryError error={s.error} onRetry={s.generate} />}
      {hasResult && <SummaryResult article={article} s={s} />}
    </div>
  );
}
