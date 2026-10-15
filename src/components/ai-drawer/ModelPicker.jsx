import { useEffect, useRef, useState } from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi2';

const modelLabel = (name) => (name ? name.split(':')[0].replace(/-/g, ' ') : 'No model');

/** Header dropdown for choosing the drawer's AI model. */
export default function ModelPicker({ models, selectedModel, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="ai-model-picker" ref={ref}>
      <button className="ai-model-btn" onClick={() => setOpen((s) => !s)} title="Select model">
        {modelLabel(selectedModel)}
        <HiOutlineChevronDown className={open ? 'rotated' : ''} />
      </button>
      {open && models.length > 0 && (
        <div className="ai-model-dropdown">
          {models.map((m) => (
            <button
              key={m.name}
              className={`ai-model-option ${m.name === selectedModel ? 'active' : ''}`}
              onClick={() => { onSelect(m.name); setOpen(false); }}
            >
              <span className="ai-model-option-name">{m.name.split(':')[0]}</span>
              <span className="ai-model-option-meta">{m.parameterSize}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
