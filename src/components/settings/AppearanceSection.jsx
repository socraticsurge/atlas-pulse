import { useState } from 'react';
import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi2';
import { ColorRow, SettingsGroup } from './Controls.jsx';
import { FONTS, PRESET_COLORS, textColorsFor } from './settingsModel.js';

function FontPicker({ value, onChange }) {
  return (
    <div className="font-picker">
      {FONTS.map((f) => (
        <button key={f.id} className={`font-option ${value === f.id ? 'active' : ''}`} onClick={() => onChange(f.id)} title={f.label}>
          <span className="font-sample" style={{ fontFamily: f.family }}>{f.sample}</span>
          <span className="font-label">{f.label}</span>
        </button>
      ))}
    </div>
  );
}

// A preset/custom color setting whose native picker remembers the last custom value.
function ColorSetting({ label, presets, selected, customHex, fallbackHex, onChange, customTitle }) {
  const [picker, setPicker] = useState(customHex || fallbackHex);
  const custom = (hex) => { setPicker(hex); onChange(hex); };
  return (
    <div className="settings-row settings-row-col">
      <label>{label}</label>
      <ColorRow presets={presets} selected={selected} customHex={customHex} pickerValue={picker} onPick={onChange} onCustom={custom} customTitle={customTitle} />
    </div>
  );
}

/** Theme, font, accent color, text color. */
export function AppearanceSection({ theme, onToggleTheme, appFont, onChangeFont, appColor, customAccentHex, onChangeColor, appTextColor, customTextColorHex, onChangeTextColor }) {
  return (
    <SettingsGroup title="Appearance">
      <div className="settings-row">
        <label>Theme</label>
        <button className="btn btn-secondary btn-sm" onClick={onToggleTheme}>
          {theme === 'dark' ? <><HiOutlineSun /> Light mode</> : <><HiOutlineMoon /> Dark mode</>}
        </button>
      </div>
      <div className="settings-row settings-row-col">
        <label>Font</label>
        <FontPicker value={appFont} onChange={onChangeFont} />
      </div>
      <ColorSetting label="Accent Color" presets={PRESET_COLORS} selected={appColor} customHex={customAccentHex} fallbackHex="#00d4aa" onChange={onChangeColor} customTitle="Custom color" />
      <ColorSetting label="Text Color" presets={textColorsFor(theme)} selected={appTextColor} customHex={customTextColorHex} fallbackHex={textColorsFor(theme)[0].hex} onChange={onChangeTextColor} customTitle="Custom text color" />
    </SettingsGroup>
  );
}
