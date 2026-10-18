// The settings screen, as data: its sections, and every setting in them with
// the control that edits it. SettingsScreen renders this list, so a new
// setting is one entry here. level 'simple' settings show in both modes;
// 'power' ones only in Power mode.
import {
  HiOutlineBookOpen, HiOutlineCircleStack, HiOutlineCommandLine, HiOutlineCpuChip, HiOutlineInformationCircle,
  HiOutlineSparkles, HiOutlineSwatch,
} from 'react-icons/hi2';
import { AccentControl, FontControl, TextColorControl, ThemeControl } from './appearance.jsx';
import { CustomInstructionsControl, PersonaControl, ToneControl } from './assistant.jsx';
import { BatchEnabledControl, BatchFeaturesControl, BatchSizeControl, EngineControl, ModelControl } from './background.jsx';
import { ClearAllControl, ExportOPMLControl, ImportOPMLControl, SettingsFileControl } from './data.jsx';
import { LimitsEditor, PromptsEditor } from './prompts.jsx';
import {
  AutoRefreshControl, ContentWidthControl, LineHeightControl, ReaderFontControl, ReaderSizeControl, ViewModeControl,
} from './reading.jsx';

export const SECTIONS = [
  { id: 'appearance', label: 'Appearance', Icon: HiOutlineSwatch },
  { id: 'reading', label: 'Reading', Icon: HiOutlineBookOpen },
  { id: 'assistant', label: 'AI assistant', Icon: HiOutlineSparkles },
  { id: 'engines', label: 'AI engines', Icon: HiOutlineCpuChip },
  { id: 'prompts', label: 'Prompts', Icon: HiOutlineCommandLine },
  { id: 'data', label: 'Data', Icon: HiOutlineCircleStack },
  { id: 'about', label: 'About', Icon: HiOutlineInformationCircle },
];

const S = 'simple';
const P = 'power';

export const SETTINGS = [
  { id: 'theme', section: 'appearance', level: S, label: 'Theme', Control: ThemeControl },
  { id: 'font', section: 'appearance', level: S, label: 'Interface font', stacked: true, Control: FontControl },
  { id: 'accent', section: 'appearance', level: S, label: 'Accent color', Control: AccentControl },
  { id: 'text-color', section: 'appearance', level: P, label: 'Text color', Control: TextColorControl },

  { id: 'view-mode', section: 'reading', level: S, label: 'List view', hint: 'Rows is the dense default; Grid, List and Compact are alternatives.', Control: ViewModeControl },
  { id: 'reader-size', section: 'reading', level: S, label: 'Reader text size', hint: 'Also in the reader’s Aa menu.', Control: ReaderSizeControl },
  { id: 'reader-font', section: 'reading', level: P, label: 'Reader font', Control: ReaderFontControl },
  { id: 'line-height', section: 'reading', level: P, label: 'Line spacing', Control: LineHeightControl },
  { id: 'content-width', section: 'reading', level: P, label: 'Reading column width', Control: ContentWidthControl },
  { id: 'auto-refresh', section: 'reading', level: S, label: 'Auto-refresh feeds', Control: AutoRefreshControl },

  { id: 'personas', section: 'assistant', level: S, label: 'Persona', hint: 'Pick one or more; several blend into one voice. Used for every summary, chat and multi-article action, in the background too.', stacked: true, Control: PersonaControl },
  { id: 'tone', section: 'assistant', level: P, label: 'Tone', stacked: true, Control: ToneControl },
  { id: 'custom-instructions', section: 'assistant', level: P, label: 'Custom instructions', hint: 'Added to every AI request.', stacked: true, Control: CustomInstructionsControl },

  { id: 'engines', section: 'engines', level: S, label: 'Engines', hint: 'Gemini Nano runs inside Chrome; Ollama runs larger models on your machine.', stacked: true, Control: EngineControl },
  { id: 'model', section: 'engines', level: P, label: 'Model for background and multi-article work', Control: ModelControl },
  { id: 'batch-enabled', section: 'engines', level: S, label: 'Background processing', hint: 'Summarize and classify new articles automatically.', Control: BatchEnabledControl },
  { id: 'batch-features', section: 'engines', level: P, label: 'What to generate in the background', Control: BatchFeaturesControl },
  { id: 'batch-size', section: 'engines', level: P, label: 'Articles per on-demand run', Control: BatchSizeControl },

  { id: 'prompts', section: 'prompts', level: P, label: 'Prompts', hint: 'Every instruction the app sends to the model. Edits apply immediately; reset returns a prompt to its default.', stacked: true, Control: PromptsEditor },
  { id: 'limits', section: 'prompts', level: P, label: 'Text sent to the model (characters)', hint: 'More text gives the model more to work with, but is slower; Gemini Nano shortens anything that doesn’t fit.', stacked: true, Control: LimitsEditor },

  { id: 'export-opml', section: 'data', level: S, label: 'Export feeds and folders', hint: 'As OPML, for another reader or a backup.', Control: ExportOPMLControl },
  { id: 'import-opml', section: 'data', level: S, label: 'Import feeds', hint: 'From an OPML file.', Control: ImportOPMLControl },
  { id: 'settings-file', section: 'data', level: P, label: 'Settings file', hint: 'Plain JSON beside your databases: back it up, edit it, or copy it to another machine.', stacked: true, Control: SettingsFileControl },
  { id: 'clear-all', section: 'data', level: S, label: 'Delete all feeds, articles and folders', hint: 'Saved summaries and highlights are kept.', Control: ClearAllControl },

  { id: 'about', section: 'about', level: S, label: 'Atlas Pulse', hint: 'An open-source RSS reader for fast scanning and calm reading. Everything stays on your machine: no accounts, no cloud, no tracking.' },
];

/** The settings shown in a mode: Simple shows only 'simple' ones, Power shows all. */
export const visibleIn = (mode) => (mode === 'simple' ? SETTINGS.filter((s) => s.level === S) : SETTINGS);

/** Sections that have at least one of the given settings. */
export const sectionsWith = (settings) => SECTIONS.filter((sec) => settings.some((s) => s.section === sec.id));

/** Settings whose label, hint or section match every word of the query. */
export function searchSettings(settings, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const sectionLabel = new Map(SECTIONS.map((s) => [s.id, s.label]));
  return settings.filter((s) => {
    const text = `${s.label} ${s.hint ?? ''} ${sectionLabel.get(s.section)}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}
