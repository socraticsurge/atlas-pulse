import { HiOutlineXMark } from 'react-icons/hi2';
import { useAppearance } from '../app/AppearanceContext.jsx';
import { useLibrary } from '../app/LibraryContext.jsx';
import { useToast } from '../app/ToastContext.jsx';
import { AIAssistantSection } from './settings/AIAssistantSection.jsx';
import { AIProcessingSection } from './settings/AIProcessingSection.jsx';
import { AppearanceSection } from './settings/AppearanceSection.jsx';
import { SettingsGroup } from './settings/Controls.jsx';
import { DangerZone, DataSection } from './settings/DataSection.jsx';
import { ReadingSection } from './settings/ReadingSection.jsx';

function About() {
  return (
    <SettingsGroup title="About">
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        <p><strong>Atlas Pulse</strong> — A modern RSS feed reader</p>
        <p style={{ marginTop: 8 }}>All data is stored locally on your machine. No accounts, no cloud, no tracking.</p>
      </div>
    </SettingsGroup>
  );
}

/** Settings modal: appearance, reading, AI, data, and danger zone. */
export default function SettingsPanel({ isOpen, onClose, availableModels = [] }) {
  const appearance = useAppearance();
  const library = useLibrary();
  const showToast = useToast();
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><HiOutlineXMark /></button>
        </div>
        <div className="modal-body">
          <AppearanceSection {...appearance} />
          <ReadingSection onAutoRefreshChange={library.setAutoRefreshMinutes} />
          <AIAssistantSection />
          <AIProcessingSection availableModels={availableModels || []} />
          <DataSection feeds={library.feeds} folders={library.folders} onImportOPML={library.importFeedsFromOPML} onRefreshAll={library.onRefreshAll} onShowToast={showToast} onClose={onClose} />
          <About />
          <DangerZone onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
