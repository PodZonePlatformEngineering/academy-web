import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

// The SPA lives under the /academy-web/ base path on every host (see base
// below) because the Neon Auth oauthCallback + redirect URLs are BASE_URL-
// relative (src/lib/auth.ts) — moving to root silently breaks sign-in. The
// two hosts differ only in how that prefix is produced:
//   • GitHub Pages serves the artifact under the repo-named subpath, so dist/
//     is served AT /academy-web/ and outDir stays 'dist'.
//   • Cloudflare Pages serves the output directory at the domain root, so the
//     prefix has to exist physically in the output — nest the build under
//     dist/academy-web/ and point CF's "Build output directory" at dist. CF
//     sets CF_PAGES=1 in its build image, which is how we detect that host.
// Both builds keep base '/academy-web/'; only the on-disk layout changes.
const onCloudflarePages = process.env.CF_PAGES === '1'

// https://vite.dev/config/
export default defineConfig({
  // Project-Pages URL: https://podzoneplatformengineering.github.io/academy-web/
  base: '/academy-web/',
  build: {
    outDir: onCloudflarePages ? 'dist/academy-web' : 'dist',
  },
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})