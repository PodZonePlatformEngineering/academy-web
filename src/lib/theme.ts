// White-label theme loader (T-044 Task 2 — the §9.2 mechanism proof).
//
// A theme is a CSS file that overrides ONLY the brand vars defined in
// src/index.css (palette ramps, fonts, radii, shadows); the semantic
// derivation there re-themes every component. Themes are dynamic imports, so
// Vite splits each into its own chunk (CSS + self-hosted fonts) that only
// loads when selected — the stock bundle stays theme-free.
//
// Selection, in precedence order:
//   1. `?theme=<name>` in the query string — sits before the `#` fragment, so
//      it survives all HashRouter navigation and makes any deploy demoable.
//   2. `VITE_THEME` at build time — pins a deployment to a theme (the actual
//      white-label story: one repo, per-customer builds). A pinned build
//      hides the picker entirely: white-label deployments stay brand-locked.
//   3. The trainee's picker choice (B8, Home → Config) — device-local.
// Unknown names fall back to the stock warm brand.

const themes: Record<string, () => Promise<unknown>> = {
  quest: () => import('../themes/quest-academy.css'),
}

const PICKED = 'academy.theme'

/** Theme names the picker offers (stock is the absence of an override). */
export const themeNames = Object.keys(themes)

/** True when VITE_THEME pins this build — the picker must not render. */
export const themePinned = Boolean(import.meta.env.VITE_THEME)

/** The `?theme=` override on this load (demo links) — beats the picker. */
export function themeQueryOverride(): string | null {
  return new URLSearchParams(window.location.search).get('theme')
}

/** The device-local picker choice, if any. */
export function pickedTheme(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(PICKED)
}

/** Persist the picker choice (null = back to stock); applied on load. */
export function setPickedTheme(name: string | null): void {
  if (name) localStorage.setItem(PICKED, name)
  else localStorage.removeItem(PICKED)
}

export function applyTheme(): string | null {
  const requested =
    themeQueryOverride() ??
    (import.meta.env.VITE_THEME as string | undefined) ??
    pickedTheme()
  if (!requested || !(requested in themes)) return null
  void themes[requested]()
  return requested
}
