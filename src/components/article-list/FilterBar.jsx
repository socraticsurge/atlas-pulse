import { useState } from 'react';
import { HiOutlineChevronDown, HiOutlineSparkles } from 'react-icons/hi2';
import { FILTER_DIMS } from './listLogic.js';

function FilterPill({ dim, values, activeValue, open, onOpenChange, onPick }) {
  const label = activeValue ? `${dim.label}: ${dim.values[activeValue] || activeValue}` : dim.label;
  const pick = (value) => { onPick(value); onOpenChange(false); };
  return (
    <div className="ai-filter-pill-wrap">
      <button className={`ai-filter-pill ${activeValue ? 'active' : ''}`} onClick={() => onOpenChange(!open)}>
        <span>{label}</span>
        <HiOutlineChevronDown className={`ai-filter-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <div className="ai-filter-dropdown">
          <button className={`ai-filter-option ${!activeValue ? 'active' : ''}`} onClick={() => pick(null)}>All</button>
          {[...values].map((value) => (
            <button key={value} className={`ai-filter-option ${activeValue === value ? 'active' : ''}`} onClick={() => pick(activeValue === value ? null : value)}>
              {dim.values[value] || value}
            </button>
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
  const [openDim, setOpenDim] = useState(null);
  const hasActive = Object.values(active).some(Boolean) || aiOnly;
  const clear = () => { onChange({}); if (aiOnly) onToggleAiOnly(); };
  return (
    <>
      {openDim && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpenDim(null)} />}
      <div className="ai-filter-row">
        <button className={`ai-filter-pill ${aiOnly ? 'active' : ''}`} onClick={onToggleAiOnly} aria-pressed={aiOnly} title="Show only articles with an AI summary or analysis">
          <HiOutlineSparkles /> <span>AI-analyzed only</span>
        </button>
        {FILTER_DIMS.filter((dim) => available[dim.key]?.size > 0).map((dim) => (
          <FilterPill
            key={dim.key}
            dim={dim}
            values={available[dim.key]}
            activeValue={active[dim.key]}
            open={openDim === dim.key}
            onOpenChange={(open) => setOpenDim(open ? dim.key : null)}
            onPick={(value) => onChange({ ...active, [dim.key]: value })}
          />
        ))}
        {hasActive && <button className="ai-filter-clear-btn" onClick={clear}>✕ Clear</button>}
      </div>
    </>
  );
}
