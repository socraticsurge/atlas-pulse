// Options and pure helpers for the Settings panel.

export const PRESET_COLORS = [
  { id: 'amber',   hex: '#e8a33d', label: 'Amber' },
  { id: 'emerald', hex: '#2bc4a0', label: 'Emerald' },
  { id: 'blue',    hex: '#5b9cf2', label: 'Blue' },
  { id: 'purple',  hex: '#a88bf5', label: 'Purple' },
  { id: 'orange',  hex: '#f08a4b', label: 'Orange' },
  { id: 'rose',    hex: '#ef6b82', label: 'Rose' },
];

export const TEXT_COLORS = [
  { id: 'default', label: 'Default', hex: '#e8e6e1', lightHex: '#1c1b19' },
  { id: 'warm',    label: 'Warm',  hex: '#f0ead6', lightHex: '#2e2618' },
  { id: 'pure',    label: 'Pure',  hex: '#ffffff', lightHex: '#000000' },
  { id: 'soft',    label: 'Soft',  hex: '#c9c6bf', lightHex: '#4d4a44' },
];

/** Text color swatches showing the shade each preset has in the given theme. */
export function textColorsFor(theme) {
  return theme === 'light' ? TEXT_COLORS.map((c) => ({ ...c, hex: c.lightHex })) : TEXT_COLORS;
}

export const BATCH_FEATURES = [
  { id: 'summary',  label: 'Summary only' },
  { id: 'analysis', label: 'Analysis only' },
  { id: 'both',     label: 'Both' },
];

export const BATCH_SIZES = [5, 10, 20, 50];

export const CUSTOM_INSTRUCTIONS_MAX = 300;

/** Toggles a persona; at least one always stays selected. */
export function togglePersona(selected, id) {
  if (!selected.includes(id)) return [...selected, id];
  return selected.length > 1 ? selected.filter((p) => p !== id) : selected;
}

export function importResultMessage(count) {
  if (count > 0) {
    return { text: `Imported ${count} feed${count !== 1 ? 's' : ''}! Articles are downloading in the background.`, type: 'success' };
  }
  return { text: 'No new feeds found — all are already added.', type: 'error' };
}
