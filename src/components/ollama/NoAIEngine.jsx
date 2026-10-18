import { useState } from 'react';
import { Button } from '@/components/ui/button';
import OllamaSetup from './OllamaSetup.jsx';
import { SetupActions, SetupCard } from './OllamaStates.jsx';

/**
 * Shown in the AI rail when no engine is available: explains how to get
 * Gemini Nano, and offers the optional Ollama setup on request.
 */
export function NoAIEngine({ onReady }) {
  const [showOllama, setShowOllama] = useState(false);
  if (showOllama) return <OllamaSetup compact onReady={onReady} />;
  return (
    <SetupCard emoji="✨" title="No AI model available" compact>
      <p>AI features use Gemini Nano, built into desktop Google Chrome (148+) and run on your device. Open Atlas Pulse in Google Chrome, or use Ollama instead.</p>
      <SetupActions><Button variant="outline" size="sm" onClick={() => setShowOllama(true)}>Use Ollama instead</Button></SetupActions>
    </SetupCard>
  );
}
