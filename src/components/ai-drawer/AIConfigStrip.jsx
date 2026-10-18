import { emit } from '../../lib/appEvents.js';
import { cn } from '@/lib/utils';
import { PERSONAS, TONE_GROUPS, getAISettings } from '../../utils/aiSettings.js';

const Chip = ({ title, children }) => (
  <span title={title} className="rounded border border-border px-1.5 py-px font-mono text-[10.5px] text-muted-foreground">{children}</span>
);

/** The voice AI answers in (personas, tone, custom instructions), with a link to change it. */
export default function AIConfigStrip({ className }) {
  const settings = getAISettings();
  const personas = PERSONAS.filter((p) => settings.personas.includes(p.id));
  const tones = TONE_GROUPS.map((group) => group.tones.find((t) => t.id === settings.tone[group.id]) || group.tones[0]);
  return (
    <div className={cn('flex flex-wrap items-center gap-1 border-b border-border px-4 py-2', className)}>
      {personas.map((p) => <Chip key={p.id} title={p.desc}>{p.emoji} {p.label}</Chip>)}
      {tones.map((t) => <Chip key={t.id} title={t.instruction}>{t.label}</Chip>)}
      {settings.customInstructions.trim() && <Chip title={settings.customInstructions}>+ instructions</Chip>}
      <button type="button" onClick={() => emit('open-settings', 'assistant')} className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        Change voice
      </button>
    </div>
  );
}
