// Quiz form UI (PROJ-011/T-138 item 5): fetch a module's assessment
// question set, collect answers, submit for server-side grading (T-134),
// show the graded result. The privileged serving/grading path this calls is
// now entitlement-gated (T-136) — this component is what verifies the UI
// doesn't break ungracefully on a denied response, per the brief.
import { useEffect, useState } from 'react'
import MarkdownBody from '@/components/MarkdownBody'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { demoMode } from '@/lib/api'
import {
  AssessmentDenied,
  fetchAssessmentQuestions,
  startAssessmentClaim,
  submitAssessment,
  type AssessmentGradeResult,
  type AssessmentQuestion,
} from '@/lib/assessment'
import { cn } from '@/lib/utils'

// grading.py's ANSWER_PATTERNS only ever recognise A-D — the same bound
// this form's choices are drawn from, so a submission can never carry a
// letter grading.py would reject.
const LETTERS = ['A', 'B', 'C', 'D'] as const

function QuestionForm({
  question,
  value,
  onChange,
}: {
  question: AssessmentQuestion
  value: string | undefined
  onChange: (letter: string) => void
}) {
  return (
    <fieldset className="rounded-lg border bg-muted/30 p-4">
      <legend className="micro px-1 text-primary">{question.title ?? question.id}</legend>
      <MarkdownBody>{question.text}</MarkdownBody>
      <div className="mt-3 flex flex-wrap gap-2">
        {LETTERS.map((letter) => (
          <label
            key={letter}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm',
              value === letter ? 'border-primary bg-primary/10 font-medium' : 'border-border',
            )}
          >
            <input
              type="radio"
              name={question.id}
              value={letter}
              checked={value === letter}
              onChange={() => onChange(letter)}
              className="sr-only"
            />
            {letter}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function ResultCard({ result }: { result: AssessmentGradeResult }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-4">
      <div>
        <p className="font-medium">
          {result.correct} / {result.total} correct
        </p>
        <p className="text-sm text-muted-foreground">Pass threshold: {result.threshold}</p>
      </div>
      <Badge variant={result.passed ? 'success' : 'destructive'}>
        {result.passed ? 'Passed' : 'Not yet passed'}
      </Badge>
    </div>
  )
}

export default function AssessmentQuiz({
  curriculumSlug,
  moduleId,
  assessmentId,
  enrolmentId,
}: {
  curriculumSlug: string
  moduleId: string
  assessmentId: string
  enrolmentId: number | null
}) {
  const [questions, setQuestions] = useState<AssessmentQuestion[] | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AssessmentGradeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    let live = true
    setQuestions(null)
    setResult(null)
    setError(null)
    setDenied(false)
    setAnswers({})
    fetchAssessmentQuestions(curriculumSlug, moduleId, assessmentId).then(
      (qs) => live && setQuestions(qs),
      (e: Error) => {
        if (!live) return
        if (e instanceof AssessmentDenied) setDenied(true)
        else setError(e.message)
      },
    )
    return () => {
      live = false
    }
  }, [curriculumSlug, moduleId, assessmentId])

  if (denied) {
    return (
      <p className="text-sm text-destructive">
        You are not entitled to this assessment — it belongs to a curriculum or track outside your
        current entitlements.
      </p>
    )
  }
  if (error) return <p className="text-sm text-destructive">Assessment failed to load: {error}</p>
  if (questions === null) return <p className="text-sm text-muted-foreground">Loading assessment…</p>
  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">No assessment is published for this module.</p>
  }
  if (result) return <ResultCard result={result} />

  const allAnswered = questions.every((q) => answers[q.id])
  // Demo mode never has a real enrolment (fetchEnrolmentId is demo-stubbed
  // to null), but startAssessmentClaim short-circuits the same way — so the
  // enrolment requirement only gates the real Data API write path.
  const canSubmit = allAnswered && (demoMode || enrolmentId !== null)

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const claimId = await startAssessmentClaim(enrolmentId ?? -1, moduleId, assessmentId, answers)
      const graded = await submitAssessment(claimId, curriculumSlug, moduleId, assessmentId, answers)
      setResult(graded)
    } catch (e) {
      if (e instanceof AssessmentDenied) setDenied(true)
      else setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {questions.map((q) => (
        <QuestionForm
          key={q.id}
          question={q}
          value={answers[q.id]}
          onChange={(letter) => setAnswers((a) => ({ ...a, [q.id]: letter }))}
        />
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={() => void submit()} disabled={!canSubmit || submitting}>
        {submitting ? 'Submitting…' : 'Submit answers'}
      </Button>
      {enrolmentId === null && !demoMode && (
        <p className="text-xs text-muted-foreground">You need an active enrolment to submit.</p>
      )}
    </div>
  )
}
