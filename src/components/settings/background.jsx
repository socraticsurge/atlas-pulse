import { useState } from 'react';
import { getBatchSettings, saveBatchSettings } from '../../utils/batchSettings.js';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isNanoModel } from '../../utils/chromeAI.js';
import OllamaSetup from '../ollama/OllamaSetup.jsx';
import { useSettingsEnv } from './env.js';
import { BATCH_FEATURES, BATCH_SIZES } from './settingsModel.js';
import { Segmented, Select, Switch } from './ui.jsx';

// Background processing settings, saved on every change.
function useBatchSettings() {
  const [settings, setSettings] = useState(getBatchSettings);
  const update = (patch) => setSettings((prev) => {
    const next = { ...prev, ...patch };
    saveBatchSettings(next);
    return next;
  });
  return [settings, update];
}

function EngineLine({ name, children }) {
  return (
    <div className="flex flex-col gap-1.5 py-1.5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">{name}</div>
      {children}
    </div>
  );
}

// Gemini Nano (built into Chrome) and Ollama (optional, checked only when opened).
export function EngineControl() {
  const { availableModels } = useSettingsEnv();
  const [showOllama, setShowOllama] = useState(false);
  const nano = availableModels.some((m) => isNanoModel(m.name));
  return (
    <div className="flex flex-col gap-2">
      <EngineLine name="Gemini Nano">
        <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className={cn('size-2 rounded-full', nano ? 'bg-[var(--success,#3fb950)]' : 'bg-[var(--text-tertiary)]')} />
          {nano ? 'Built into Chrome · runs on your device' : 'Not available in this browser. Needs desktop Google Chrome 148+.'}
        </span>
      </EngineLine>
      <EngineLine name="Ollama · optional, for larger local models">
        {showOllama ? <OllamaSetup compact showReady /> : <Button variant="outline" size="sm" className="self-start" onClick={() => setShowOllama(true)}>Set up Ollama</Button>}
      </EngineLine>
    </div>
  );
}

export function ModelControl() {
  const { availableModels } = useSettingsEnv();
  const [settings, update] = useBatchSettings();
  const missing = settings.model && !availableModels.some((m) => m.name === settings.model);
  return (
    <Select label="Model" value={settings.model || ''} onChange={(model) => update({ model })}>
      <option value="">Auto (first available)</option>
      {availableModels.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
      {missing && <option value={settings.model}>{settings.model} (not available, using Auto)</option>}
    </Select>
  );
}

export function BatchEnabledControl() {
  const [settings, update] = useBatchSettings();
  return <Switch label="Background processing" checked={settings.enabled} onChange={(enabled) => update({ enabled })} />;
}

export function BatchFeaturesControl() {
  const [settings, update] = useBatchSettings();
  return <Segmented label="What to generate" value={settings.features} onChange={(features) => update({ features })} options={BATCH_FEATURES.map((f) => ({ value: f.id, label: f.label }))} />;
}

export function BatchSizeControl() {
  const [settings, update] = useBatchSettings();
  return <Segmented label="Articles per run" value={settings.maxPerCycle} onChange={(maxPerCycle) => update({ maxPerCycle })} options={BATCH_SIZES.map((n) => ({ value: n, label: `${n}` }))} />;
}
