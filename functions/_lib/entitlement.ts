// Port of academy-admin/assessment/entitlement.py (PROJ-011/T-136) — called
// with the exact same GUC dance and the exact same SQL, not reimplemented.
// See that module's docstring for why: academy.entitled_curriculum_ids() is
// a SECURITY DEFINER function keyed on academy.current_trainee_id(),
// resolved from the request.jwt.claims session GUC — the same contract the
// Neon Data API installs for a trainee's own RLS session. There is no
// PostgREST session here (this talks to Postgres directly), so this drives
// the same function itself: set_config the GUC, SET LOCAL ROLE authenticated
// (exercising the real grant path, not owner-privilege bypass), then read
// the function's result.
//
// PROJ-011/T-239: takes `curriculumId` (resolved once via
// curriculum.ts's resolveModule(), from module_id) rather than
// re-deriving/joining a `curriculum.slug` here — see curriculum.ts for why
// a slug is no longer a reliable 1:1 content identifier post-T-227.
//
// PROJ-011/ACP-244 (2026-08-17, academy-admin's entitlement.py): track-
// entitlement retired — `tracks` had 0 live rows granting access in
// practice; the `entitled_track_ids()` fallback was dropped there,
// `is_entitled`/`assert_entitled` check `entitled_curriculum_ids()` only.
// This port was never updated to match at the time — every question point
// still carries a non-empty `tracks` payload field (display-only now, see
// serving.ts's SERVABLE_FIELDS), so nearly every assertEntitled call hit
// the dropped `entitled_track_ids()` and threw a raw Postgres "function
// does not exist" error, surfacing as an uncaught 500 (ACP-403 follow-up,
// academy-gui#19 comment thread, 2026-08-20) once the STACK_PROJECT_ID fix
// let requests reach this far for the first time.
import type { PoolClient } from '@neondatabase/serverless'

export class NotEntitled extends Error {}

export async function isEntitled(
  client: PoolClient,
  traineeSub: string,
  curriculumId: number,
): Promise<boolean> {
  if (!traineeSub) return false
  await client.query('BEGIN')
  try {
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: traineeSub }),
    ])
    await client.query('SET LOCAL ROLE authenticated')
    const byCurriculum = await client.query(
      `SELECT 1 FROM academy.entitled_curriculum_ids() WHERE curriculum_id = $1`,
      [curriculumId],
    )
    await client.query('COMMIT')
    return byCurriculum.rows.length > 0
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  }
}

export async function assertEntitled(
  client: PoolClient,
  traineeSub: string,
  curriculumId: number,
): Promise<void> {
  if (!(await isEntitled(client, traineeSub, curriculumId))) {
    throw new NotEntitled(`trainee is not entitled to curriculum ${curriculumId}`)
  }
}
