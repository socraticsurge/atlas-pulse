import { HiOutlineArrowPath } from 'react-icons/hi2';

const RECOMMENDED_MODELS = [
  { name: 'qwen2.5:3b',     label: 'Qwen 2.5 3B',    size: '1.9 GB', badge: '⚡ Fastest' },
  { name: 'llama3.2:3b',    label: 'Llama 3.2 3B',   size: '2.0 GB', badge: '⚡ Fast' },
  { name: 'llama3.1:8b',    label: 'Llama 3.1 8B',   size: '4.7 GB', badge: '⚖️ Balanced' },
  { name: 'deepseek-r1:7b', label: 'DeepSeek R1 7B', size: '4.7 GB', badge: '🎯 Quality' },
];

function SetupCard({ emoji, title, compact, extraClass = '', children }) {
  return (
    <div className={`ollama-setup-card ${extraClass} ${compact ? 'compact' : ''}`.replace(/\s+/g, ' ').trim()}>
      <div className="ollama-setup-emoji">{emoji}</div>
      <div className="ollama-setup-body">
        <h4>{title}</h4>
        {children}
      </div>
    </div>
  );
}

const ErrorLine = ({ error }) => (error ? <p className="ollama-setup-error">{error}</p> : null);

export function Checking() {
  return (
    <div className="ollama-setup-loading">
      <span className="spinner" style={{ width: 20, height: 20 }} />
      <span>Checking Ollama…</span>
    </div>
  );
}

export function NotInstalled({ compact, ollama }) {
  return (
    <SetupCard emoji="🦙" title="Ollama not found" compact={compact}>
      <p>Ollama is a free, local AI runtime. It runs models privately on your machine — no cloud, no data sent anywhere.</p>
      <div className="ollama-setup-actions">
        <button className="btn btn-primary btn-sm" onClick={() => window.open('https://ollama.com/download', '_blank', 'noopener')}>Download Ollama</button>
        <button className="btn btn-ghost btn-sm" onClick={ollama.check} title="Check again"><HiOutlineArrowPath /> Check again</button>
      </div>
    </SetupCard>
  );
}

export function NotRunning({ compact, ollama }) {
  return (
    <SetupCard emoji="😴" title="Ollama is not running" compact={compact}>
      <p>Ollama is installed but not active. Click below to start it.</p>
      <ErrorLine error={ollama.error} />
      <div className="ollama-setup-actions">
        <button className="btn btn-primary btn-sm" onClick={ollama.start} disabled={ollama.starting}>
          {ollama.starting ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Starting…</> : 'Start Ollama'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={ollama.check}><HiOutlineArrowPath /> Refresh</button>
      </div>
    </SetupCard>
  );
}

function PullProgress({ entry }) {
  return (
    <div className="ollama-pull-progress">
      <div className="ollama-pull-track"><div className="ollama-pull-fill" style={{ width: `${entry?.percent || 0}%` }} /></div>
      <span className="ollama-pull-label">{entry?.status} {entry?.percent > 0 ? `${entry.percent}%` : ''}</span>
    </div>
  );
}

function ModelRow({ model, ollama }) {
  return (
    <div className="ollama-model-row">
      <div className="ollama-model-info">
        <span className="ollama-model-name">{model.label}</span>
        <span className="ollama-model-meta">{model.size}</span>
        <span className="ollama-model-badge">{model.badge}</span>
      </div>
      {ollama.pulling === model.name
        ? <PullProgress entry={ollama.progress[model.name]} />
        : <button className="btn btn-primary btn-sm" onClick={() => ollama.pull(model.name)} disabled={Boolean(ollama.pulling)}>Pull</button>}
    </div>
  );
}

export function NoModels({ compact, ollama }) {
  return (
    <SetupCard emoji="📦" title="No models installed" compact={compact} extraClass="no-models">
      <p>Pull a model to enable AI features. Smaller models are faster; larger ones are more capable.</p>
      <ErrorLine error={ollama.error} />
      <div className="ollama-model-grid">
        {RECOMMENDED_MODELS.map((m) => <ModelRow key={m.name} model={m} ollama={ollama} />)}
      </div>
    </SetupCard>
  );
}

export function Ready({ count, onRefresh }) {
  return (
    <div className="ollama-ready-status">
      <span className="ollama-ready-dot" />
      <span>Running · {count} model{count !== 1 ? 's' : ''} available</span>
      <button className="btn btn-ghost btn-sm" onClick={onRefresh} title="Refresh"><HiOutlineArrowPath /></button>
    </div>
  );
}
