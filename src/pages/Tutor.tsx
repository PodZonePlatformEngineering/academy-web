// Tutor chat panel (T-040 Task 2/3): scoped retrieval → streamed browser-direct
// Claude → transcript rows, per turn. B6 (T-045) dressed the stream in the
// telegram kit's conversation language — bubbles, in-stream retrieval chips,
// composer, outline rail — over the unchanged streaming + transcript spine.
// B8 (T-047) moved the mount to top-level /tutor: the curriculum is resolved
// through the activeCurriculum seam instead of a route param; everything
// below the resolution is unchanged (B9 owns panes/persistence).

import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatBubble } from '@/components/ui/chat-bubble'
import { ChatComposer } from '@/components/ui/chat-composer'
import { LessonCard } from '@/components/ui/lesson-card'
import { LessonOutlinePanel } from '@/components/ui/lesson-outline-panel'
import {
  lastUsedCurriculum,
  recordCurriculumUsed,
  resolveActiveCurriculum,
} from '@/lib/activeCurriculum'
import {
  fetchCatalogue,
  fetchEnrolments,
  fetchEnrolmentId,
  fetchModules,
  fetchProgress,
  fetchSections,
  fetchTutorPreamble,
  type CatalogueRow,
  type ModuleRow,
  type PreambleData,
  type ProgressRow,
  type SectionRow,
} from '@/lib/api'
import { loadEmbedder } from '@/lib/embed'
import { moduleOutline, outlineProgressPct } from '@/lib/gamification'
import { haveTutorKey } from '@/lib/keys'
import { retrieve, type RetrievedPoint } from '@/lib/retrieval'
import { composeUserTurn, streamTutorReply, type TutorTurn } from '@/lib/tutor'
import { recordTurn, startTutorSession } from '@/lib/transcripts'
import { TUTOR_MODEL, tutorConfigured } from '@/lib/tutorConfig'

interface ChatTurn extends TutorTurn {
  meta?: string
  at?: string
  sources?: RetrievedPoint[]
}

const timeNow = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// The passages a reply is grounded in, as in-stream lesson chips (kit's
// lesson-card treatment adapted to the retrieval-context surface).
function SourceChips({ points }: { points: RetrievedPoint[] }) {
  return (
    <div className="flex max-w-[78%] flex-wrap gap-1.5 self-start">
      {points.map((p, i) => (
        <LessonCard
          key={i}
          variant="chip"
          eyebrow={[p.module_id, p.section_id].filter(Boolean).join('/') || undefined}
          title={p.title ?? p.type ?? 'course passage'}
          meta={`${Math.round(p.score * 100)}%`}
        />
      ))}
    </div>
  )
}

export default function Tutor() {
  const [curriculum, setCurriculum] = useState<CatalogueRow | null>(null)
  const [noEnrolment, setNoEnrolment] = useState(false)
  const [preamble, setPreamble] = useState<PreambleData | null>(null)
  const [preambleReady, setPreambleReady] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [streaming, setStreaming] = useState<string | null>(null)
  const [pendingSources, setPendingSources] = useState<RetrievedPoint[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcriptNote, setTranscriptNote] = useState<string | null>(null)
  const [embedNote, setEmbedNote] = useState<string | null>(null)
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [sections, setSections] = useState<SectionRow[]>([])
  const [progress, setProgress] = useState<ProgressRow[]>([])
  const sessionIdRef = useRef<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // B-12: course-content search embeds the question in this browser. Kick the
  // one-time model fetch (~25 MB, then Cache-API cached) off on first tutor
  // use so it overlaps with the trainee typing their first question.
  useEffect(() => {
    let live = true
    loadEmbedder((p) => {
      if (!live || p.status === 'done' || !p.file?.endsWith('.onnx')) return
      const pct = p.progress ? ` ${Math.round(p.progress)}%` : ''
      setEmbedNote(`Preparing course-content search — one-time model download (~25 MB)…${pct}`)
    }).then(
      () => live && setEmbedNote(null),
      () => live && setEmbedNote('Course-content search model failed to load — retrieval will retry when you ask a question.'),
    )
    return () => {
      live = false
    }
  }, [])

  // B8: which curriculum this tutor is about comes from the seam — device-
  // local last-used, else the single/newest active enrolment. The answer is
  // recorded back as last-used (tutor open counts); nothing resolvable sends
  // the visitor to the library to enrol first.
  useEffect(() => {
    Promise.all([fetchCatalogue(), fetchEnrolments()]).then(
      ([catalogue, enrolments]) => {
        const resolved = resolveActiveCurriculum(lastUsedCurriculum(), catalogue, enrolments)
        if (!resolved) {
          setNoEnrolment(true)
          return
        }
        recordCurriculumUsed(resolved.slug)
        setCurriculum(resolved)
      },
      (e: Error) => setError(e.message),
    )
  }, [])

  useEffect(() => {
    if (!curriculum) return
    fetchTutorPreamble(curriculum.id).then(
      (p) => {
        setPreamble(p)
        setPreambleReady(true)
      },
      (e: Error) => setError(`Could not load your student context: ${e.message}`),
    )
  }, [curriculum])

  // Outline rail (T-045): existing read paths only, each best-effort — the
  // chat works with an empty rail.
  useEffect(() => {
    if (!curriculum) return
    fetchModules(curriculum.id).then(setModules, () => setModules([]))
    fetchSections(curriculum.id).then(setSections, () => setSections([]))
    fetchEnrolmentId(curriculum.id).then(
      (id) =>
        id === null
          ? setProgress([])
          : fetchProgress(id).then(setProgress, () => setProgress([])),
      () => setProgress([]),
    )
  }, [curriculum])

  // Follow the conversation as exchanges land (not per streaming delta — the
  // reader may be scrolled up mid-answer).
  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [turns])

  if (!tutorConfigured) {
    return <p className="text-sm text-muted-foreground">The tutor is not configured in this deployment.</p>
  }
  if (!haveTutorKey()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tutor</CardTitle>
          <CardDescription>
            The tutor runs on your own Anthropic key. Enter it under{' '}
            <Link to="/home" className="underline underline-offset-4">
              Home → Config
            </Link>{' '}
            first.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  if (noEnrolment) {
    // Nothing to tutor about yet — the library is where enrolments start.
    return <Navigate to="/library" replace />
  }
  if (!curriculum) {
    return error ? (
      <p className="text-sm text-destructive">{error}</p>
    ) : (
      <p className="text-sm text-muted-foreground">Loading…</p>
    )
  }
  if (preambleReady && preamble && preamble.active_curriculum && !preamble.active_curriculum.entitled) {
    return (
      <p className="text-sm text-destructive">
        You are not entitled to {curriculum.title} — the tutor is scoped to your enrolled curricula.
      </p>
    )
  }

  const send = async () => {
    const question = draft.trim()
    if (!question || busy) return
    setBusy(true)
    setError(null)
    setDraft('')
    const history: TutorTurn[] = turns.map(({ role, text }) => ({ role, text }))
    setTurns((t) => [...t, { role: 'user', text: question, at: timeNow() }])
    try {
      // Retrieval first — in-browser embed, then rag_search under RLS (B-12):
      // scope is the active curriculum; entitlement yields rows or nothing.
      const points = await retrieve(curriculum.id, question)
      setPendingSources(points)

      // Transcript session opens lazily on the first exchange (needs the
      // preamble's trainee id; RLS re-checks it server-side).
      if (sessionIdRef.current === null && preamble) {
        try {
          const row = await startTutorSession(preamble.trainee.id, curriculum.id, TUTOR_MODEL)
          sessionIdRef.current = row.id
        } catch (e) {
          setTranscriptNote(`Transcript not recording: ${String(e)}`)
        }
      }
      const sid = sessionIdRef.current
      if (sid !== null) {
        recordTurn(sid, 'user', question).catch((e) =>
          setTranscriptNote(`Transcript write failed: ${String(e)}`),
        )
      }

      setStreaming('')
      const reply = await streamTutorReply(
        history,
        composeUserTurn(question, points),
        preamble,
        (delta) => setStreaming((s) => (s ?? '') + delta),
      )
      setStreaming(null)
      setPendingSources(null)
      setTurns((t) => [
        ...t,
        {
          role: 'assistant',
          text: reply.text,
          at: timeNow(),
          sources: points,
          meta: `${reply.model} · ${points.length} passage${points.length === 1 ? '' : 's'} retrieved · ${reply.inputTokens} in / ${reply.outputTokens} out tokens (your spend)`,
        },
      ])
      if (sid !== null) {
        recordTurn(sid, 'assistant', reply.text, reply.inputTokens, reply.outputTokens).catch((e) =>
          setTranscriptNote(`Transcript write failed: ${String(e)}`),
        )
      }
    } catch (e) {
      setStreaming(null)
      setPendingSources(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const outline = moduleOutline(modules, sections, progress)

  return (
    <div className="space-y-4">
      <div>
        <Link to={`/library/${curriculum.slug}`} className="text-sm underline underline-offset-4">
          ← {curriculum.title}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Tutor</h1>
          <Badge variant="outline">scoped to {curriculum.slug}</Badge>
          {/* D-3 trust labelling: client-written transcript, not verified. */}
          <Badge variant="secondary">self-attested transcript</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Streams directly from Anthropic on your own key; course material is matched in
          this browser and retrieved from your entitled curricula. The exchange and token
          counts are recorded as a self-attested transcript.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4">
        <div className="space-y-4">
          <div className="flex flex-col gap-2.5">
            {turns.length === 0 && streaming === null && (
              <ChatBubble role="system">
                Ask anything about {curriculum.title} — answers are grounded in your course material.
              </ChatBubble>
            )}
            {embedNote && <ChatBubble role="system">{embedNote}</ChatBubble>}
            {turns.map((t, i) =>
              t.role === 'user' ? (
                <ChatBubble key={i} role="user" timestamp={t.at}>
                  {t.text}
                </ChatBubble>
              ) : (
                <Fragment key={i}>
                  {t.sources && t.sources.length > 0 && <SourceChips points={t.sources} />}
                  <ChatBubble role="tutor" timestamp={[t.at, t.meta].filter(Boolean).join(' · ')}>
                    {t.text}
                  </ChatBubble>
                </Fragment>
              ),
            )}
            {streaming !== null && (
              <>
                {pendingSources && pendingSources.length > 0 && (
                  <SourceChips points={pendingSources} />
                )}
                <ChatBubble role="tutor" streaming>
                  {streaming}
                </ChatBubble>
              </>
            )}
            <div ref={endRef} />
          </div>

          {transcriptNote && <p className="text-sm text-destructive">{transcriptNote}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <ChatComposer
            value={draft}
            onValueChange={setDraft}
            onSend={() => void send()}
            busy={busy}
            disabled={!preambleReady}
            placeholder={`Ask about ${curriculum.title}…`}
            hint="Enter to send · Shift+Enter for a new line"
          />
        </div>

        <LessonOutlinePanel
          className="hidden lg:sticky lg:top-6 lg:flex"
          title={curriculum.title}
          subtitle={
            modules.length > 0
              ? `${modules.length} module${modules.length === 1 ? '' : 's'}`
              : undefined
          }
          progressPct={outlineProgressPct(outline)}
          items={outline.map((m) => ({
            id: m.id,
            label: m.label,
            state: m.state,
            meta: m.total > 0 ? `${m.done}/${m.total}` : undefined,
          }))}
          footer={<Badge variant="secondary">self-attested</Badge>}
        />
      </div>
    </div>
  )
}
