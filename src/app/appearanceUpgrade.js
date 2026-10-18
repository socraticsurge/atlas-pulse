import { readStored, writeStored } from '../utils/storage.js';
import { READER_SETTINGS_STORAGE_KEY } from '../utils/readerSettings.js';

// One-time move to the "Instrument" defaults (IBM Plex Sans, amber accent,
// Newsreader in the reader, the Rows list view). The app saved its appearance on every load, so a
// stored value can't tell a deliberate choice from an old default. Values
// equal to the old defaults are treated as defaults and upgraded; anything
// else was chosen and is kept.

const VERSION_KEY = 'atlas-pulse-appearance-version';
const CURRENT_VERSION = '2';

const OLD_TO_NEW = [
  { key: 'atlas-pulse-font', from: 'sans', to: 'plex' },
  { key: 'atlas-pulse-color', from: 'emerald', to: 'amber' },
  { key: 'atlas-pulse-view-mode', from: 'magazine', to: 'rows' },
];

function upgradeReaderFont(storage) {
  const raw = readStored(READER_SETTINGS_STORAGE_KEY, null, storage);
  if (!raw) return;
  try {
    const settings = JSON.parse(raw);
    if (settings.fontFamily === 'sans') {
      writeStored(READER_SETTINGS_STORAGE_KEY, JSON.stringify({ ...settings, fontFamily: 'newsreader' }), storage);
    }
  } catch { /* unreadable settings fall back to defaults anyway */ }
}

/** Upgrades saved appearance settings that are still the old defaults. Runs once. */
export function upgradeAppearanceDefaults(storage = globalThis.localStorage) {
  if (readStored(VERSION_KEY, null, storage) === CURRENT_VERSION) return;
  for (const { key, from, to } of OLD_TO_NEW) {
    if (readStored(key, null, storage) === from) writeStored(key, to, storage);
  }
  writeStored('atlas-pulse-font-stack', '', storage); // recomputed from the font on first render
  upgradeReaderFont(storage);
  writeStored(VERSION_KEY, CURRENT_VERSION, storage);
}
