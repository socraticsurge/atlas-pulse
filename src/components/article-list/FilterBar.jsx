import { useCallback, useState } from 'react';
import { HiOutlineCheck, HiOutlineChevronDown, HiOutlineSparkles, HiOutlineXMark } from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import { useClickOutside } from '../../hooks/useClickOutside.js';
import { FILTER_DIMS } from './listLogic.js';

const PILL = 'inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-[11.5px] transition-colors [&_svg]:size-3';
const pillState = (on) => (on ? 'border-primary bg-[var(--accent-muted)] text-foreground' : 'border-border bg-transparent text-muted-foreground hover:text-foreground');

function MenuOption({ selected, onClick, children }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={selected} onClick={onClick} className="flex w-full cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-2 py-1.5 text-left text-[12.5px] text-foreground hover:bg-[var(--bg-hover)]">
      <span className="flex-1">{children}</span>
      {selected && <HiOutlineCheck className="size-3.5 text-primary" />}
    </button>
  );
}

// A pill for one analysis dimension, opening a menu of its values.
function FilterPill({ dim, values, activeValue, onPick }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(open, close);
  const pick = (value) => { onPick(value); setOpen(false); };
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cn(PILL, pillState(Boolean(activeValue)))}>
        {activeValue ? `${dim.label}: ${dim.values[activeValue] || activeValue}` : dim.label}
        <HiOutlineChevronDown className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="menu" className="absolute top-full left-0 z-30 mt-1 min-w-40 rounded-md border border-border bg-[var(--bg-modal)] p-1 shadow-lg">
          <MenuOption selected={!activeValue} onClick={() => pick(null)}>All</MenuOption>
          {[...values].map((value) => (
            <MenuOption key={value} selected={activeValue === value} onClick={() => pick(activeValue === value ? null : value)}>{dim.values[value] || value}</MenuOption>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The filter row, shown on demand: "AI-analyzed only", then a pill per AI
 * analysis dimension that any article has.
 */
export function FilterBar({ available, active, onChange, aiOnly, onToggleAiOnly }) {
  const hasActive = Object.values(active).some(Boolean) || aiOnly;
  const clear = () => { onChange({}); if (aiOnly) onToggleAiOnly(); };
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
      <button type="button" aria-pressed={aiOnly} onClick={onToggleAiOnly} title="Show only articles with an AI summary or analysis" className={cn(PILL, pillState(aiOnly))}>
        <HiOutlineSparkles /> AI-analyzed only
      </button>
      {FILTER_DIMS.filter((dim) => available[dim.key]?.size > 0).map((dim) => (
        <FilterPill key={dim.key} dim={dim} values={available[dim.key]} activeValue={active[dim.key]} onPick={(value) => onChange({ ...active, [dim.key]: value })} />
      ))}
      {hasActive && (
        <button type="button" onClick={clear} className="ml-auto inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[11.5px] text-muted-foreground hover:text-foreground">
          <HiOutlineXMark className="size-3" /> Clear
        </button>
      )}
    </div>
  );
}
