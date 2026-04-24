import { useState, useRef, useEffect } from 'react';
import { HiOutlineMinusSmall, HiOutlinePlusSmall } from 'react-icons/hi2';

const FONT_FAMILIES = [
  { id: 'sans', label: 'Sans Serif', value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { id: 'serif', label: 'Serif', value: "'Merriweather', Georgia, 'Times New Roman', serif" },
  { id: 'mono', label: 'Monospace', value: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" },
];

const LINE_HEIGHTS = [
  { id: 'compact', label: 'Compact', value: 1.5 },
  { id: 'normal', label: 'Normal', value: 1.8 },
  { id: 'relaxed', label: 'Relaxed', value: 2.1 },
];

const CONTENT_WIDTHS = [
  { id: 'narrow', label: 'Narrow', value: 640 },
  { id: 'normal', label: 'Normal', value: 780 },
  { id: 'wide', label: 'Wide', value: 960 },
];

const STORAGE_KEY = 'atlas-pulse-reader-settings';

const DEFAULT_SETTINGS = {
  fontFamily: 'sans',
  fontSize: 16,
  lineHeight: 'normal',
  contentWidth: 'normal',
};

export function getReaderSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
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

export default function ReaderSettings({ settings, onSettingsChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateSetting = (key, value) => {
    const updated = { ...settings, [key]: value };
    onSettingsChange(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="reader-settings-wrapper" ref={panelRef}>
      <button
        className={`btn btn-ghost btn-icon reader-settings-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Reader display settings"
      >
        <span className="reader-settings-icon">Aa</span>
      </button>

      {isOpen && (
        <div className="reader-settings-dropdown">
          <div className="reader-settings-section">
            <label className="reader-settings-label">Font</label>
            <div className="reader-settings-chips">
              {FONT_FAMILIES.map(f => (
                <button
                  key={f.id}
                  className={`reader-chip ${settings.fontFamily === f.id ? 'active' : ''}`}
                  onClick={() => updateSetting('fontFamily', f.id)}
                  style={{
                    fontFamily: f.id === 'sans' ? 'Inter, sans-serif' :
                      f.id === 'serif' ? 'Georgia, serif' : 'monospace'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="reader-settings-section">
            <label className="reader-settings-label">Size</label>
            <div className="reader-settings-size-control">
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => updateSetting('fontSize', Math.max(12, settings.fontSize - 1))}
                disabled={settings.fontSize <= 12}
              >
                <HiOutlineMinusSmall />
              </button>
              <span className="reader-settings-size-value">{settings.fontSize}px</span>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => updateSetting('fontSize', Math.min(28, settings.fontSize + 1))}
                disabled={settings.fontSize >= 28}
              >
                <HiOutlinePlusSmall />
              </button>
            </div>
          </div>

          <div className="reader-settings-section">
            <label className="reader-settings-label">Spacing</label>
            <div className="reader-settings-chips">
              {LINE_HEIGHTS.map(l => (
                <button
                  key={l.id}
                  className={`reader-chip ${settings.lineHeight === l.id ? 'active' : ''}`}
                  onClick={() => updateSetting('lineHeight', l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="reader-settings-section">
            <label className="reader-settings-label">Width</label>
            <div className="reader-settings-chips">
              {CONTENT_WIDTHS.map(w => (
                <button
                  key={w.id}
                  className={`reader-chip ${settings.contentWidth === w.id ? 'active' : ''}`}
                  onClick={() => updateSetting('contentWidth', w.id)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="reader-settings-reset"
            onClick={() => {
              onSettingsChange(DEFAULT_SETTINGS);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
            }}
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
