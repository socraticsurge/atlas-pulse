import { HiOutlineArrowPath, HiOutlineBeaker, HiOutlineExclamationCircle } from 'react-icons/hi2';

const ANALYSIS_DIMS = [
  { key: 'sentiment', label: 'Sentiment', values: { positive: '😊 Positive', neutral: '😐 Neutral', negative: '😟 Negative' } },
  { key: 'urgency',   label: 'Urgency',   values: { breaking: '🔴 Breaking', developing: '🟡 Developing', evergreen: '🟢 Evergreen' } },
  { key: 'frame',     label: 'Frame',     values: { conflict: '⚔️ Conflict', human_interest: '👤 Human Interest', economic: '📊 Economic', analytical: '🔬 Analytical' } },
  { key: 'tone',      label: 'Tone',      values: { alarming: '🚨 Alarming', analytical: '💡 Analytical', optimistic: '✨ Optimistic', opinion: '💭 Opinion' } },
  { key: 'depth',     label: 'Depth',     values: { brief: '⚡ Brief', standard: '📄 Standard', deep_dive: '📚 Deep Dive' } },
];

const Title = () => <span className="analysis-panel-title"><HiOutlineBeaker /> Content Analysis</span>;

function Loading() {
  return (
    <div className="analysis-panel">
      <div className="analysis-panel-header"><Title /></div>
      <div className="analysis-loading">
        <span className="spinner" style={{ width: 14, height: 14 }} />
        <span>Analyzing…</span>
      </div>
    </div>
  );
}

function Empty({ onRun, canRun }) {
  return (
    <div className="analysis-panel analysis-panel-empty">
      <div className="analysis-empty-body">
        <HiOutlineBeaker className="analysis-empty-icon" />
        <div>
          <p className="analysis-empty-label">Content Analysis</p>
          <p className="analysis-empty-hint">Classify sentiment, urgency, framing, and tone</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onRun} disabled={!canRun}>Analyze</button>
      </div>
    </div>
  );
}

function Failed({ error, onRun, canRun }) {
  return (
    <div className="analysis-panel">
      <div className="analysis-panel-header">
        <Title />
        <button className="btn btn-ghost btn-sm" onClick={onRun} disabled={!canRun}>
          <HiOutlineArrowPath /> Retry
        </button>
      </div>
      <div className="ai-error" style={{ margin: 0 }}>
        <HiOutlineExclamationCircle />
        <span>{error}</span>
      </div>
    </div>
  );
}

function DimensionRow({ label, dimKey, value, values }) {
  const display = value ? (values[value] || value) : null;
  return (
    <div className="analysis-row">
      <span className="analysis-dim-label">{label}</span>
      {display
        ? <span className={`analysis-value-badge analysis-badge-${dimKey}-${value}`}>{display}</span>
        : <span className="analysis-no-value">—</span>}
    </div>
  );
}

function Results({ analysis, onRun, canRun }) {
  return (
    <div className="analysis-panel">
      <div className="analysis-panel-header">
        <Title />
        <button className="btn btn-ghost btn-sm" onClick={onRun} disabled={!canRun} title="Re-analyze">
          <HiOutlineArrowPath />
        </button>
      </div>
      <div className="analysis-grid">
        {ANALYSIS_DIMS.map(({ key, label, values }) => (
          <DimensionRow key={key} label={label} dimKey={key} value={analysis[key]} values={values} />
        ))}
        {analysis.topics?.length > 0 && (
          <div className="analysis-row analysis-row-topics">
            <span className="analysis-dim-label">Topics</span>
            <div className="analysis-topics">
              {analysis.topics.map((t) => <span key={t} className="analysis-topic-tag">#{t}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Analysis tab: five-dimension classification + topics. */
export default function AnalysisPanel({ analysis, analyzing, error, onRun, canRun }) {
  if (analyzing) return <Loading />;
  if (error) return <Failed error={error} onRun={onRun} canRun={canRun} />;
  if (!analysis) return <Empty onRun={onRun} canRun={canRun} />;
  return <Results analysis={analysis} onRun={onRun} canRun={canRun} />;
}
