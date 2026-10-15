import { PERSONAS, TONE_GROUPS, getAISettings } from '../../utils/aiSettings.js';

/** Badges showing the active personas, tones, and custom instructions. */
export default function AIConfigStrip() {
  const settings = getAISettings();
  const personas = PERSONAS.filter((p) => settings.personas.includes(p.id));
  const tones = TONE_GROUPS.map((group) => {
    const selectedId = settings.tone[group.id] || group.tones[0].id;
    return group.tones.find((t) => t.id === selectedId) || group.tones[0];
  });

  return (
    <div className="ai-config-strip">
      {personas.map((p) => (
        <span key={p.id} className="ai-config-badge">{p.emoji} {p.label}</span>
      ))}
      {tones.map((t) => (
        <span key={t.id} className="ai-config-badge ai-config-tone-badge">{t.label}</span>
      ))}
      {settings.customInstructions.trim() && (
        <span className="ai-config-badge ai-config-custom-badge" title={settings.customInstructions}>
          + Custom
        </span>
      )}
    </div>
  );
}
