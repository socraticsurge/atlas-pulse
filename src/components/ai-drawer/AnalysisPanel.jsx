import { HiOutlineArrowPath, HiOutlineBeaker } from 'react-icons/hi2';
import { Button } from '@/components/ui/button';
import { RailAction, RailEmpty, RailError, RailLabel } from './parts.jsx';

const ANALYSIS_DIMS = [
  { key: 'sentiment', label: 'Sentiment', values: { positive: '😊 Positive', neutral: '😐 Neutral', negative: '😟 Negative' } },
  { key: 'urgency',   label: 'Urgency',   values: { breaking: '🔴 Breaking', developing: '🟡 Developing', evergreen: '🟢 Evergreen' } },
  { key: 'frame',     label: 'Frame',     values: { conflict: '⚔️ Conflict', human_interest: '👤 Human interest', economic: '📊 Economic', analytical: '🔬 Analytical' } },
  { key: 'tone',      label: 'Tone',      values: { alarming: '🚨 Alarming', analytical: '💡 Analytical', optimistic: '✨ Optimistic', opinion: '💭 Opinion' } },
  { key: 'depth',     label: 'Depth',     values: { brief: '⚡ Brief', standard: '📄 Standard', deep_dive: '📚 Deep dive' } },
];

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <RailLabel>{label}</RailLabel>
      <span className="text-right text-[13px] text-foreground">{children}</span>
    </div>
  );
}

function Results({ analysis, onRun, canRun }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <RailLabel>Content analysis</RailLabel>
        <RailAction onClick={onRun} disabled={!canRun}><HiOutlineArrowPath /> Re-analyze</RailAction>
      </div>
      <div>
        {ANALYSIS_DIMS.map(({ key, label, values }) => (
          <Row key={key} label={label}>{analysis[key] ? (values[analysis[key]] || analysis[key]) : '—'}</Row>
        ))}
      </div>
      {analysis.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.topics.map((t) => <span key={t} className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">#{t}</span>)}
        </div>
      )}
    </>
  );
}

// Which of analyzing, error, empty or results to show.
function panelState({ analyzing, error, analysis }) {
  if (analyzing) return 'analyzing';
  if (error) return 'error';
  return analysis ? 'results' : 'empty';
}

/** Analysis tab: five-dimension classification + topics. */
export default function AnalysisPanel({ analysis, analyzing, error, onRun, canRun }) {
  const state = panelState({ analyzing, error, analysis });
  return (
    <div className="flex flex-col gap-3 p-4">
      {state === 'analyzing' && <div className="flex items-center gap-2 py-8 text-[13px] text-muted-foreground"><span className="spinner" style={{ width: 14, height: 14 }} /> Analyzing…</div>}
      {state === 'error' && <RailError message={error}><RailAction onClick={onRun} disabled={!canRun}>Retry</RailAction></RailError>}
      {state === 'empty' && (
        <RailEmpty Icon={HiOutlineBeaker} text="Classify sentiment, urgency, framing, tone and depth, and pick out topics.">
          <Button variant="outline" onClick={onRun} disabled={!canRun}>Analyze</Button>
        </RailEmpty>
      )}
      {state === 'results' && <Results analysis={analysis} onRun={onRun} canRun={canRun} />}
    </div>
  );
}
