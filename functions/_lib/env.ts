// Cloudflare Pages Functions env bindings for the assessment backend
// (PROJ-011/T-141). Set as encrypted Pages secrets on the academy-web
// project — never in the deployed bundle, never in academy-web's VITE_ env.
export interface Env {
  /** Admin Postgres DSN (podzone-training project) — same resource
   * academy-admin's neon_dsn.resolve_dsn() prefers when set. */
  NEON_DATABASE_URL: string
  /** The Qdrant cluster admin key — same key serving.py/grading.py hold server-side. */
  PODZONE_QDRANT_APIKEY: string
  /** Neon Auth (Stack) project id — public-by-design, mirrors VITE_STACK_PROJECT_ID. */
  STACK_PROJECT_ID: string
  /** ACP-428: 'stack' (default, unset-safe) or 'better-auth' — gates which
   * JWKS betterAuthJwt.ts/jwt.ts verify against, mirrors VITE_AUTH_PRODUCT. */
  AUTH_PRODUCT?: string
  /** ACP-428: Neon Managed Better Auth base_url (get_neon_auth_config's
   * `base_url`, e.g. `.../neondb/auth`) — only required when AUTH_PRODUCT is
   * 'better-auth'. Mirrors VITE_NEON_AUTH_URL. */
  NEON_AUTH_URL?: string
}

// PROJ-011/T-145: every branded academy-web instance calls this deployment
// (the one holding the secrets above) cross-origin, so the allowed origins
// must be listed explicitly here — add a new branded domain as a one-line
// entry, never widen this to `*`.
// `vibecreations.net`/`www.vibecreations.net` are academy-frontend's own
// domains, not academy-web's — listed here because academy-frontend calls
// into this deployment cross-service. Bare apex added 2026-08-16
// (academy-frontend#64): the www-only entry left an apex visitor's calls
// silently CORS-failing, same class of bug academy-api's own
// ALLOWED_ORIGINS had for the identical pair — see that file's history.
export const ALLOWED_ORIGINS = [
  'https://academy-web-2a2.pages.dev',
  'https://www.podzone.academy',
  'https://podzone.academy',
  'https://academy.vibecreations.net',
  'https://vibecreations.net',
  'https://www.vibecreations.net',
  'https://academy-web-podzone.pages.dev',
  'https://academy-web-vibe.pages.dev',
  'https://academy-frontend-vibe.pages.dev',
  // ACP-412 (2026-08-24) — academy-frontend-qa now points its own
  // VITE_ASSESSMENT_API_URL at a dedicated academy-web-qa deployment
  // (this repo's `qa` branch), so QA's e2e suite exercises the actual
  // production assessment code path instead of a duplicated copy.
  'https://academy-frontend-qa.pages.dev',
  // ACP-474 (2026-09-02) — qa.vibecreations.net is the QA custom-domain
  // host academy-frontend-vibe-qa actually serves from (distinct from the
  // raw academy-frontend-qa.pages.dev project URL above); missing here was
  // the root cause of a live "Failed to fetch"/CORS preflight failure
  // against /api/assessment/questions, same bug class as ACP-473's
  // academy-api fix.
  'https://qa.vibecreations.net',
]

function corsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
  }
  return {}
}

export function json(body: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

// Shared OPTIONS preflight handler for both assessment routes — carries no
// credentials, so it needs no auth, just the same origin allowlist.
export function handleOptions(request: Request): Response {
  const origin = request.headers.get('Origin')
  const headers = corsHeaders(origin)
  if (!headers['Access-Control-Allow-Origin']) return new Response(null, { status: 204 })
  return new Response(null, {
    status: 204,
    headers: {
      ...headers,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
