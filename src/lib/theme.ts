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
//      white-label story: one repo, per-customer builds).
// Unknown names fall back to the stock warm brand. No customer-facing picker.

const themes: Record<string, () => Promise<unknown>> = {
  quest: () => import('../themes/quest-academy.css'),
}

export function applyTheme(): string | null {
  const requested =
    new URLSearchParams(window.location.search).get('theme') ??
    (import.meta.env.VITE_THEME as string | undefined)
  if (!requested || !(requested in themes)) return null
  void themes[requested]()
  return requested
}
