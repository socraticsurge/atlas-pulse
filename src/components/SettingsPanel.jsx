import {
  HiOutlineXMark,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineTrash,
} from 'react-icons/hi2';
import db from '../db/database.js';

export default function SettingsPanel({ 
  isOpen, onClose, 
  theme, onToggleTheme,
  appFont, onChangeFont,
  appColor, onChangeColor 
}) {
  if (!isOpen) return null;

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
      await db.articles.clear();
      await db.feeds.clear();
      await db.folders.clear();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <HiOutlineXMark />
          </button>
        </div>

        <div className="modal-body">
          {/* Appearance */}
          <div className="settings-group">
            <h3>Appearance</h3>
            <div className="settings-row">
              <label>Theme</label>
              <button className="btn btn-secondary btn-sm" onClick={onToggleTheme}>
                {theme === 'dark' ? (
                  <><HiOutlineSun /> Switch to Light</>
                ) : (
                  <><HiOutlineMoon /> Switch to Dark</>
                )}
              </button>
            </div>
            <div className="settings-row">
              <label>Global Font</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['sans', 'serif', 'mono'].map(f => (
                  <button
                    key={f}
                    className={`btn btn-sm ${appFont === f ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => onChangeFont(f)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-row">
              <label>Accent Color</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { id: 'emerald', color: '#00d4aa' },
                  { id: 'blue', color: '#3b82f6' },
                  { id: 'purple', color: '#a855f7' },
                  { id: 'orange', color: '#f97316' }
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => onChangeColor(c.id)}
                    title={c.id}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: c.color, border: 'none', cursor: 'pointer',
                      outline: appColor === c.id ? `2px solid var(--text-primary)` : 'none',
                      outlineOffset: 2
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* About */}
          <div className="settings-group">
            <h3>About</h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <p><strong>Atlas Pulse</strong> — A modern RSS feed reader</p>
              <p style={{ marginTop: 8 }}>
                All data is stored locally in your browser using IndexedDB.
                No accounts, no cloud, no tracking. Your data stays on your machine.
              </p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="settings-group">
            <h3 style={{ color: 'var(--danger)' }}>Danger Zone</h3>
            <div className="settings-row" style={{ borderBottom: 'none' }}>
              <label>Delete all feeds, articles, and folders</label>
              <button className="btn btn-danger btn-sm" onClick={handleClearData}>
                <HiOutlineTrash /> Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
