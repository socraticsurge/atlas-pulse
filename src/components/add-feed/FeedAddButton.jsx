import { HiOutlineCheckCircle, HiOutlinePlus } from 'react-icons/hi2';

const Spinner = ({ size = 12 }) => <span className="spinner" style={{ width: size, height: size }} />;

/** 'adding' | 'added' | 'idle' for a feed URL. */
function addState(url, adder) {
  if (adder.adding === url) return 'adding';
  return adder.isAdded(url) ? 'added' : 'idle';
}

const ROW_LABELS = {
  adding: <Spinner />,
  added: <><HiOutlineCheckCircle /> Added</>,
  idle: <><HiOutlinePlus /> Add</>,
};

/** Add button for catalog and popular rows. */
export function FeedAddButton({ url, adder }) {
  const state = addState(url, adder);
  return (
    <button
      className={`btn btn-sm ${state === 'added' ? 'btn-ghost' : 'btn-primary'}`}
      onClick={() => state !== 'added' && adder.add(url)}
      disabled={state === 'added' || Boolean(adder.adding)}
      style={{ flexShrink: 0 }}
    >
      {ROW_LABELS[state]}
    </button>
  );
}

const DISCOVERED_LABELS = { adding: <Spinner />, added: '✓ Added', idle: 'Add' };

/** Text-label Add button for discovered feeds on the URL tab. */
export function DiscoveredAddButton({ url, adder }) {
  const state = addState(url, adder);
  return (
    <button className="btn btn-primary btn-sm" onClick={() => adder.add(url)} disabled={state === 'added' || Boolean(adder.adding)}>
      {DISCOVERED_LABELS[state]}
    </button>
  );
}

const WIDE_LABELS = (label) => ({
  adding: <><Spinner size={14} /> Adding…</>,
  added: <><HiOutlineCheckCircle /> Already Added</>,
  idle: <><HiOutlinePlus /> {label}</>,
});

/** Full-width Add button for the feed preview card (shows progress while adding). */
export function PreviewAddButton({ url, adder, onAdd }) {
  const state = addState(url, adder);
  return (
    <button className="btn btn-primary" onClick={onAdd} disabled={state !== 'idle'} style={{ width: '100%' }}>
      {WIDE_LABELS('Add This Feed')[state]}
    </button>
  );
}

/** Full-width Add button for the Google News card (no progress state). */
export function GoogleNewsAddButton({ url, adder }) {
  const added = adder.isAdded(url);
  return (
    <button className="btn btn-primary" onClick={() => adder.add(url)} disabled={added} style={{ width: '100%', marginTop: 8 }}>
      {added ? <><HiOutlineCheckCircle /> Already Added</> : <><HiOutlinePlus /> Add Google News Feed</>}
    </button>
  );
}
