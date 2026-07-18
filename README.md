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

## Configuration

Build-time env (public-by-design values only — RLS is the gate; no secrets ever).
In CI these come from repo **Actions variables** (Settings → Secrets and variables →
Actions → Variables) of the same names; locally use a `.env.local`:

- `VITE_DATA_API_URL` — Neon Data API (PostgREST) base URL for the
  `podzone-training` branch. **Unset = demo mode**: the catalogue and module
  browser render labelled placeholder fixtures so the deployed shell works
  without a backend.
- `VITE_STACK_PROJECT_ID` — Neon Auth project id (a UUID; also visible in the
  project's public JWKS URL).
- `VITE_STACK_PUBLISHABLE_CLIENT_KEY` — Neon Auth publishable client key
  (`pck_…`, designed to ship in the browser bundle). **Either unset = auth UI
  hidden** and all reads are anonymous.

## Auth (Neon Auth / Stack)

Sign-in uses `@stackframe/js` headlessly (`src/lib/auth.ts`) rather than the
provider/handler component route: the app is hash-routed on a Pages subpath, and
the headless flow keeps the OAuth return (`?code=…` lands in the query, before
the fragment, invisible to HashRouter) independent of routing. Google + GitHub
run on Neon Auth's **shared dev OAuth keys** for the MVP; production OAuth apps
are an operator step tracked in PROJ-011. The session JWT is attached to every
Data API request (`src/lib/api.ts`) and RLS on `trainee.neon_auth_user_id` does
the rest.

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
