# academy-web

Academy learner SPA — React on GitHub Pages (PROJ-011 architecture v2).

Live: https://podzoneplatformengineering.github.io/academy-web/

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`) + shadcn/ui (`radix-vega` style)
- React Router

## Routing on GitHub Pages

The app uses **HashRouter** (`/#/…` URLs). GitHub Pages is a static host with no
rewrite rules, so a path-routed SPA (`BrowserRouter`) 404s on deep-link refresh
unless a `404.html` redirect shim is added. Hash routing avoids the shim entirely,
and an authenticated learner app has no SEO requirement, so the trade-off is free.
Vite `base` is set to `/academy-web/` to match the project-Pages URL.

## Develop

```sh
npm ci
npm run dev
```

## Deploy

Pushes to `main` build and deploy via GitHub Actions (`.github/workflows/deploy.yml`)
using the official Pages actions (`upload-pages-artifact` → `deploy-pages`). The
workflow includes a secrets gate that greps the built bundle for DSN/key/token
patterns and fails the deploy on any hit (architecture v2 §5: no credentials and no
curriculum content in the public bundle).

Repo setting (one-time): Pages → Source = **GitHub Actions**.
