import { Checking, NoModels, NotInstalled, NotRunning, Ready } from './OllamaStates.jsx';
import { useOllamaStatus } from './useOllamaStatus.js';

/** Guided Ollama setup: detect, start, and pull a model; optionally show "ready". */
export default function OllamaSetup({ onReady, compact = false, showReady = false }) {
  const ollama = useOllamaStatus(onReady);
  const { status } = ollama;
  if (!status) return <Checking />;
  if (!status.installed) return <NotInstalled compact={compact} ollama={ollama} />;
  if (!status.running) return <NotRunning compact={compact} ollama={ollama} />;
  if (status.models.length === 0) return <NoModels compact={compact} ollama={ollama} />;
  return showReady ? <Ready count={status.models.length} onRefresh={ollama.check} /> : null;
}
