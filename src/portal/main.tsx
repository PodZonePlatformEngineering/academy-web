import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { applyTheme } from '@/lib/theme'
import { initialDark } from './darkMode'
import Portal from './Portal'
import VibePortal from './VibePortal'

// White-label: the portal re-skins with the same ?theme= / VITE_THEME mechanism
// the SPA uses (this page is part of what a customer theme re-brands, per the
// design brief §2 — the Quest live link below proves it).
//
// vibe is more than a re-skin: it's a distinct standalone product page
// (PROJ-011/ACP-218), not the PodZone Academy destination launcher, so a
// pinned vibe build swaps the whole page content, not just its tokens.
const theme = applyTheme()
if (theme === 'vibe') document.title = 'Vibe Creations — build AI systems without reading the code'
// Apply the persisted/OS dark preference before first paint (no flash).
document.documentElement.classList.toggle('dark', initialDark())

const PageComponent = theme === 'vibe' ? VibePortal : Portal

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PageComponent />
  </StrictMode>,
)
