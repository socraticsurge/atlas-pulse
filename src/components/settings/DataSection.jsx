import { useRef, useState } from 'react';
import { HiOutlineArrowDownTray, HiOutlineArrowUpTray, HiOutlineTrash } from 'react-icons/hi2';
import { clearAllData } from '../../utils/api.js';
import { generateOPML, parseOPML } from '../../utils/opml.js';
import { useConfirmAction } from '../../hooks/useConfirmAction.js';
import { SettingsGroup } from './Controls.jsx';
import { importResultMessage } from './settingsModel.js';

function downloadOPML(feeds, folders) {
  const url = URL.createObjectURL(new Blob([generateOPML(feeds, folders)], { type: 'text/xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'atlas-pulse-feeds.opml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ImportButton({ onImportOPML, onRefreshAll, onShowToast, onDone }) {
  const inputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const count = await onImportOPML(parseOPML(await file.text()));
      if (count > 0) onRefreshAll();
      const { text, type } = importResultMessage(count);
      onShowToast?.(text, type === 'success' ? undefined : type);
      onDone();
    } catch (err) {
      onShowToast?.(`Failed to import OPML: ${err.message}`, 'error');
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input type="file" accept=".opml,.xml" style={{ display: 'none' }} ref={inputRef} onChange={handleFile} />
      <button className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()} disabled={importing}>
        {importing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <HiOutlineArrowUpTray />}
        {importing ? 'Importing...' : 'Import OPML'}
      </button>
    </>
  );
}

/** OPML export/import. */
export function DataSection({ feeds, folders, onImportOPML, onRefreshAll, onShowToast, onClose }) {
  return (
    <SettingsGroup title="Data Management">
      <div className="settings-row">
        <label>Export feeds and folders as OPML</label>
        <button className="btn btn-secondary btn-sm" onClick={() => downloadOPML(feeds, folders)}>
          <HiOutlineArrowDownTray /> Export OPML
        </button>
      </div>
      <div className="settings-row" style={{ borderBottom: 'none' }}>
        <label>Import feeds from another reader</label>
        <ImportButton onImportOPML={onImportOPML} onRefreshAll={onRefreshAll} onShowToast={onShowToast} onDone={onClose} />
      </div>
    </SettingsGroup>
  );
}

/** Two-click "Clear All Data". */
export function DangerZone({ onClose }) {
  const confirm = useConfirmAction(async () => {
    await clearAllData();
    onClose();
  }, 3000);
  return (
    <SettingsGroup title="Danger Zone" titleStyle={{ color: 'var(--danger)' }}>
      <div className="settings-row" style={{ borderBottom: 'none' }}>
        <label>Delete all feeds, articles, and folders</label>
        <button className="btn btn-danger btn-sm" onClick={confirm.trigger}>
          <HiOutlineTrash /> {confirm.armed ? 'Click again to confirm' : 'Clear All Data'}
        </button>
      </div>
    </SettingsGroup>
  );
}
