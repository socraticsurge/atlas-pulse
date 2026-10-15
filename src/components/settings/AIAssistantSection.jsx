import { useState } from 'react';
import { HiOutlineCheck } from 'react-icons/hi2';
import { PERSONAS, TONE_GROUPS, getAISettings, saveAISettings } from '../../utils/aiSettings.js';
import { SettingsGroup } from './Controls.jsx';
import { CUSTOM_INSTRUCTIONS_MAX, togglePersona } from './settingsModel.js';

function usePersistedAISettings() {
  const [settings, setSettings] = useState(getAISettings);
  const update = (patch) => setSettings((prev) => {
    const next = { ...prev, ...patch };
    saveAISettings(next);
    return next;
  });
  return [settings, update];
}

function PersonaGrid({ selected, onToggle }) {
  return (
    <div className="persona-grid">
      {PERSONAS.map((p) => {
        const active = selected.includes(p.id);
        return (
          <button key={p.id} className={`persona-card ${active ? 'active' : ''}`} onClick={() => onToggle(p.id)} title={p.desc}>
            <span className="persona-emoji">{p.emoji}</span>
            <span className="persona-label">{p.label}</span>
            <span className="persona-desc">{p.desc}</span>
            {active && <HiOutlineCheck className="persona-check" />}
          </button>
        );
      })}
    </div>
  );
}

function ToneGroups({ tone, onChange }) {
  return (
    <div className="tone-groups">
      {TONE_GROUPS.map((group) => (
        <div key={group.label} className="tone-group">
          <span className="tone-group-label">{group.label}</span>
          <div className="tone-chip-row">
            {group.tones.map((t) => (
              <button key={t.id} className={`tone-chip ${tone[group.id] === t.id ? 'active' : ''}`} onClick={() => onChange({ ...tone, [group.id]: t.id })} title={t.instruction}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Personas, tone, and custom instructions applied to every AI response. */
export function AIAssistantSection() {
  const [settings, update] = usePersistedAISettings();
  return (
    <SettingsGroup title="AI Assistant">
      <div className="settings-row settings-row-col">
        <label>Persona<span className="settings-sublabel"> — select one or more to blend</span></label>
        <PersonaGrid selected={settings.personas} onToggle={(id) => update({ personas: togglePersona(settings.personas, id) })} />
      </div>
      <div className="settings-row settings-row-col">
        <label>Tone</label>
        <ToneGroups tone={settings.tone} onChange={(tone) => update({ tone })} />
      </div>
      <div className="settings-row settings-row-col" style={{ borderBottom: 'none' }}>
        <label>Custom Instructions<span className="settings-sublabel"> — optional, applied to every AI response</span></label>
        <textarea
          className="ai-custom-instructions-input"
          placeholder={'Always respond in French.\nI work in healthcare — focus on clinical implications.\nAssume I have a PhD in economics.'}
          value={settings.customInstructions}
          onChange={(e) => update({ customInstructions: e.target.value.slice(0, CUSTOM_INSTRUCTIONS_MAX) })}
          rows={3}
        />
        <div className="settings-char-count">{settings.customInstructions.length} / {CUSTOM_INSTRUCTIONS_MAX}</div>
      </div>
    </SettingsGroup>
  );
}
