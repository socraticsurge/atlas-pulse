import { readStored, writeStored } from './storage.js';
import { parseBatchSettings } from '../../shared/batchScope.js';

const STORAGE_KEY = 'atlas-pulse-batch-ai';

export function getBatchSettings() {
  return parseBatchSettings(readStored(STORAGE_KEY));
}

export function saveBatchSettings(settings) {
  writeStored(STORAGE_KEY, JSON.stringify(settings));
}
