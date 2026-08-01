// Port of academy-admin/assessment/grading.py (PROJ-011/T-134/T-136) — same
// shape decisions, made against live data and preserved literally here:
//
// - answer_key.text always starts with '**Answer: X' or '**Correct answer: X'
//   (X in A-D) — ANSWER_PATTERNS covers both; anything else raises rather
//   than guessing.
// - The quiz-grouping key is (module_id, assessment_id), not assessment_id
//   alone (code-ai's ingest gives every module the literal, non-unique
//   assessment_id "assessment").
// - The passing threshold is ceil(0.8 * total), not a hardcoded "4" — one
//   live quiz group (prompt-engineering/M3) has 6 questions, not 5.
import type { PoolClient } from '@neondatabase/serverless'
import { assertEntitled } from './entitlement'
import { QuestionNotFound, SERVABLE_FIELDS } from './serving'
import { scrollFilter } from './qdrant'

const ANSWER_PATTERNS = [/^\*\*Answer:\s*([A-D])\b/, /^\*\*Correct answer:\s*([A-D])\b/]

const PASS_FRACTION = 0.8

export class GradingError extends Error {}

export function extractCorrectLetter(answerText: string | null | undefined): string {
  for (const pat of ANSWER_PATTERNS) {
    const m = pat.exec(answerText ?? '')
    if (m) return m[1]
  }
  throw new GradingError(
    "answer_key text matches neither live prefix ('**Answer: X' / " +
      "'**Correct answer: X') — the content shape has changed since this " +
      'module was written; stop and report rather than grade a guess.',
  )
}

export interface QuestionPoint {
  id: string
  [field: string]: unknown
}

/** Every live `assessment` point sharing (module_id, assessment_id) — a whole quiz's question set. */
export async function listAssessmentQuestions(
  qdrantApiKey: string,
  curriculumSlug: string,
  moduleId: string,
  assessmentId: string,
): Promise<QuestionPoint[]> {
  const coll = `academy-${curriculumSlug}-keys`
  const pts = await scrollFilter(qdrantApiKey, coll, [
    { key: 'type', match: { value: 'assessment' } },
    { key: 'module_id', match: { value: moduleId } },
    { key: 'assessment_id', match: { value: assessmentId } },
  ])
  return pts.map((p) => ({ id: p.id, ...p.payload }))
}

/** The answer_key point payload whose answer_key_for == questionPointId, or null. */
export async function getAnswerKey(
  qdrantApiKey: string,
  curriculumSlug: string,
  questionPointId: string,
): Promise<Record<string, unknown> | null> {
  const coll = `academy-${curriculumSlug}-keys`
  const matches = await scrollFilter(qdrantApiKey, coll, [
    { key: 'type', match: { value: 'answer_key' } },
    { key: 'answer_key_for', match: { value: questionPointId } },
  ])
  if (matches.length === 0) return null
  if (matches.length > 1) {
    throw new GradingError(`${questionPointId} has ${matches.length} answer_key points — expected 0 or 1`)
  }
  return matches[0].payload
}

/** True iff submittedLetter matches the authored correct option. */
export async function gradeOne(
  qdrantApiKey: string,
  curriculumSlug: string,
  questionPointId: string,
  submittedLetter: string | undefined,
): Promise<boolean> {
  const ak = await getAnswerKey(qdrantApiKey, curriculumSlug, questionPointId)
  if (ak === null) throw new GradingError(`${questionPointId} has no answer_key — not gradable`)
  const correct = extractCorrectLetter(ak.text as string)
  return (submittedLetter ?? '').trim().toUpperCase() === correct
}

export interface GradeResult {
  correct: number
  total: number
  passed: boolean
  threshold: number
  perQuestion: Record<string, boolean>
}

/**
 * Grade a whole quiz submission. `traineeSub` is gated via
 * entitlement.assertEntitled against every question in the group before any
 * grading happens (checked per-question since `tracks` is a per-point tag).
 * `answers`: {question_point_id: submitted_letter} — must cover every live
 * question in the (module_id, assessment_id) group exactly.
 */
export async function gradeAssessment(
  qdrantApiKey: string,
  pgClient: PoolClient,
  curriculumSlug: string,
  moduleId: string,
  assessmentId: string,
  answers: Record<string, string>,
  traineeSub: string,
): Promise<GradeResult> {
  const questions = await listAssessmentQuestions(qdrantApiKey, curriculumSlug, moduleId, assessmentId)
  if (questions.length === 0) {
    throw new GradingError(`no assessment questions for ${curriculumSlug}/${moduleId}/${assessmentId}`)
  }
  for (const q of questions) {
    await assertEntitled(pgClient, traineeSub, curriculumSlug, q.tracks as string[] | undefined)
  }
  const qIds = new Set(questions.map((q) => q.id))
  const answered = new Set(Object.keys(answers))
  const missing = [...qIds].filter((id) => !answered.has(id))
  const extra = [...answered].filter((id) => !qIds.has(id))
  if (missing.length > 0 || extra.length > 0) {
    throw new GradingError(
      `answer set doesn't match the live question set for ${curriculumSlug}/${moduleId}/${assessmentId}: ` +
        `missing=${JSON.stringify(missing.sort())} extra=${JSON.stringify(extra.sort())}`,
    )
  }
  const perQuestion: Record<string, boolean> = {}
  for (const qid of qIds) {
    perQuestion[qid] = await gradeOne(qdrantApiKey, curriculumSlug, qid, answers[qid])
  }
  const total = qIds.size
  const correct = Object.values(perQuestion).filter(Boolean).length
  const threshold = Math.ceil(total * PASS_FRACTION)
  return { correct, total, passed: correct >= threshold, threshold, perQuestion }
}

/** Servable (trainee-facing) view of a quiz's question set — whitelisted fields only. */
export function servableQuestions(questions: QuestionPoint[]): Array<Record<string, unknown>> {
  return questions.map((q) => {
    const out: Record<string, unknown> = { id: q.id }
    for (const f of SERVABLE_FIELDS) out[f] = q[f] ?? null
    return out
  })
}

export { QuestionNotFound }
