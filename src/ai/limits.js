// How much article text goes to the model, in characters. Larger budgets give
// the model more to work with but are slower, and small models (Gemini Nano)
// may not fit them. Edited in Settings → Prompts; saved in the synced setting
// 'atlas-pulse-ai-limits'.
import { readStoredObject, writeStored } from '../utils/storage.js';

export const LIMITS_KEY = 'atlas-pulse-ai-limits';

export const AI_LIMITS = [
  { id: 'article', label: 'Article text for summaries and chat', defaultValue: 6000, min: 1000, max: 60000 },
  { id: 'analysis', label: 'Article text for analysis and background processing', defaultValue: 4000, min: 1000, max: 60000 },
  { id: 'perArticle', label: 'Text per article when comparing several', defaultValue: 1200, min: 300, max: 20000 },
];

const BY_ID = new Map(AI_LIMITS.map((l) => [l.id, l]));
const clamp = (n, { min, max }) => Math.min(max, Math.max(min, n));

function limitEdits() {
  return readStoredObject(LIMITS_KEY);
}

/** A limit's value: the user's edit (kept within its range), or the default. */
export function getLimit(id) {
  const limit = BY_ID.get(id);
  const edited = Number(limitEdits()[id]);
  return Number.isFinite(edited) && edited > 0 ? clamp(Math.round(edited), limit) : limit.defaultValue;
}

/** Saves a limit; null or the default removes the edit. */
export function saveLimit(id, value) {
  const edits = { ...limitEdits() };
  if (value === null || value === BY_ID.get(id).defaultValue) delete edits[id];
  else edits[id] = clamp(Math.round(value), BY_ID.get(id));
  writeStored(LIMITS_KEY, JSON.stringify(edits));
}
