# design-sync notes — academy-web

- **App repo, not a library** — synth-entry mode. The converter needs the self-link
  `node_modules/academy-web -> ..` (recreate on fresh clones: `ln -sfn .. node_modules/academy-web`).
- **Never pass `--entry`** on this repo: the package adapter uses it as the bundle
  entry and drags the whole app graph in (pages → `@anthropic-ai/sdk` `node:` imports
  fail the bundle; `main.tsx` → raw `index.css` fails on `@import "tailwindcss"`).
- `componentSrcMap` pins **are** the component list (any pin suppresses src
  auto-derivation). Add new components as new pins. `srcDir` is deliberately
  `src/components` to keep `App`/`pages/`/`main.tsx` out of the synth entry.
- `cssEntry` points at the **hashed** vite output (`dist/assets/index-<hash>.css`) —
  after any app build that changes styling, re-run `npm run build` and update the hash
  in config (validate fails loudly if the file is gone).
- Fonts come from `extraFonts: @fontsource-variable/inter` — the compiled CSS
  references BASE_URL-absolute hashed font paths that don't resolve from the bundle.
- `GamificationStrip` had a default-only export; a named export was added to the
  source 2026-07-19 (`export *` in the synth entry misses defaults).
- `dtsPropsFor` is hand-maintained for all 10 components (no `.d.ts` tree in an app
  repo; auto-extraction yields `[key: string]: unknown` stubs). Update it when a
  component's props change.
- Week views (StreakCalendar `view="week"`, StreakCard's strip) anchor to the CURRENT
  week — time-dependent, not deterministically previewable. Previews pin `view="month"`
  `month={July 2026}` instead.

## Known render warns

(none outstanding — GRID_OVERFLOW on PointsBadge/StreakBadge/AchievementBadge resolved
via `cardMode: column` overrides)

## Re-sync risks

- **cssEntry hash rots on every app build** — the single most likely re-sync failure;
  fix is mechanical (rebuild app, update hash).
- Preview fixed dates (July 2026) are stable, but the components' own "today"
  highlight drifts out of the pinned ranges over time — cosmetic; the cards stay valid.
- Playwright: chromium-headless-shell build 1228 cached at
  `~/Library/Caches/ms-playwright` — pins the playwright version for re-validate.
- `dtsPropsFor` and the conventions header's utility-class list are hand-verified
  against the compiled CSS of THIS build — re-validate both if the app's styling or
  component APIs move (the conventions step re-checks names on every re-sync).
