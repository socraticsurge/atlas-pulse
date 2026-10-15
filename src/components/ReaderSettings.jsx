import { useCallback, useState } from 'react';
import { HiOutlineMinusSmall, HiOutlinePlusSmall } from 'react-icons/hi2';
import { useClickOutside } from '../hooks/useClickOutside.js';
import {
  CONTENT_WIDTHS, DEFAULT_READER_SETTINGS, FONT_FAMILIES, LINE_HEIGHTS, READER_SETTINGS_STORAGE_KEY,
} from '../utils/readerSettings.js';

const FONT_SIZE = { min: 12, max: 28 };

function Section({ label, children }) {
  return (
    <div className="reader-settings-section">
      <label className="reader-settings-label">{label}</label>
      {children}
    </div>
  );
}

function Chips({ options, value, onChange, styleFor }) {
  return (
    <div className="reader-settings-chips">
      {options.map((o) => (
        <button key={o.id} className={`reader-chip ${value === o.id ? 'active' : ''}`} onClick={() => onChange(o.id)} style={styleFor?.(o)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SizeControl({ value, onChange }) {
  return (
    <div className="reader-settings-size-control">
      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onChange(Math.max(FONT_SIZE.min, value - 1))} disabled={value <= FONT_SIZE.min}>
        <HiOutlineMinusSmall />
      </button>
      <span className="reader-settings-size-value">{value}px</span>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onChange(Math.min(FONT_SIZE.max, value + 1))} disabled={value >= FONT_SIZE.max}>
        <HiOutlinePlusSmall />
      </button>
    </div>
  );
}

/** "Aa" dropdown for reader typography: font, size, spacing, width. */
export default function ReaderSettings({ settings, onSettingsChange }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(open, close);

  const apply = (next) => {
    onSettingsChange(next);
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  };
  const set = (key) => (value) => apply({ ...settings, [key]: value });

  return (
    <div className="reader-settings-wrapper" ref={ref}>
      <button className={`btn btn-ghost btn-icon reader-settings-trigger ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} title="Reader display settings">
        <span className="reader-settings-icon">Aa</span>
      </button>
      {open && (
        <div className="reader-settings-dropdown">
          <Section label="Font"><Chips options={FONT_FAMILIES} value={settings.fontFamily} onChange={set('fontFamily')} styleFor={(f) => ({ fontFamily: f.value })} /></Section>
          <Section label="Size"><SizeControl value={settings.fontSize} onChange={set('fontSize')} /></Section>
          <Section label="Spacing"><Chips options={LINE_HEIGHTS} value={settings.lineHeight} onChange={set('lineHeight')} /></Section>
          <Section label="Width"><Chips options={CONTENT_WIDTHS} value={settings.contentWidth} onChange={set('contentWidth')} /></Section>
          <button className="reader-settings-reset" onClick={() => apply(DEFAULT_READER_SETTINGS)}>Reset to defaults</button>
        </div>
      )}
    </div>
  );
}
