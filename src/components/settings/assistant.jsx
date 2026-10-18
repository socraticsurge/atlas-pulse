import { useState } from 'react';
import { HiOutlineCheck } from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import { getAISettings, PERSONAS, saveAISettings, TONE_GROUPS } from '../../utils/aiSettings.js';
import { CUSTOM_INSTRUCTIONS_MAX, togglePersona } from './settingsModel.js';
import { Segmented } from './ui.jsx';

// AI assistant settings (personas, tone, custom instructions), saved on every change.
function useAISettings() {
  const [settings, setSettings] = useState(getAISettings);
  const update = (patch) => setSettings((prev) => {
    const next = { ...prev, ...patch };
    saveAISettings(next);
    return next;
  });
  return [settings, update];
}

export function PersonaControl() {
  const [settings, update] = useAISettings();
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-1.5">
      {PERSONAS.map((p) => {
        const active = settings.personas.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={active}
            onClick={() => update({ personas: togglePersona(settings.personas, p.id) })}
            className={cn(
              'relative flex cursor-pointer items-start gap-2 rounded-md border bg-transparent p-2.5 text-left transition-colors hover:bg-[var(--bg-hover)]',
              active ? 'border-primary bg-[var(--accent-muted)]' : 'border-border',
            )}
          >
            <span className="text-lg leading-none">{p.emoji}</span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-foreground">{p.label}</span>
              <span className="block text-[11.5px] leading-snug text-muted-foreground">{p.desc}</span>
            </span>
            {active && <HiOutlineCheck className="absolute top-2 right-2 size-3.5 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}

export function ToneControl() {
  const [settings, update] = useAISettings();
  return (
    <div className="flex flex-col gap-2.5">
      {TONE_GROUPS.map((group) => (
        <div key={group.id} className="flex flex-wrap items-center gap-3">
          <span className="w-14 font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">{group.label}</span>
          <Segmented
            label={group.label}
            value={settings.tone[group.id]}
            onChange={(id) => update({ tone: { ...settings.tone, [group.id]: id } })}
            options={group.tones.map((t) => ({ value: t.id, label: t.label }))}
          />
        </div>
      ))}
    </div>
  );
}

export function CustomInstructionsControl() {
  const [settings, update] = useAISettings();
  return (
    <div>
      <textarea
        aria-label="Custom instructions"
        rows={3}
        value={settings.customInstructions}
        onChange={(e) => update({ customInstructions: e.target.value.slice(0, CUSTOM_INSTRUCTIONS_MAX) })}
        placeholder={'Always respond in French.\nI work in healthcare — focus on clinical implications.'}
        className="w-full resize-y rounded-md border border-border bg-[var(--bg-primary)] p-2.5 text-[13px] leading-relaxed text-foreground outline-none focus:border-primary"
      />
      <div className="mt-1 text-right font-mono text-[11px] text-[var(--text-tertiary)]">{settings.customInstructions.length} / {CUSTOM_INSTRUCTIONS_MAX}</div>
    </div>
  );
}
