import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { applyTheme } from '@/lib/theme'
import { initialDark } from './darkMode'
import Portal from './Portal'

// White-label: the portal re-skins with the same ?theme= / VITE_THEME mechanism
// the SPA uses (this page is part of what a customer theme re-brands, per the
// design brief §2 — the Quest live link below proves it).
applyTheme()
// Apply the persisted/OS dark preference before first paint (no flash).
document.documentElement.classList.toggle('dark', initialDark())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Portal />
  </StrictMode>,
)
