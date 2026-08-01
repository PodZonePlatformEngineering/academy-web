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

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
