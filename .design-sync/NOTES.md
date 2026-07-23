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
- Fonts come from `extraFonts`: **bricolage-grotesque** (`--font-display`),
  **plus-jakarta-sans** (`--font-body`/`--font-sans`), **jetbrains-mono** (`--font-mono`)
  — the compiled CSS references BASE_URL-absolute hashed font paths that don't resolve
  from the bundle. (There is no Inter in this DS; a stale claim to that effect was
  corrected in config/NOTES/conventions on 2026-07-22.) Note `nunito` and `fredoka` are
  installed for the quest theme but are NOT referenced by the synced component CSS, so
  they are deliberately not in `extraFonts`.
- `GamificationStrip` had a default-only export; a named export was added to the
  source 2026-07-19 (`export *` in the synth entry misses defaults).
- `dtsPropsFor` is hand-maintained for all 14 components (no `.d.ts` tree in an app
  repo; auto-extraction yields `[key: string]: unknown` stubs). Update it when a
  component's props change. The four conversation components (T-045: ChatBubble,
  LessonCard, ChatComposer, LessonOutlinePanel) follow the same named-export shape.
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
  **That build is `playwright@1.61.1`** (1.61.0 also pins 1228; 1.60.0→1223, 1.59.1→1217).
  Install with `cd .ds-sync && npm i playwright@1.61.1` — the browser is already cached,
  so there is no ~200MB download. Don't guess the version: a mismatch fails with
  `browserType.launch: Executable doesn't exist`.
- Fresh-clone setup is three steps before the driver: `npm ci`, `ln -sfn .. node_modules/academy-web`,
  then stage `.ds-sync/` + `npm i esbuild ts-morph @types/react playwright@1.61.1` inside it.
  npm's `allow-scripts` gate warns that esbuild's postinstall was skipped — **harmless**,
  esbuild resolves its platform binary package directly and the converter runs fine.
- `dtsPropsFor` and the conventions header's utility-class list are hand-verified
  against the compiled CSS of THIS build — re-validate both if the app's styling or
  component APIs move (the conventions step re-checks names on every re-sync).
- **`dtsPropsFor` drift is invisible to the anchor diff** — the single most valuable
  manual check on a re-sync. A prop added to a component's cva/props type changes NO
  render hash and NO source hash, so the driver reports `unchanged` / `upload.any:false`
  while the uploaded `.d.ts` (the design agent's API contract) silently lies. On
  2026-07-22 this had accumulated three misses: `Button.size` was missing `xs`/`icon-xs`,
  `Badge.variant` was missing `link`, and `Card` was missing `size` entirely. **Every
  re-sync should diff the cva `variants` blocks and `*Props` unions in
  `src/components/ui/*.tsx` against `dtsPropsFor`, even when the verdict is a clean
  no-op.** Fast check:
  `grep -rn 'size: {\|variant: {\|?: "' src/components/ui/*.tsx`.
