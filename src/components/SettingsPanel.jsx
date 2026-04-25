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
  { id: 'sans',   label: 'Inter',   family: 'Inter, sans-serif',                       sample: 'Ag' },
  { id: 'serif',  label: 'Serif',   family: 'Merriweather, Georgia, serif',             sample: 'Ag' },
  { id: 'mono',   label: 'Mono',    family: 'JetBrains Mono, monospace',               sample: '01' },
  { id: 'system', label: 'System',  family: 'system-ui, -apple-system, sans-serif',    sample: 'Ag' },
];

export default function SettingsPanel({
  isOpen, onClose,
  theme, onToggleTheme,
  appFont, onChangeFont,
  appColor, customAccentHex, onChangeColor,
  appTextColor, onChangeTextColor,
  feeds, folders, onImportOPML, onRefreshAll,
}) {
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pickerColor, setPickerColor] = useState(customAccentHex || '#00d4aa');

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
        alert(`Successfully imported ${count} feeds! Articles are downloading in the background.`);
      } else {
        alert('No new feeds were found to import.');
      }
      onClose();
    } catch (err) {
      alert(`Failed to import OPML: ${err.message}`);
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
              <div className="text-color-row">
                {TEXT_COLORS.map(t => (
                  <button
                    key={t.id}
                    className={`text-color-option ${appTextColor === t.id ? 'active' : ''}`}
                    onClick={() => onChangeTextColor(t.id)}
                    title={t.label}
                  >
                    <span className="text-color-dot" style={{ background: t.preview }} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
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
