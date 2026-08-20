// Postgres access for the assessment backend (PROJ-011/T-141) — a pooled
// WebSocket client (@neondatabase/serverless's `Pool`, not the fetch-only
// `neon()` tagged-template client) because entitlement.py's dance
// (set_config + SET LOCAL ROLE, both transaction-scoped) needs real
// session/transaction semantics, not one-shot queries.
import { Pool, type PoolClient } from '@neondatabase/serverless'

// PROJ-011/T-146: a module-level singleton `Pool` used to be cached here
// and reused across invocations. Cloudflare Pages Functions reuse a
// module's top-level scope across requests within the same isolate, but
// the driver's README is explicit that a `Pool`/`Client`'s WebSocket
// "can't outlive a single request" in serverless environments — it "must
// be connected, used and closed within a single request handler". The
// first request on a given isolate connected fine; every later request on
// that isolate reused the now-dead WebSocket and `.connect()` threw a raw,
// message-less exception (Cloudflare's generic 500, no CORS headers —
// exactly what was observed live). Fix: one `Pool` per call, torn down
// with the request.
export class MissingConfig extends Error {}

export async function withClient<T>(
  databaseUrl: string | undefined,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  // A missing/empty connectionString doesn't fail Pool.connect() fast — it
  // hangs until Cloudflare's own platform timeout cancels the request
  // (observed live, ACP-403 follow-up 2026-08-20: NEON_DATABASE_URL was
  // absent from this Pages project's env vars entirely, and every request
  // hung for the full timeout instead of erroring). Fail immediately with a
  // diagnosable message instead.
  if (!databaseUrl) {
    throw new MissingConfig('NEON_DATABASE_URL is not configured for this deployment')
  }
  const pool = new Pool({ connectionString: databaseUrl })
  try {
    const client = await pool.connect()
    try {
      return await fn(client)
    } finally {
      client.release()
    }
  } finally {
    await pool.end()
  }
}
