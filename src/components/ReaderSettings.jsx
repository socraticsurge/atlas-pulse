import { useState, useRef, useEffect } from 'react';
import { HiOutlineMinusSmall, HiOutlinePlusSmall } from 'react-icons/hi2';
import {
  FONT_FAMILIES, LINE_HEIGHTS, CONTENT_WIDTHS,
  READER_SETTINGS_STORAGE_KEY as STORAGE_KEY,
  DEFAULT_READER_SETTINGS as DEFAULT_SETTINGS,
} from '../utils/readerSettings.js';

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
                  style={{ fontFamily: f.value }}
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
