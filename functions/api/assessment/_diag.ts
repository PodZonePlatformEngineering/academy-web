// TEMPORARY — PROJ-011/T-147 round 2. Unauthenticated diagnostic-only route
// to rule in/out the two branches from the brief without needing a real
// trainee JWT or an operator retry: (1) is NEON_DATABASE_URL itself valid
// (fetch-based `neon()` one-shot query), (2) if the DSN is fine, is the
// WebSocket `Pool` path specifically broken. Returns full error detail
// (String(e), e.message, e.stack, e.name, JSON.stringify of own props) for
// whichever branch fails — Cloudflare's live-tail loses this. Remove this
// whole file once root cause is confirmed and the real fix is verified.
import { neon } from '@neondatabase/serverless'
import type { Env } from '../../_lib/env'
import { withClient } from '../../_lib/db'

function detail(e: unknown): Record<string, unknown> {
  const err = e as Error & Record<string, unknown>
  let own: string
  try {
    own = JSON.stringify(e, Object.getOwnPropertyNames(e as object))
  } catch (stringifyErr) {
    own = `<unstringifiable: ${String(stringifyErr)}>`
  }
  return {
    string: String(e),
    message: err?.message,
    name: err?.name,
    stack: err?.stack,
    ownProps: own,
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context
  const dsn = env.NEON_DATABASE_URL
  const result: Record<string, unknown> = {
    dsnPresent: Boolean(dsn),
    dsnHost: dsn ? new URL(dsn).hostname : null,
    dsnIsPooled: dsn ? new URL(dsn).hostname.includes('-pooler') : null,
  }

  try {
    const sql = neon(dsn)
    const rows = await sql`SELECT 1 AS one`
    result.neonOneShot = { ok: true, rows }
  } catch (e) {
    result.neonOneShot = { ok: false, error: detail(e) }
  }

  try {
    const rows = await withClient(dsn, (client) => client.query('SELECT 1 AS one'))
    result.pool = { ok: true, rows: rows.rows }
  } catch (e) {
    result.pool = { ok: false, error: detail(e) }
  }

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
