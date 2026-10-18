import { useState } from 'react';
import { getBatchSettings, saveBatchSettings } from '../../utils/batchSettings.js';
import { AIEngineSettings } from '../AIEngines.jsx';
import { Segmented, SettingsGroup } from './Controls.jsx';
import { BATCH_FEATURES, BATCH_SIZES } from './settingsModel.js';

function usePersistedBatchSettings() {
  const [settings, setSettings] = useState(getBatchSettings);
  const update = (patch) => setSettings((prev) => {
    const next = { ...prev, ...patch };
    saveBatchSettings(next);
    return next;
  });
  return [settings, update];
}

function ModelSelect({ models, value, onChange }) {
  return (
    <div className="settings-row">
      <label>Model</label>
      <select className="settings-select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Auto (first available)</option>
        {models.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
        {value && !models.some((m) => m.name === value) && (
          <option value={value}>{value} (not available, using Auto)</option>
        )}
      </select>
    </div>
  );
}

function BatchOptions({ settings, update }) {
  return (
    <>
      <div className="settings-row">
        <label>What to generate</label>
        <Segmented options={BATCH_FEATURES.map((f) => ({ value: f.id, label: f.label }))} value={settings.features} onChange={(features) => update({ features })} />
      </div>
      <div className="settings-row" style={{ borderBottom: 'none' }}>
        <label>Articles per cycle<span className="settings-sublabel"> — processed per on-demand run</span></label>
        <Segmented options={BATCH_SIZES.map((n) => ({ value: n, label: n }))} value={settings.maxPerCycle} onChange={(maxPerCycle) => update({ maxPerCycle })} />
      </div>
    </>
  );
}

/** AI engines, model choice, and background batch processing. */
export function AIProcessingSection({ availableModels = [] }) {
  const [settings, update] = usePersistedBatchSettings();
  return (
    <SettingsGroup title="AI Processing">
      <AIEngineSettings availableModels={availableModels} />
      {availableModels.length > 0 && <ModelSelect models={availableModels} value={settings.model} onChange={(model) => update({ model })} />}
      <div className="settings-row">
        <label>Background batch processing<span className="settings-sublabel"> — auto-summarize and classify new articles</span></label>
        <button className={`btn btn-sm ${settings.enabled ? 'btn-primary' : 'btn-secondary'}`} onClick={() => update({ enabled: !settings.enabled })}>
          {settings.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      {settings.enabled && <BatchOptions settings={settings} update={update} />}
    </SettingsGroup>
  );
}
