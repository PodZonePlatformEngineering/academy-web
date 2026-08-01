// Postgres access for the assessment backend (PROJ-011/T-141) — a pooled
// WebSocket client (@neondatabase/serverless's `Pool`, not the fetch-only
// `neon()` tagged-template client) because entitlement.py's dance
// (set_config + SET LOCAL ROLE, both transaction-scoped) needs real
// session/transaction semantics, not one-shot queries.
import { Pool, type PoolClient } from '@neondatabase/serverless'

let pool: Pool | null = null

function getPool(connectionString: string): Pool {
  if (!pool) pool = new Pool({ connectionString })
  return pool
}

/** Runs `fn` with a checked-out client, always releasing it afterwards. */
export async function withClient<T>(
  databaseUrl: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool(databaseUrl).connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}
