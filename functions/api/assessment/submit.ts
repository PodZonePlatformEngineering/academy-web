// POST /api/assessment/submit — PROJ-011/T-141.
//
// Contract: academy-web/src/lib/assessment.ts's submitAssessment(). Body:
// {claim_id, curriculum_slug, module_id, assessment_id, answers} ->
// {correct, total, threshold, passed}. Ports
// academy-admin/assessment/submit.py's submit_and_grade(): grade
// server-side (grading.gradeAssessment — never trusts a trainee's own
// claim), then durably record the verified result via
// academy.record_assessment_result (a function REVOKEd from PUBLIC/
// authenticated — reachable only through this admin-DSN connection, same
// as the Python original).
import type { Env } from '../../_lib/env'
import { handleOptions, json } from '../../_lib/env'
import { AuthError, verifyTraineeSub } from '../../_lib/jwt'
import { verifyBetterAuthTraineeSub } from '../../_lib/betterAuthJwt'
import { MissingConfig, withClient } from '../../_lib/db'
import { NotEntitled } from '../../_lib/entitlement'
import { gradeAssessment, GradingError } from '../../_lib/grading'
import { QdrantError } from '../../_lib/qdrant'
import { ModuleNotFound } from '../../_lib/curriculum'

interface RequestBody {
  claim_id: number
  curriculum_slug: string
  module_id: string
  assessment_id: string
  answers: Record<string, string>
}

export const onRequestOptions: PagesFunction<Env> = async (context) => handleOptions(context.request)

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const origin = request.headers.get('Origin')
  let traineeSub: string
  try {
    traineeSub =
      env.AUTH_PRODUCT === 'better-auth'
        ? await verifyBetterAuthTraineeSub(request.headers.get('Authorization'), env.NEON_AUTH_URL!)
        : await verifyTraineeSub(request.headers.get('Authorization'), env.STACK_PROJECT_ID)
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, 401, origin)
    throw e
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid JSON body' }, 400, origin)
  }
  const { claim_id, curriculum_slug, module_id, assessment_id, answers } = body
  if (!claim_id || !curriculum_slug || !module_id || !assessment_id || !answers) {
    return json(
      { error: 'claim_id, curriculum_slug, module_id, assessment_id, answers are required' },
      400,
      origin,
    )
  }

  try {
    const result = await withClient(env.NEON_DATABASE_URL, async (client) => {
      const grade = await gradeAssessment(
        env.PODZONE_QDRANT_APIKEY,
        client,
        curriculum_slug,
        module_id,
        assessment_id,
        answers,
        traineeSub,
      )
      // Own transaction: the entitlement checks above already committed
      // (and reverted SET LOCAL ROLE) by the time gradeAssessment returns,
      // so this runs at the connection's normal (admin) privilege — same
      // requirement submit.py's separate psycopg.connect() call has.
      await client.query('SELECT academy.record_assessment_result($1, $2, $3)', [
        claim_id,
        grade.correct,
        grade.total,
      ])
      return grade
    })
    return json(
      {
        correct: result.correct,
        total: result.total,
        threshold: result.threshold,
        passed: result.passed,
      },
      200,
      origin,
    )
  } catch (e) {
    if (e instanceof ModuleNotFound) return json({ error: e.message }, 404, origin)
    if (e instanceof NotEntitled) return json({ error: e.message }, 403, origin)
    if (e instanceof GradingError) return json({ error: e.message }, 400, origin)
    if (e instanceof QdrantError) return json({ error: e.message }, 502, origin)
    if (e instanceof MissingConfig) return json({ error: e.message }, 500, origin)
    throw e
  }
}
