// Quiz form UI data access (PROJ-011/T-138 item 5) — the academy-web
// consumer of T-134's server-side grading + T-136's entitlement gate.
//
// Two distinct backends, deliberately kept apart:
//   - `assessment_claim` (pending row) is a plain PostgREST insert over the
//     existing Data API — a trainee's own submitted answers are legitimate
//     to record client-side (migration 037's tightened self_insert policy:
//     passed/score/graded_at must all stay unset on a client-authored row).
//   - question-serving (assessment/serving.py) and grading
//     (assessment/submit.py's `POST /api/assessment/submit` contract,
//     documented in academy-admin) are privileged: they read the Qdrant
//     `-keys` collections and call `academy.record_assessment_result`, a
//     function deliberately REVOKEd from `authenticated` (037). Today NO
//     deployed HTTP backend serves that contract anywhere in the reachable
//     repos (academy-admin's serving.py/grading.py/submit.py are local
//     Python modules that open a privileged admin Postgres DSN + the
//     cluster Qdrant admin key — never something a trainee's browser
//     session can hold). `VITE_ASSESSMENT_API_URL` is this module's seam
//     for whenever that backend exists; unset today, so assessmentConfigured
//     is false and the demo fixtures below stand in — same shape as
//     `api.ts`'s DATA_API_URL/demoMode pattern.
import { demoMode, post } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'

const ASSESSMENT_API_URL: string | undefined = import.meta.env.VITE_ASSESSMENT_API_URL

export const assessmentConfigured = !!ASSESSMENT_API_URL

export class AssessmentDenied extends Error {}

async function assessmentPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`${ASSESSMENT_API_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  // 401 (auth/token failure — e.g. a broken server-side JWKS config,
  // academy-gui#19/ACP-403) and 403 (genuine entitlement denial) used to
  // collapse into the same "Not entitled" message, hiding real auth/infra
  // failures behind a copy string that told the trainee (and whoever
  // debugged the report) nothing useful. Only 403 means "denied" now; 401
  // surfaces as a real error with the server's own message.
  if (res.status === 403) {
    throw new AssessmentDenied('Not entitled to this assessment.')
  }
  if (!res.ok) {
    const detail = await res
      .json()
      .then((d: { error?: string }) => d.error)
      .catch(() => undefined)
    throw new Error(detail ?? `Failed to retrieve questions (${res.status} on ${path})`)
  }
  return res.json() as Promise<T>
}

// SERVABLE_FIELDS (assessment/serving.py) minus the answer content, which
// never leaves the privileged path.
export interface AssessmentQuestion {
  id: string
  type: 'assessment' | 'check_understanding'
  module_id: string | null
  section_id: string | null
  assessment_id: string | null
  ordinal: number | null
  title: string | null
  text: string
  tracks?: string[]
}

const demoQuestions: Record<string, AssessmentQuestion[]> = {
  'T039-assessment': [
    {
      id: 'demo-q1',
      type: 'assessment',
      module_id: 'T039',
      section_id: null,
      assessment_id: 'T039-assessment',
      ordinal: 1,
      title: 'Question 1',
      text: 'This is placeholder demo copy — a real question renders here once the assessment API is deployed.\n\nA) Demo option A\nB) Demo option B',
      tracks: [],
    },
  ],
}

/**
 * A quiz group's live question set (assessment/grading.py's
 * list_assessment_questions, exposed over HTTP — not yet a deployed
 * endpoint; see this module's header). Returns [] rather than throwing
 * when a module genuinely has no assessment (grading.py's
 * "no assessment questions for ..." case), so the UI can show a plain
 * "no assessment for this module" state instead of an error.
 */
export async function fetchAssessmentQuestions(
  curriculumSlug: string,
  moduleId: string,
  assessmentId: string,
): Promise<AssessmentQuestion[]> {
  if (!assessmentConfigured) return demoQuestions[assessmentId] ?? []
  return assessmentPost<AssessmentQuestion[]>('/api/assessment/questions', {
    curriculum_slug: curriculumSlug,
    module_id: moduleId,
    assessment_id: assessmentId,
  })
}

/**
 * Record a pending claim (the trainee's own submitted-answers transcript)
 * before grading — the self-insert half of migration 037's tightened
 * policy. Returns the claim id `submitAssessment` needs.
 */
export async function startAssessmentClaim(
  enrolmentId: number,
  moduleId: string,
  assessmentId: string,
  answers: Record<string, string>,
): Promise<number> {
  if (demoMode) return -1
  const rows = await post<{ id: number }[]>('/assessment_claim', {
    enrolment_id: enrolmentId,
    module_id: moduleId,
    assessment_id: assessmentId,
    passed: false,
    transcript: answers,
  })
  return rows[0].id
}

// The T-134-documented `POST /api/assessment/submit` response shape.
export interface AssessmentGradeResult {
  correct: number
  total: number
  threshold: number
  passed: boolean
}

/**
 * Grade a quiz submission server-side and durably record the verified
 * result (assessment/submit.py's submit_and_grade — the intended
 * `POST /api/assessment/submit` contract). Raises AssessmentDenied on a
 * 401/403 (T-136: the trainee is not entitled to this curriculum/track) —
 * the caller should show this without treating it as an unhandled error,
 * since a real trainee should never see it post-entitlement-gating but the
 * UI must still degrade sanely if they do.
 */
export async function submitAssessment(
  claimId: number,
  curriculumSlug: string,
  moduleId: string,
  assessmentId: string,
  answers: Record<string, string>,
): Promise<AssessmentGradeResult> {
  if (!assessmentConfigured) {
    const total = Object.keys(answers).length || 1
    return { correct: total, total, threshold: Math.ceil(total * 0.8), passed: true }
  }
  return assessmentPost<AssessmentGradeResult>('/api/assessment/submit', {
    claim_id: claimId,
    curriculum_slug: curriculumSlug,
    module_id: moduleId,
    assessment_id: assessmentId,
    answers,
  })
}
