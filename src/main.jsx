import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.css'
import App from './App.jsx'
import { upgradeAppearanceDefaults } from './app/appearanceUpgrade.js'
import { loadSettings } from './settings/sync.js'

// Settings come from data/settings.json first, so the upgrade and the first
// render see the same values in every browser.
await loadSettings()
upgradeAppearanceDefaults()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
