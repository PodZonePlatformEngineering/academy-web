// Regression test for the ACP-403 follow-up (academy-gui#19 comment thread,
// 2026-08-20): academy-admin's entitlement.py dropped the `tracks` parameter
// and its `entitled_track_ids()` fallback on 2026-08-17 (ACP-244) — this TS
// port was never updated to match, and nearly every question point still
// carries a non-empty `tracks` payload field, so assertEntitled hit the
// dropped `entitled_track_ids()` SQL function and threw an uncaught 500 on
// almost every "Take Assessment" request. Locks the port to the source of
// truth's current shape: entitled_curriculum_ids() only, no tracks argument.

import { describe, expect, it, vi } from 'vitest'
import type { PoolClient } from '@neondatabase/serverless'
import { assertEntitled, isEntitled, NotEntitled } from './entitlement'

function mockClient(entitledCurricula: number[]) {
  const queries: string[] = []
  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    queries.push(sql)
    if (sql.includes('entitled_curriculum_ids')) {
      const curriculumId = (params as number[])[0]
      return { rows: entitledCurricula.includes(curriculumId) ? [{ '?column?': 1 }] : [] }
    }
    return { rows: [] }
  })
  return { client: { query } as unknown as PoolClient, queries }
}

describe('isEntitled / assertEntitled', () => {
  it('never queries entitled_track_ids — that function does not exist in production', async () => {
    const { client, queries } = mockClient([5])
    await isEntitled(client, 'trainee-1', 5)
    expect(queries.join('\n')).not.toContain('entitled_track_ids')
  })

  it('is entitled when curriculum_id is in entitled_curriculum_ids()', async () => {
    const { client } = mockClient([5])
    await expect(isEntitled(client, 'trainee-1', 5)).resolves.toBe(true)
  })

  it('is not entitled when curriculum_id is absent, even with no tracks argument to fall back on', async () => {
    const { client } = mockClient([5])
    await expect(isEntitled(client, 'trainee-1', 99)).resolves.toBe(false)
  })

  it('returns false immediately for an empty traineeSub, no query at all', async () => {
    const { client, queries } = mockClient([5])
    await expect(isEntitled(client, '', 5)).resolves.toBe(false)
    expect(queries).toHaveLength(0)
  })

  it('assertEntitled throws NotEntitled (not a raw SQL error) when denied', async () => {
    const { client } = mockClient([5])
    await expect(assertEntitled(client, 'trainee-1', 99)).rejects.toBeInstanceOf(NotEntitled)
  })

  it('assertEntitled resolves cleanly when entitled', async () => {
    const { client } = mockClient([5])
    await expect(assertEntitled(client, 'trainee-1', 5)).resolves.toBeUndefined()
  })
})
