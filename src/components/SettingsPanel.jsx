import {
  HiOutlineXMark,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineTrash,
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
  HiOutlineCheck,
} from 'react-icons/hi2';
import { useState, useRef } from 'react';
import db from '../db/database.js';
import { parseOPML, generateOPML } from '../utils/opml.js';
import {
  PERSONAS,
  TONE_GROUPS,
  getAISettings,
  saveAISettings,
} from '../utils/aiSettings.js';
import { AUTO_REFRESH_OPTIONS, getAutoRefreshMinutes, saveAutoRefreshMinutes } from '../utils/constants.js';
import { getBatchSettings, saveBatchSettings } from '../utils/batchSettings.js';
import OllamaSetup from './OllamaSetup.jsx';

const PRESET_COLORS = [
  { id: 'emerald', hex: '#00d4aa', label: 'Emerald' },
  { id: 'blue',    hex: '#3b82f6', label: 'Blue' },
  { id: 'purple',  hex: '#a855f7', label: 'Purple' },
  { id: 'orange',  hex: '#f97316', label: 'Orange' },
  { id: 'rose',    hex: '#f43f5e', label: 'Rose' },
  { id: 'amber',   hex: '#f59e0b', label: 'Amber' },
];

const TEXT_COLORS = [
  { id: 'default', label: 'Cool',  preview: '#e8eaed' },
  { id: 'warm',    label: 'Warm',  preview: '#f0ead6' },
  { id: 'pure',    label: 'Pure',  preview: '#ffffff' },
  { id: 'soft',    label: 'Soft',  preview: '#b8c0cc' },
];

const FONTS = [
  { id: 'sans',     label: 'Inter',       family: 'Inter, sans-serif',                            sample: 'Ag' },
  { id: 'poppins',  label: 'Poppins',     family: "'Poppins', sans-serif",                        sample: 'Ag' },
  { id: 'lato',     label: 'Lato',        family: "'Lato', sans-serif",                           sample: 'Ag' },
  { id: 'nunito',   label: 'Nunito',      family: "'Nunito', sans-serif",                         sample: 'Ag' },
  { id: 'serif',    label: 'Merriweather',family: "'Merriweather', Georgia, serif",               sample: 'Ag' },
  { id: 'garamond', label: 'Garamond',    family: "'EB Garamond', Garamond, serif",               sample: 'Ag' },
  { id: 'times',    label: 'Times',       family: "'Times New Roman', Times, serif",              sample: 'Ag' },
  { id: 'mono',     label: 'Mono',        family: "'JetBrains Mono', monospace",                  sample: '01' },
  { id: 'system',   label: 'System',      family: 'system-ui, -apple-system, sans-serif',         sample: 'Ag' },
];

export default function SettingsPanel({
  isOpen, onClose,
  theme, onToggleTheme,
  appFont, onChangeFont,
  appColor, customAccentHex, onChangeColor,
  appTextColor, customTextColorHex, onChangeTextColor,
  feeds, folders, onImportOPML, onRefreshAll,
  onAutoRefreshChange,
  availableModels = [],
  onShowToast,
}) {
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pickerColor, setPickerColor] = useState(customAccentHex || '#00d4aa');
  const [pickerTextColor, setPickerTextColor] = useState(customTextColorHex || '#e8eaed');
  const [aiSettings, setAISettings] = useState(getAISettings);
  const [autoRefreshMinutes, setAutoRefreshMinutes] = useState(getAutoRefreshMinutes);
  const [batchSettings, setBatchSettings] = useState(getBatchSettings);

  const updateAutoRefresh = (minutes) => {
    saveAutoRefreshMinutes(minutes);
    setAutoRefreshMinutes(minutes);
    onAutoRefreshChange?.(minutes);
  };

  const updateBatchSettings = (patch) => {
    setBatchSettings((prev) => {
      const next = { ...prev, ...patch };
      saveBatchSettings(next);
      return next;
    });
  };

  const updateAISettings = (patch) => {
    setAISettings((prev) => {
      const next = { ...prev, ...patch };
      saveAISettings(next);
      return next;
    });
  };

  const togglePersona = (id) => {
    const current = aiSettings.personas;
    const next = current.includes(id)
      ? current.length > 1 ? current.filter((p) => p !== id) : current // keep at least one
      : [...current, id];
    updateAISettings({ personas: next });
  };

  if (!isOpen) return null;

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
      await db.articles.clear();
      await db.feeds.clear();
      await db.folders.clear();
      onClose();
    }
  };

  const handleExport = () => {
    const opmlString = generateOPML(feeds, folders);
    const blob = new Blob([opmlString], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atlas-pulse-feeds.opml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const parsedFeeds = parseOPML(text);
      const count = await onImportOPML(parsedFeeds);
      if (count > 0) {
        onRefreshAll();
        onShowToast?.(`Imported ${count} feed${count !== 1 ? 's' : ''}! Articles are downloading in the background.`);
      } else {
        onShowToast?.('No new feeds found — all are already added.', 'error');
      }
      onClose();
    } catch (err) {
      onShowToast?.(`Failed to import OPML: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isCustomColor = appColor === 'custom';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <HiOutlineXMark />
          </button>
        </div>

        <div className="modal-body">

          {/* ── Appearance ───────────────────────────────────────────── */}
          <div className="settings-group">
            <h3>Appearance</h3>

            {/* Theme */}
            <div className="settings-row">
              <label>Theme</label>
              <button className="btn btn-secondary btn-sm" onClick={onToggleTheme}>
                {theme === 'dark'
                  ? <><HiOutlineSun /> Light mode</>
                  : <><HiOutlineMoon /> Dark mode</>}
              </button>
            </div>

            {/* Font */}
            <div className="settings-row settings-row-col">
              <label>Font</label>
              <div className="font-picker">
                {FONTS.map(f => (
                  <button
                    key={f.id}
                    className={`font-option ${appFont === f.id ? 'active' : ''}`}
                    onClick={() => onChangeFont(f.id)}
                    title={f.label}
                  >
                    <span className="font-sample" style={{ fontFamily: f.family }}>{f.sample}</span>
                    <span className="font-label">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="settings-row settings-row-col">
              <label>Accent Color</label>
              <div className="color-swatch-row">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.id}
                    className="color-swatch"
                    style={{ background: c.hex }}
                    onClick={() => onChangeColor(c.id)}
                    title={c.label}
                  >
                    {appColor === c.id && <HiOutlineCheck className="swatch-check" />}
                  </button>
                ))}

                {/* Custom color picker */}
                <div className="color-swatch-custom-wrapper" title="Custom color">
                  <div
                    className="color-swatch"
                    style={{
                      background: isCustomColor
                        ? customAccentHex
                        : 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)',
                    }}
                  >
                    {isCustomColor && <HiOutlineCheck className="swatch-check" />}
                  </div>
                  <input
                    type="color"
                    className="color-native-input"
                    value={pickerColor}
                    onChange={(e) => {
                      setPickerColor(e.target.value);
                      onChangeColor(e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Text Color */}
            <div className="settings-row settings-row-col">
              <label>Text Color</label>
              <div className="color-swatch-row">
                {TEXT_COLORS.map(t => (
                  <button
                    key={t.id}
                    className="color-swatch"
                    style={{ background: t.preview }}
                    onClick={() => onChangeTextColor(t.id)}
                    title={t.label}
                  >
                    {appTextColor === t.id && <HiOutlineCheck className="swatch-check" />}
                  </button>
                ))}

                {/* Custom text color picker */}
                <div className="color-swatch-custom-wrapper" title="Custom text color">
                  <div
                    className="color-swatch"
                    style={{
                      background: appTextColor === 'custom'
                        ? customTextColorHex
                        : 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)',
                    }}
                  >
                    {appTextColor === 'custom' && <HiOutlineCheck className="swatch-check" />}
                  </div>
                  <input
                    type="color"
                    className="color-native-input"
                    value={pickerTextColor}
                    onChange={(e) => {
                      setPickerTextColor(e.target.value);
                      onChangeTextColor(e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Reading ──────────────────────────────────────────────── */}
          <div className="settings-group">
            <h3>Reading</h3>
            <div className="settings-row" style={{ borderBottom: 'none' }}>
              <label>Auto-refresh feeds</label>
              <div className="settings-segmented">
                {AUTO_REFRESH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`btn btn-sm ${autoRefreshMinutes === opt.value ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => updateAutoRefresh(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── AI Assistant ─────────────────────────────────────────── */}
          <div className="settings-group">
            <h3>AI Assistant</h3>

            {/* Persona — multi-select */}
            <div className="settings-row settings-row-col">
              <label>
                Persona
                <span className="settings-sublabel"> — select one or more to blend</span>
              </label>
              <div className="persona-grid">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    className={`persona-card ${aiSettings.personas.includes(p.id) ? 'active' : ''}`}
                    onClick={() => togglePersona(p.id)}
                    title={p.desc}
                  >
                    <span className="persona-emoji">{p.emoji}</span>
                    <span className="persona-label">{p.label}</span>
                    <span className="persona-desc">{p.desc}</span>
                    {aiSettings.personas.includes(p.id) && (
                      <HiOutlineCheck className="persona-check" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone — single-select grouped */}
            <div className="settings-row settings-row-col">
              <label>Tone</label>
              <div className="tone-groups">
                {TONE_GROUPS.map((group) => (
                  <div key={group.label} className="tone-group">
                    <span className="tone-group-label">{group.label}</span>
                    <div className="tone-chip-row">
                      {group.tones.map((t) => (
                        <button
                          key={t.id}
                          className={`tone-chip ${aiSettings.tone[group.id] === t.id ? 'active' : ''}`}
                          onClick={() =>
                            updateAISettings({ tone: { ...aiSettings.tone, [group.id]: t.id } })
                          }
                          title={t.instruction}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom instructions */}
            <div className="settings-row settings-row-col" style={{ borderBottom: 'none' }}>
              <label>
                Custom Instructions
                <span className="settings-sublabel"> — optional, applied to every AI response</span>
              </label>
              <textarea
                className="ai-custom-instructions-input"
                placeholder={'Always respond in French.\nI work in healthcare — focus on clinical implications.\nAssume I have a PhD in economics.'}
                value={aiSettings.customInstructions}
                onChange={(e) =>
                  updateAISettings({ customInstructions: e.target.value.slice(0, 300) })
                }
                rows={3}
              />
              <div className="settings-char-count">
                {aiSettings.customInstructions.length} / 300
              </div>
            </div>
          </div>

          {/* ── AI Processing ────────────────────────────────────────── */}
          <div className="settings-group">
            <h3>AI Processing</h3>

            {/* Ollama — always first, shows status or setup wizard */}
            <div className="settings-row settings-row-col">
              <label>Ollama</label>
              <OllamaSetup compact showReady />
            </div>

            {/* Model — only shown once Ollama is confirmed running with models */}
            {availableModels && availableModels.length > 0 && (
              <div className="settings-row">
                <label>Model</label>
                <select
                  className="settings-select"
                  value={batchSettings.model || ''}
                  onChange={(e) => updateBatchSettings({ model: e.target.value })}
                >
                  <option value="">Auto (first available)</option>
                  {availableModels.map((m) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Enable / disable batch */}
            <div className="settings-row">
              <label>
                Background batch processing
                <span className="settings-sublabel"> — auto-summarize and classify new articles</span>
              </label>
              <button
                className={`btn btn-sm ${batchSettings.enabled ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateBatchSettings({ enabled: !batchSettings.enabled })}
              >
                {batchSettings.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {batchSettings.enabled && (
              <>
                {/* Features */}
                <div className="settings-row">
                  <label>What to generate</label>
                  <div className="settings-segmented">
                    {[
                      { id: 'summary',  label: 'Summary only' },
                      { id: 'analysis', label: 'Analysis only' },
                      { id: 'both',     label: 'Both' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        className={`btn btn-sm ${batchSettings.features === f.id ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => updateBatchSettings({ features: f.id })}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Articles per cycle */}
                <div className="settings-row" style={{ borderBottom: 'none' }}>
                  <label>
                    Articles per cycle
                    <span className="settings-sublabel"> — processed per on-demand run</span>
                  </label>
                  <div className="settings-segmented">
                    {[5, 10, 20, 50].map((n) => (
                      <button
                        key={n}
                        className={`btn btn-sm ${batchSettings.maxPerCycle === n ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => updateBatchSettings({ maxPerCycle: n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Data Management ──────────────────────────────────────── */}
          <div className="settings-group">
            <h3>Data Management</h3>
            <div className="settings-row">
              <label>Export feeds and folders as OPML</label>
              <button className="btn btn-secondary btn-sm" onClick={handleExport}>
                <HiOutlineArrowDownTray /> Export OPML
              </button>
            </div>
            <div className="settings-row" style={{ borderBottom: 'none' }}>
              <label>Import feeds from another reader</label>
              <input
                type="file"
                accept=".opml,.xml"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleImport}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting
                  ? <span className="spinner" style={{ width: 14, height: 14 }} />
                  : <HiOutlineArrowUpTray />}
                {isImporting ? 'Importing...' : 'Import OPML'}
              </button>
            </div>
          </div>

          {/* ── About ────────────────────────────────────────────────── */}
          <div className="settings-group">
            <h3>About</h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <p><strong>Atlas Pulse</strong> — A modern RSS feed reader</p>
              <p style={{ marginTop: 8 }}>
                All data is stored locally in your browser using IndexedDB.
                No accounts, no cloud, no tracking.
              </p>
            </div>
          </div>

          {/* ── Danger Zone ──────────────────────────────────────────── */}
          <div className="settings-group">
            <h3 style={{ color: 'var(--danger)' }}>Danger Zone</h3>
            <div className="settings-row" style={{ borderBottom: 'none' }}>
              <label>Delete all feeds, articles, and folders</label>
              <button className="btn btn-danger btn-sm" onClick={handleClearData}>
                <HiOutlineTrash /> Clear All Data
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
