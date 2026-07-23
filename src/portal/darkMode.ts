// Dark-mode wiring for the portal (T-080). Dark mode is IN SCOPE this release
// (operator 2026-07-23), so the toggle drives the real `.dark` class idiom that
// index.css's `@custom-variant dark (&:is(.dark *))` + `.dark { … }` block key
// off — the same warm-dark token set the SPA parks. The class lives on
// <html> so it cascades to the whole page (and any portaled overlay).
//
// The choice is device-local (localStorage); with nothing stored we honour the
// OS preference. main.tsx applies it before first paint to avoid a flash.

const KEY = 'academy.dark'

/** The initial dark state: the stored choice, else the OS preference. */
export function initialDark(): boolean {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored !== null) return stored === '1'
  } catch {
    // localStorage unavailable — fall through to the OS preference
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

/** Reflect `dark` onto <html> and persist the choice. */
export function applyDark(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark)
  try {
    localStorage.setItem(KEY, dark ? '1' : '0')
  } catch {
    // best-effort persistence only
  }
}
