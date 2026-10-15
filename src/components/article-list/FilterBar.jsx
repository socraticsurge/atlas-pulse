import { useState } from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi2';
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

/** Per-dimension AI filter pills (shown when any article has an analysis). */
export function FilterBar({ available, active, onChange }) {
  const [openDim, setOpenDim] = useState(null);
  const hasActive = Object.values(active).some(Boolean);
  return (
    <>
      {openDim && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpenDim(null)} />}
      <div className="ai-filter-row">
        <span className="ai-filter-label">Filter</span>
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
        {hasActive && <button className="ai-filter-clear-btn" onClick={() => onChange({})}>✕ Clear</button>}
      </div>
    </>
  );
}
