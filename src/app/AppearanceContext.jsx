import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { accentVars, parseColorChoice } from './appearance.js';
import { fontById } from './fonts.js';
import { readStored, writeStored } from '../utils/storage.js';

const AppearanceContext = createContext(null);

const stored = (key, fallback) => readStored(key) || fallback;

function applyThemeAndFont(root, theme, font) {
  root.setAttribute('data-theme', theme);
  const { stack } = fontById(font);
  root.style.setProperty('--font-family', stack);
  writeStored('atlas-pulse-theme', theme);
  writeStored('atlas-pulse-font', font);
  // Read by the inline script in index.html to set the font before first paint.
  writeStored('atlas-pulse-font-stack', stack);
}

function applyTextColor(root, preset, hex) {
  root.setAttribute('data-text', preset);
  writeStored('atlas-pulse-text', preset);
  if (preset !== 'custom') {
    root.style.removeProperty('--text-primary');
    return;
  }
  root.style.setProperty('--text-primary', hex);
  writeStored('atlas-pulse-custom-text', hex);
}

function applyAccent(root, preset, hex) {
  root.setAttribute('data-color', preset);
  writeStored('atlas-pulse-color', preset);
  const vars = accentVars(hex);
  if (preset !== 'custom') {
    Object.keys(vars).forEach((name) => root.style.removeProperty(name));
    return;
  }
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  writeStored('atlas-pulse-custom-color', hex);
}

// One color setting (preset or custom hex) with a setter that accepts either.
function useColorChoice(presetKey, presetFallback, hexKey, hexFallback) {
  const [preset, setPreset] = useState(() => stored(presetKey, presetFallback));
  const [hex, setHex] = useState(() => stored(hexKey, hexFallback));
  const choose = useCallback((choice) => {
    const parsed = parseColorChoice(choice);
    setPreset(parsed.preset);
    if (parsed.hex) setHex(parsed.hex);
  }, []);
  return { preset, hex, choose };
}

function useAppearanceState() {
  const [theme, setTheme] = useState(() => stored('atlas-pulse-theme', readStored('feedflow-theme') || 'dark'));
  const [appFont, setAppFont] = useState(() => fontById(stored('atlas-pulse-font', 'sans')).id);
  const accent = useColorChoice('atlas-pulse-color', 'emerald', 'atlas-pulse-custom-color', '#00d4aa');
  const text = useColorChoice('atlas-pulse-text', 'default', 'atlas-pulse-custom-text', '#e8eaed');

  useEffect(() => {
    const root = document.documentElement;
    applyThemeAndFont(root, theme, appFont);
    applyTextColor(root, text.preset, text.hex);
    applyAccent(root, accent.preset, accent.hex);
  }, [theme, appFont, accent.preset, accent.hex, text.preset, text.hex]);

  const toggleTheme = useCallback(() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')), []);

  return useMemo(() => ({
    theme, onToggleTheme: toggleTheme,
    appFont, onChangeFont: setAppFont,
    appColor: accent.preset, customAccentHex: accent.hex, onChangeColor: accent.choose,
    appTextColor: text.preset, customTextColorHex: text.hex, onChangeTextColor: text.choose,
  }), [theme, toggleTheme, appFont, accent, text]);
}

/** Theme, font, and colors — applied to <html> and persisted to localStorage. */
export function AppearanceProvider({ children }) {
  const value = useAppearanceState();
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAppearance = () => useContext(AppearanceContext);
