// Port of academy-admin/assessment/serving.py (PROJ-011/T-134/T-136).
//
// Boundary this module exists to hold: getQuestion() / listAssessmentQuestions()
// (grading.ts) return only whitelisted question fields, never a paired
// answer_key point.
import { qdrantCall } from './qdrant'

// The two question types quiz-serving may ever return. answer_key is
// deliberately excluded — refused even by direct id.
export const QUESTION_TYPES = new Set(['assessment', 'check_understanding'])

// Whitelisted response fields — mirrors serving.py's SERVABLE_FIELDS. None
// of these can carry answer content: the answer lives in a structurally
// separate point, never in the question's own payload.
export const SERVABLE_FIELDS = [
  'type',
  'curriculum_id',
  'module_id',
  'section_id',
  'assessment_id',
  'ordinal',
  'title',
  'text',
  'tracks',
] as const

export class QuestionNotFound extends Error {}

function whitelist(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of SERVABLE_FIELDS) out[f] = payload[f] ?? null
  return out
}

/**
 * Direct, deterministic point-id lookup of a servable quiz question — same
 * as serving.py's get_question().
 */
export async function getQuestion(
  qdrantApiKey: string,
  curriculumSlug: string,
  pointId: string,
): Promise<Record<string, unknown>> {
  const coll = `academy-${curriculumSlug}-keys`
  const result = await qdrantCall(qdrantApiKey, 'POST', `/collections/${coll}/points`, {
    ids: [pointId],
    with_payload: true,
    with_vector: false,
  })
  const points = result.result ?? []
  if (points.length === 0) throw new QuestionNotFound(`${pointId} not found in ${coll}`)
  const payload = points[0].payload as Record<string, unknown>
  if (!QUESTION_TYPES.has(payload.type as string)) {
    throw new QuestionNotFound(`${pointId} is type ${payload.type} in ${coll} — not a servable question`)
  }
  return { id: pointId, ...whitelist(payload) }
}
