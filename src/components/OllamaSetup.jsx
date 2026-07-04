import { useState, useEffect, useCallback } from 'react';
import { HiOutlineArrowPath } from 'react-icons/hi2';
import { fetchOllamaStatus, startOllama, streamModelPull } from '../utils/api.js';

const RECOMMENDED_MODELS = [
  { name: 'qwen2.5:3b',    label: 'Qwen 2.5 3B',     size: '1.9 GB', badge: '⚡ Fastest' },
  { name: 'llama3.2:3b',   label: 'Llama 3.2 3B',    size: '2.0 GB', badge: '⚡ Fast'    },
  { name: 'llama3.1:8b',   label: 'Llama 3.1 8B',    size: '4.7 GB', badge: '⚖️ Balanced' },
  { name: 'deepseek-r1:7b',label: 'DeepSeek R1 7B',  size: '4.7 GB', badge: '🎯 Quality'  },
];

export default function OllamaSetup({ onReady, compact = false, showReady = false }) {
  const [status, setStatus] = useState(null); // null = loading
  const [starting, setStarting] = useState(false);
  const [pulling, setPulling] = useState(null);
  const [pullProgress, setPullProgress] = useState({});
  const [error, setError] = useState(null);

  const checkStatus = useCallback(() => (
    fetchOllamaStatus()
      .then(result => {
        setStatus(result);
        if (result.running && result.models.length > 0 && onReady) {
          onReady(result.models);
        }
      })
      .catch(err => setError(err.message))
  ), [onReady]);

  // Poll every 5s so the UI auto-advances once Ollama starts
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      await startOllama();
      // Give it a moment to boot, then re-check
      setTimeout(checkStatus, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handlePull = async (modelName) => {
    setPulling(modelName);
    setPullProgress(p => ({ ...p, [modelName]: { status: 'Starting…', percent: 0 } }));
    setError(null);
    try {
      await streamModelPull(modelName, (chunk) => {
        const percent = chunk.total > 0
          ? Math.round((chunk.completed / chunk.total) * 100)
          : 0;
        setPullProgress(p => ({
          ...p,
          [modelName]: { status: chunk.status || 'pulling', percent },
        }));
      });
      await checkStatus();
    } catch (err) {
      setError(`Pull failed: ${err.message}`);
    } finally {
      setPulling(null);
    }
  };

  if (!status) {
    return (
      <div className="ollama-setup-loading">
        <span className="spinner" style={{ width: 20, height: 20 }} />
        <span>Checking Ollama…</span>
      </div>
    );
  }

  // ── Not installed ───────────────────────────────────────────────────────────
  if (!status.installed) {
    return (
      <div className={`ollama-setup-card ${compact ? 'compact' : ''}`}>
        <div className="ollama-setup-emoji">🦙</div>
        <div className="ollama-setup-body">
          <h4>Ollama not found</h4>
          <p>
            Ollama is a free, local AI runtime. It runs models privately on your machine — no cloud,
            no data sent anywhere.
          </p>
          <div className="ollama-setup-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => window.open('https://ollama.com/download', '_blank', 'noopener')}
            >
              Download Ollama
            </button>
            <button className="btn btn-ghost btn-sm" onClick={checkStatus} title="Check again">
              <HiOutlineArrowPath /> Check again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Installed but not running ───────────────────────────────────────────────
  if (!status.running) {
    return (
      <div className={`ollama-setup-card ${compact ? 'compact' : ''}`}>
        <div className="ollama-setup-emoji">😴</div>
        <div className="ollama-setup-body">
          <h4>Ollama is not running</h4>
          <p>Ollama is installed but not active. Click below to start it.</p>
          {error && <p className="ollama-setup-error">{error}</p>}
          <div className="ollama-setup-actions">
            <button className="btn btn-primary btn-sm" onClick={handleStart} disabled={starting}>
              {starting
                ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Starting…</>
                : 'Start Ollama'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={checkStatus}>
              <HiOutlineArrowPath /> Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Running but no models ───────────────────────────────────────────────────
  if (status.models.length === 0) {
    return (
      <div className={`ollama-setup-card no-models ${compact ? 'compact' : ''}`}>
        <div className="ollama-setup-emoji">📦</div>
        <div className="ollama-setup-body">
          <h4>No models installed</h4>
          <p>Pull a model to enable AI features. Smaller models are faster; larger ones are more capable.</p>
          {error && <p className="ollama-setup-error">{error}</p>}
          <div className="ollama-model-grid">
            {RECOMMENDED_MODELS.map((m) => {
              const prog = pullProgress[m.name];
              const isPulling = pulling === m.name;
              return (
                <div key={m.name} className="ollama-model-row">
                  <div className="ollama-model-info">
                    <span className="ollama-model-name">{m.label}</span>
                    <span className="ollama-model-meta">{m.size}</span>
                    <span className="ollama-model-badge">{m.badge}</span>
                  </div>
                  {isPulling ? (
                    <div className="ollama-pull-progress">
                      <div className="ollama-pull-track">
                        <div
                          className="ollama-pull-fill"
                          style={{ width: `${prog?.percent || 0}%` }}
                        />
                      </div>
                      <span className="ollama-pull-label">
                        {prog?.status} {prog?.percent > 0 ? `${prog.percent}%` : ''}
                      </span>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handlePull(m.name)}
                      disabled={!!pulling}
                    >
                      Pull
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Running with models
  if (showReady) {
    return (
      <div className="ollama-ready-status">
        <span className="ollama-ready-dot" />
        <span>Running · {status.models.length} model{status.models.length !== 1 ? 's' : ''} available</span>
        <button className="btn btn-ghost btn-sm" onClick={checkStatus} title="Refresh">
          <HiOutlineArrowPath />
        </button>
      </div>
    );
  }

  return null;
}
