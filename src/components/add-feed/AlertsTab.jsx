import { HiOutlineBell, HiOutlinePlus } from 'react-icons/hi2';

/** Google Alerts tab: instructions plus a URL box that hands off to the URL tab. */
export function AlertsTab({ url, onUrlChange, onSubmit }) {
  return (
    <div>
      <div className="google-alerts-info">
        <h4><HiOutlineBell /> How to add Google Alerts as RSS</h4>
        <ol>
          <li>Go to <a href="https://www.google.com/alerts" target="_blank" rel="noopener noreferrer">google.com/alerts</a></li>
          <li>Enter your search term and click &quot;Show options&quot;</li>
          <li>Change &quot;Deliver to&quot; from Email to <strong>RSS feed</strong></li>
          <li>Click &quot;Create Alert&quot;</li>
          <li>Click the RSS icon next to your alert and copy the URL</li>
          <li>Paste the URL in the URL tab above</li>
        </ol>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="Paste your Google Alerts RSS URL here..."
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          />
          <button className="btn btn-primary" onClick={onSubmit} disabled={!url.trim()}>
            <HiOutlinePlus /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
