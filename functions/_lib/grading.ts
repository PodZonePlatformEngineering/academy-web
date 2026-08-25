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
import { resolveModule } from './curriculum'

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
  qdrantSlug: string,
  moduleId: string,
  assessmentId: string,
): Promise<QuestionPoint[]> {
  const coll = `academy-${qdrantSlug}-keys`
  const pts = await scrollFilter(qdrantApiKey, coll, [
    { key: 'type', match: { value: 'assessment' } },
    { key: 'module_id', match: { value: moduleId } },
    { key: 'assessment_id', match: { value: assessmentId } },
  ])
  const questions = pts.map((p) => ({ id: p.id, ...p.payload }))
  // Qdrant's scroll API has no guaranteed ordering — sort by the payload's
  // own ordinal so questions render in the order they were authored.
  questions.sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
  return questions
}

/** The answer_key point payload whose answer_key_for == questionPointId, or null. */
export async function getAnswerKey(
  qdrantApiKey: string,
  qdrantSlug: string,
  questionPointId: string,
): Promise<Record<string, unknown> | null> {
  const coll = `academy-${qdrantSlug}-keys`
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
  qdrantSlug: string,
  questionPointId: string,
  submittedLetter: string | undefined,
): Promise<boolean> {
  const ak = await getAnswerKey(qdrantApiKey, qdrantSlug, questionPointId)
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
 * entitlement.assertEntitled against the group's curriculum before any
 * grading happens. `answers`: {question_point_id: submitted_letter} — must
 * cover every live question in the (module_id, assessment_id) group exactly.
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
  // curriculumSlug (as sent by the client) no longer 1:1-identifies a Qdrant
  // collection or a curriculum row post-T-227 — resolve the real
  // identifiers from moduleId instead (PROJ-011/T-239). curriculumSlug is
  // kept only for error-message context below.
  const { curriculumId, qdrantSlug } = await resolveModule(pgClient, moduleId)
  const questions = await listAssessmentQuestions(qdrantApiKey, qdrantSlug, moduleId, assessmentId)
  if (questions.length === 0) {
    throw new GradingError(`no assessment questions for ${curriculumSlug}/${moduleId}/${assessmentId}`)
  }
  await assertEntitled(pgClient, traineeSub, curriculumId)
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
    perQuestion[qid] = await gradeOne(qdrantApiKey, qdrantSlug, qid, answers[qid])
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
