import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The SPA base path is env-configurable (VITE_BASE) so one repo/main serves
// both the historical subpath deployments AND per-customer root instances
// (T-079). Default is '/academy-web/' — GitHub Pages + the main CF instance —
// so an unset VITE_BASE reproduces today's behaviour exactly. A per-customer
// root instance sets VITE_BASE=/ to serve at the domain root.
//
// Why this is safe: the Neon Auth oauthCallback + redirect URLs are
// BASE_URL-relative (src/lib/auth.ts reads import.meta.env.BASE_URL), so the
// base value flows through to sign-in automatically. The one hard rule is that
// base and the *served* location must match, or sign-in silently breaks — the
// on-disk layout below keeps them in lockstep per host:
//   • GitHub Pages serves the artifact under the repo-named subpath, so dist/
//     is served AT /academy-web/ and outDir stays 'dist' regardless of base.
//   • Cloudflare Pages serves the output directory ("Build output directory" =
//     dist) at the domain root, so the base prefix has to exist physically in
//     the output: nest the build under dist/<prefix>/ for a subpath, or keep
//     dist flat for base '/'. CF sets CF_PAGES=1 in its build image.
const base = process.env.VITE_BASE ?? '/academy-web/'
const onCloudflarePages = process.env.CF_PAGES === '1'
// On CF, mirror the base prefix into the on-disk layout so dist/ served at root
// resolves the app at `base`. Root ('/') stays flat; a subpath nests under it.
const cfOutDir = base === '/' ? 'dist' : 'dist' + base.replace(/\/$/, '')

// Shared across both build targets.
const alias = { '@': path.resolve(__dirname, './src') }

// The landing/portal page (T-080) is a SECOND build target in this one repo,
// selected by VITE_TARGET=portal. It reuses the SPA's component kit, tokens and
// auth layer (via the '@' alias) but ships as its own self-contained page —
// served at the podzone.academy APEX (base '/'), a separate CF Pages project.
//
// Mechanism: point Vite's `root` at src/portal/, whose index.html is the entry.
// Vite emits it as dist/index.html at the root, so no rename is needed and CF
// serves it at '/'. outDir/publicDir are pinned to the repo (absolute) since
// they'd otherwise resolve under the portal root. The main app build is left
// completely untouched — an unset VITE_TARGET reproduces today's behaviour.
const portalConfig = defineConfig({
  base: '/',
  root: path.resolve(__dirname, 'src/portal'),
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
  resolve: { alias },
})

// https://vite.dev/config/
const appConfig = defineConfig({
  // Default Project-Pages URL: https://podzoneplatformengineering.github.io/academy-web/
  base,
  build: {
    outDir: onCloudflarePages ? cfOutDir : 'dist',
  },
  plugins: [react(), tailwindcss()],
  resolve: { alias },
})

export default process.env.VITE_TARGET === 'portal' ? portalConfig : appConfig
