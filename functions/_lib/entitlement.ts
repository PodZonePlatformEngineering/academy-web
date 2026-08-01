// Port of academy-admin/assessment/entitlement.py (PROJ-011/T-136) — called
// with the exact same GUC dance and the exact same SQL, not reimplemented.
// See that module's docstring for why: academy.entitled_curriculum_ids()/
// entitled_track_ids() are SECURITY DEFINER functions keyed on
// academy.current_trainee_id(), resolved from the request.jwt.claims
// session GUC — the same contract the Neon Data API installs for a
// trainee's own RLS session. There is no PostgREST session here (this talks
// to Postgres directly), so this drives the same functions itself:
// set_config the GUC, SET LOCAL ROLE authenticated (exercising the real
// grant path, not owner-privilege bypass), then read the two functions'
// results.
import type { PoolClient } from '@neondatabase/serverless'

export class NotEntitled extends Error {}

export async function isEntitled(
  client: PoolClient,
  traineeSub: string,
  curriculumSlug: string,
  tracks: string[] | null | undefined,
): Promise<boolean> {
  if (!traineeSub) return false
  await client.query('BEGIN')
  try {
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: traineeSub }),
    ])
    await client.query('SET LOCAL ROLE authenticated')
    const byCurriculum = await client.query(
      `SELECT 1 FROM academy.entitled_curriculum_ids() eci
       JOIN curriculum c ON c.id = eci.curriculum_id
       WHERE c.slug = $1`,
      [curriculumSlug],
    )
    if (byCurriculum.rows.length > 0) {
      await client.query('COMMIT')
      return true
    }
    if (tracks && tracks.length > 0) {
      const byTrack = await client.query(
        `SELECT 1 FROM academy.entitled_track_ids() WHERE track = ANY($1)`,
        [tracks],
      )
      if (byTrack.rows.length > 0) {
        await client.query('COMMIT')
        return true
      }
    }
    await client.query('COMMIT')
    return false
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  }
}

export async function assertEntitled(
  client: PoolClient,
  traineeSub: string,
  curriculumSlug: string,
  tracks: string[] | null | undefined,
): Promise<void> {
  if (!(await isEntitled(client, traineeSub, curriculumSlug, tracks))) {
    throw new NotEntitled(
      `trainee is not entitled to curriculum ${curriculumSlug}` +
        (tracks && tracks.length ? ` or tracks ${JSON.stringify(tracks)}` : ''),
    )
  }
}
