import { useState } from 'react';
import { AUTO_REFRESH_OPTIONS, getAutoRefreshMinutes, saveAutoRefreshMinutes } from '../../utils/constants.js';
import { Segmented, SettingsGroup } from './Controls.jsx';

/** Auto-refresh interval. */
export function ReadingSection({ onAutoRefreshChange }) {
  const [minutes, setMinutes] = useState(getAutoRefreshMinutes);
  const update = (value) => {
    saveAutoRefreshMinutes(value);
    setMinutes(value);
    onAutoRefreshChange?.(value);
  };
  return (
    <SettingsGroup title="Reading">
      <div className="settings-row" style={{ borderBottom: 'none' }}>
        <label>Auto-refresh feeds</label>
        <Segmented options={AUTO_REFRESH_OPTIONS} value={minutes} onChange={update} />
      </div>
    </SettingsGroup>
  );
}
