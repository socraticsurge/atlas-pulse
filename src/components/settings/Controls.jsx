import { HiOutlineCheck } from 'react-icons/hi2';

const RAINBOW = 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)';

/** Preset swatches plus a native custom color picker. */
export function ColorRow({ presets, selected, customHex, pickerValue, onPick, onCustom, customTitle }) {
  const isCustom = selected === 'custom';
  return (
    <div className="color-swatch-row">
      {presets.map((c) => (
        <button key={c.id} className="color-swatch" style={{ background: c.hex }} onClick={() => onPick(c.id)} title={c.label}>
          {selected === c.id && <HiOutlineCheck className="swatch-check" />}
        </button>
      ))}
      <div className="color-swatch-custom-wrapper" title={customTitle}>
        <div className="color-swatch" style={{ background: isCustom ? customHex : RAINBOW }}>
          {isCustom && <HiOutlineCheck className="swatch-check" />}
        </div>
        <input type="color" className="color-native-input" value={pickerValue} onChange={(e) => onCustom(e.target.value)} />
      </div>
    </div>
  );
}

/** Row of option buttons; the active one is highlighted. */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="settings-segmented">
      {options.map((opt) => (
        <button key={opt.value} className={`btn btn-sm ${value === opt.value ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onChange(opt.value)}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsGroup({ title, titleStyle, children }) {
  return (
    <div className="settings-group">
      <h3 style={titleStyle}>{title}</h3>
      {children}
    </div>
  );
}
