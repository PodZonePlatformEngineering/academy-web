// Profile Management (T-073) — the self-service onboarding surface. A signed-in
// user with no trainee profile is funnelled here by the route gate; submitting
// the form provisions them in the same authenticated session via the
// provision_or_link_trainee RPC (trainee row + full entitlement + one active
// enrolment on the chosen start programme + the captured intake profile), then
// lands them on the tutor. No email round-trip, no agent job.
//
// The already-provisioned case (reached via the Home link) shows the same form
// as a view/edit stub — the RPC ignores profile args once linked, so a resubmit
// simply returns them to the tutor. Structured editing lands in a later brief.

import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { recordCurriculumUsed } from '@/lib/activeCurriculum'
import { fetchCatalogue, provisionOrLinkTrainee, type CatalogueRow } from '@/lib/api'
import { useAuthState } from '@/lib/auth-state'

const fieldClass =
  'w-full rounded-(--r-lg) border bg-white px-3 py-2 text-sm outline-none transition-colors ' +
  'placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {children}
    </label>
  )
}

export default function ProfileManagement() {
  const { user, provision, setProvision } = useAuthState()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [curricula, setCurricula] = useState<CatalogueRow[]>([])
  const [startId, setStartId] = useState<number | ''>('')
  const [background, setBackground] = useState('')
  const [goals, setGoals] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const returning = provision === 'provisioned'

  // Prefill the display name from the Neon Auth identity.
  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName)
  }, [user])

  // The start-programme choices are the live curricula (the catalogue view is
  // open to any caller). Best-effort: the field is optional and the RPC
  // defaults to the lowest curriculum when none is chosen.
  useEffect(() => {
    let cancelled = false
    fetchCatalogue()
      .then((rows) => {
        if (!cancelled) setCurricula(rows)
      })
      .catch(() => {
        /* leave the dropdown empty; submit still works */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const canSubmit = displayName.trim().length > 0 && !submitting

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    const intake: Record<string, string> = {}
    if (background.trim()) intake.background = background.trim()
    if (goals.trim()) intake.goals = goals.trim()

    try {
      await provisionOrLinkTrainee({
        displayName: displayName.trim(),
        startCurriculumId: startId === '' ? null : startId,
        intakeProfile: Object.keys(intake).length ? intake : null,
      })
      // Open the tutor on the chosen programme (device-local last-used).
      const chosen = curricula.find((c) => c.id === startId)
      if (chosen) recordCurriculumUsed(chosen.slug)
      setProvision('provisioned')
      navigate('/tutor', { replace: true })
    } catch {
      setError('Could not save your profile just now. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {returning ? 'Your profile' : 'Set up your profile'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {returning
            ? 'This is the profile that shapes your tutoring. Editing individual fields lands in a later update — for now, resubmit to return to the tutor.'
            : "Tell us who you are and where you'd like to start. We'll set up your academy and take you straight to the tutor — no email, no waiting."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About you</CardTitle>
          <CardDescription>
            Your background and goals travel with you into every tutoring session, so the
            tutor can pitch its answers to you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <Field label="Display name">
              <input
                className={fieldClass}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you'd like to be addressed"
                autoComplete="name"
                maxLength={120}
                required
              />
            </Field>

            <Field
              label="Start programme"
              hint="Which track to open the tutor on. You'll be entitled to all of them."
            >
              <select
                className={fieldClass}
                value={startId}
                onChange={(e) => setStartId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">Choose a programme…</option>
                {curricula.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Your background" hint="Optional — role, prior experience, tools you use.">
              <textarea
                className={`${fieldClass} min-h-20 resize-y`}
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="e.g. Data analyst, comfortable with SQL, new to LLMs."
                maxLength={2000}
              />
            </Field>

            <Field label="Your goals" hint="Optional — what you'd like to get out of the academy.">
              <textarea
                className={`${fieldClass} min-h-20 resize-y`}
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g. Ship a production prompt pipeline for our support team."
                maxLength={2000}
              />
            </Field>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!canSubmit}>
                {submitting ? 'Setting up…' : returning ? 'Save and continue' : 'Start learning'}
              </Button>
              <span className="text-xs text-muted-foreground">
                Signed in as {user?.email ?? user?.displayName ?? 'you'}
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
