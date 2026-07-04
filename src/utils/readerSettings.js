export const FONT_FAMILIES = [
  { id: 'sans',         label: 'Inter',         value: "'Inter', -apple-system, sans-serif" },
  { id: 'poppins',      label: 'Poppins',        value: "'Poppins', sans-serif" },
  { id: 'lato',         label: 'Lato',           value: "'Lato', sans-serif" },
  { id: 'nunito',       label: 'Nunito',         value: "'Nunito', sans-serif" },
  { id: 'merriweather', label: 'Merriweather',   value: "'Merriweather', Georgia, serif" },
  { id: 'garamond',     label: 'Garamond',       value: "'EB Garamond', Garamond, serif" },
  { id: 'playfair',     label: 'Playfair',       value: "'Playfair Display', Georgia, serif" },
  { id: 'source-serif', label: 'Source Serif',   value: "'Source Serif 4', Georgia, serif" },
  { id: 'georgia',      label: 'Georgia',        value: "Georgia, 'Times New Roman', serif" },
  { id: 'times',        label: 'Times NR',       value: "'Times New Roman', Times, serif" },
  { id: 'mono',         label: 'Monospace',      value: "'JetBrains Mono', monospace" },
];

export const LINE_HEIGHTS = [
  { id: 'compact', label: 'Compact', value: 1.5 },
  { id: 'normal', label: 'Normal', value: 1.8 },
  { id: 'relaxed', label: 'Relaxed', value: 2.1 },
];

export const CONTENT_WIDTHS = [
  { id: 'narrow', label: 'Narrow', value: 640 },
  { id: 'normal', label: 'Normal', value: 780 },
  { id: 'wide', label: 'Wide', value: 960 },
];

export const READER_SETTINGS_STORAGE_KEY = 'atlas-pulse-reader-settings';

export const DEFAULT_READER_SETTINGS = {
  fontFamily: 'sans',
  fontSize: 16,
  lineHeight: 'normal',
  contentWidth: 'normal',
};

export function getReaderSettings() {
  try {
    const stored = localStorage.getItem(READER_SETTINGS_STORAGE_KEY);
    if (stored) return { ...DEFAULT_READER_SETTINGS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_READER_SETTINGS;
}

export function getReaderCSSVars(settings) {
  const font = FONT_FAMILIES.find(f => f.id === settings.fontFamily) || FONT_FAMILIES[0];
  const lh = LINE_HEIGHTS.find(l => l.id === settings.lineHeight) || LINE_HEIGHTS[1];
  const cw = CONTENT_WIDTHS.find(w => w.id === settings.contentWidth) || CONTENT_WIDTHS[1];

  return {
    '--reader-font-family': font.value,
    '--reader-font-size': `${settings.fontSize}px`,
    '--reader-line-height': lh.value,
    '--reader-max-width': `${cw.value}px`,
  };
}
