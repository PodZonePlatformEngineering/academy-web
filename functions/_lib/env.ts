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
}

// PROJ-011/T-145: every branded academy-web instance calls this deployment
// (the one holding the secrets above) cross-origin, so the allowed origins
// must be listed explicitly here — add a new branded domain as a one-line
// entry, never widen this to `*`.
export const ALLOWED_ORIGINS = [
  'https://academy-web-2a2.pages.dev',
  'https://www.podzone.academy',
  'https://podzone.academy',
  'https://academy.vibecreations.net',
  'https://www.vibecreations.net',
  'https://academy-web-podzone.pages.dev',
  'https://academy-web-vibe.pages.dev',
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
