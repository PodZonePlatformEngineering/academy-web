// POST /api/assessment/questions — PROJ-011/T-141.
//
// Contract: academy-web/src/lib/assessment.ts's fetchAssessmentQuestions().
// Body: {curriculum_slug, module_id, assessment_id} -> AssessmentQuestion[].
// Ports academy-admin/assessment/grading.py's list_assessment_questions()
// (a whole quiz's live question set) plus entitlement.py's per-question gate
// — a trainee must be entitled to every question in the group to be served
// any of it, same as grade_assessment() requires to grade it.
import type { Env } from '../../_lib/env'
import { handleOptions, json } from '../../_lib/env'
import { AuthError, verifyTraineeSub } from '../../_lib/jwt'
import { withClient } from '../../_lib/db'
import { assertEntitled, NotEntitled } from '../../_lib/entitlement'
import { listAssessmentQuestions, servableQuestions } from '../../_lib/grading'
import { QdrantError } from '../../_lib/qdrant'

interface RequestBody {
  curriculum_slug: string
  module_id: string
  assessment_id: string
}

export const onRequestOptions: PagesFunction<Env> = async (context) => handleOptions(context.request)

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const origin = request.headers.get('Origin')
  let traineeSub: string
  try {
    traineeSub = await verifyTraineeSub(request.headers.get('Authorization'), env.STACK_PROJECT_ID)
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
  const { curriculum_slug, module_id, assessment_id } = body
  if (!curriculum_slug || !module_id || !assessment_id) {
    return json({ error: 'curriculum_slug, module_id, assessment_id are required' }, 400, origin)
  }

  try {
    const questions = await listAssessmentQuestions(
      env.PODZONE_QDRANT_APIKEY,
      curriculum_slug,
      module_id,
      assessment_id,
    )
    if (questions.length === 0) return json([], 200, origin)

    await withClient(env.NEON_DATABASE_URL, async (client) => {
      for (const q of questions) {
        await assertEntitled(client, traineeSub, curriculum_slug, q.tracks as string[] | undefined)
      }
    })

    return json(servableQuestions(questions), 200, origin)
  } catch (e) {
    if (e instanceof NotEntitled) return json({ error: e.message }, 403, origin)
    if (e instanceof QdrantError) return json({ error: e.message }, 502, origin)
    throw e
  }
}
