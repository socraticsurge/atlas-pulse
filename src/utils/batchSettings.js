const STORAGE_KEY = 'atlas-pulse-batch-ai';

export const DEFAULT_BATCH_SETTINGS = {
  enabled: false,
  scope: 'all',        // 'all' | 'folder:<id>' | 'feed:<id>'
  maxPerCycle: 20,
  model: '',           // empty = auto-pick first available model
  features: 'both',   // 'summary' | 'analysis' | 'both'
};

export function getBatchSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_BATCH_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_BATCH_SETTINGS };
}

export function saveBatchSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
