// Every AI prompt the app sends, with its default text, so each can be read
// and replaced in Settings → Prompts. Edits are saved (by prompt id) in the
// synced setting 'atlas-pulse-prompts'; an empty edit means "use the default".
import { readStoredObject, writeStored } from '../utils/storage.js';
import * as P from './prompts.js';

export const PROMPTS_KEY = 'atlas-pulse-prompts';

const NOTE_VOICE = 'Your persona, tone and custom instructions are added after it.';
const NOTE_JSON = 'Keep the JSON field names: the app reads them.';

export const PROMPTS = [
  { id: 'summary', group: 'Single article', label: 'Summary', defaultText: P.BASE_SUMMARY, note: `On-demand summary in the AI rail. ${NOTE_VOICE}` },
  { id: 'chat', group: 'Single article', label: 'Chat', defaultText: P.BASE_CHAT, note: `Questions about the open article. ${NOTE_VOICE} The article follows.` },
  { id: 'analysis', group: 'Single article', label: 'Analysis', defaultText: P.ANALYSIS_PROMPT, note: `Sentiment, urgency, frame, tone, depth and topics. ${NOTE_JSON}` },
  { id: 'batch', group: 'Background processing', label: 'Summary + analysis', defaultText: P.BATCH_PROMPT, note: `One call per article in the background. ${NOTE_JSON}` },
  { id: 'batch-voice', group: 'Background processing', label: 'Voice instruction', defaultText: P.BATCH_VOICE, note: `Tells the model which field takes your voice. ${NOTE_VOICE}` },
  { id: 'compare', group: 'Several articles', label: 'Compare', defaultText: P.COMPARE_SYSTEM, note: NOTE_VOICE },
  { id: 'briefing', group: 'Several articles', label: 'Briefing', defaultText: P.BRIEFING_SYSTEM, note: NOTE_VOICE },
  { id: 'newsletter', group: 'Several articles', label: 'Newsletter', defaultText: P.NEWSLETTER_SYSTEM, note: `{style} is replaced by the style below. ${NOTE_VOICE}` },
  { id: 'newsletter-digest', group: 'Several articles', label: 'Newsletter style: digest', defaultText: P.NEWSLETTER_STYLES.digest },
  { id: 'newsletter-roundup', group: 'Several articles', label: 'Newsletter style: roundup', defaultText: P.NEWSLETTER_STYLES.roundup },
  { id: 'newsletter-brief', group: 'Several articles', label: 'Newsletter style: brief', defaultText: P.NEWSLETTER_STYLES.brief },
];

const BY_ID = new Map(PROMPTS.map((p) => [p.id, p]));

/** The saved edits: { promptId: text }. */
export function promptEdits() {
  return readStoredObject(PROMPTS_KEY);
}

/** The text to send for a prompt: the user's edit, or the default. */
export function getPrompt(id) {
  const edited = promptEdits()[id];
  return edited?.trim() ? edited : BY_ID.get(id).defaultText;
}

/** Saves an edit; empty or default text removes it (back to the default). */
export function savePrompt(id, text) {
  const edits = { ...promptEdits() };
  if (!text?.trim() || text === BY_ID.get(id).defaultText) delete edits[id];
  else edits[id] = text;
  writeStored(PROMPTS_KEY, JSON.stringify(edits));
}
