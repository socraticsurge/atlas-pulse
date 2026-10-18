import { useState } from 'react';
import OllamaSetup from './OllamaSetup.jsx';

/**
 * Shown in the AI drawer when no engine is available: explains how to get
 * Gemini Nano, and offers the optional Ollama setup on request.
 */
export function NoAIEngine({ onReady }) {
  const [showOllama, setShowOllama] = useState(false);
  if (showOllama) return <OllamaSetup compact onReady={onReady} />;

  return (
    <div className="ollama-setup-card compact">
      <div className="ollama-setup-emoji">✨</div>
      <div className="ollama-setup-body">
        <h4>No AI model available</h4>
        <p>
          AI features use Gemini Nano, built into desktop Google Chrome (148+) and run
          on your device. Open Atlas Pulse in Google Chrome, or use Ollama instead.
        </p>
        <div className="ollama-setup-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowOllama(true)}>
            Use Ollama instead
          </button>
        </div>
      </div>
    </div>
  );
}
