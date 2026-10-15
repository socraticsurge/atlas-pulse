import { useState } from 'react';
import OllamaSetup from './OllamaSetup.jsx';
import { isNanoModel } from '../utils/chromeAI.js';

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

function NanoStatus({ available }) {
  if (!available) {
    return (
      <span className="settings-sublabel">
        Not available in this browser. Needs desktop Google Chrome 148+.
      </span>
    );
  }
  return (
    <div className="ollama-ready-status">
      <span className="ollama-ready-dot" />
      <span>Built into Chrome · runs on your device</span>
    </div>
  );
}

/**
 * Settings rows for the two AI engines: Gemini Nano (default) and Ollama
 * (optional — only checked once the user opens it).
 */
export function AIEngineSettings({ availableModels }) {
  const [showOllama, setShowOllama] = useState(false);
  const nanoAvailable = Boolean(availableModels?.some((m) => isNanoModel(m.name)));

  return (
    <>
      <div className="settings-row settings-row-col">
        <label>Gemini Nano</label>
        <NanoStatus available={nanoAvailable} />
      </div>

      <div className="settings-row settings-row-col">
        <label>
          Ollama
          <span className="settings-sublabel"> — optional, for larger local models</span>
        </label>
        {showOllama
          ? <OllamaSetup compact showReady />
          : (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowOllama(true)}>
              Set up Ollama
            </button>
          )}
      </div>
    </>
  );
}
