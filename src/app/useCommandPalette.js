import { useEffect, useState } from 'react';

const hasCommandKey = (e) => e.metaKey || e.ctrlKey;
const isPaletteKey = (e) => e.key.toLowerCase() === 'k' && hasCommandKey(e);

/** Open state of the command palette; ⌘K (Ctrl+K) toggles it. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!isPaletteKey(e)) return;
      e.preventDefault();
      setOpen((prev) => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return [open, setOpen];
}
