// POST /api/assessment/questions — PROJ-011/T-141.
//
// Contract: academy-web/src/lib/assessment.ts's fetchAssessmentQuestions().
// Body: {curriculum_slug, module_id, assessment_id} -> AssessmentQuestion[].
// Ports academy-admin/assessment/grading.py's list_assessment_questions()
// (a whole quiz's live question set).
import type { Env } from '../../_lib/env'
import { handleOptions, json } from '../../_lib/env'
import { AuthError, verifyTraineeSub } from '../../_lib/jwt'
import { verifyBetterAuthTraineeSub } from '../../_lib/betterAuthJwt'
import { MissingConfig, withClient } from '../../_lib/db'
import { listAssessmentQuestions, servableQuestions } from '../../_lib/grading'
import { QdrantError } from '../../_lib/qdrant'
import { ModuleNotFound, resolveModule } from '../../_lib/curriculum'

interface RequestBody {
  curriculum_slug: string
  module_id: string
  assessment_id: string
}

export const onRequestOptions: PagesFunction<Env> = async (context) => handleOptions(context.request)

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const origin = request.headers.get('Origin')
  try {
    if (env.AUTH_PRODUCT === 'better-auth') {
      await verifyBetterAuthTraineeSub(request.headers.get('Authorization'), env.NEON_AUTH_URL!)
    } else {
      await verifyTraineeSub(request.headers.get('Authorization'), env.STACK_PROJECT_ID)
    }
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
    const result = await withClient(env.NEON_DATABASE_URL, async (client) => {
      // curriculum_slug is accepted for API-contract compat but no longer
      // 1:1-identifies content post-T-227 — resolve the real Qdrant
      // collection slug from module_id instead (PROJ-011/T-239).
      const { qdrantSlug } = await resolveModule(client, module_id)
      const questions = await listAssessmentQuestions(
        env.PODZONE_QDRANT_APIKEY,
        qdrantSlug,
        module_id,
        assessment_id,
      )
      return servableQuestions(questions)
    })

    return json(result, 200, origin)
  } catch (e) {
    if (e instanceof ModuleNotFound) return json({ error: e.message }, 404, origin)
    if (e instanceof QdrantError) return json({ error: e.message }, 502, origin)
    if (e instanceof MissingConfig) return json({ error: e.message }, 500, origin)
    throw e
  }
}
