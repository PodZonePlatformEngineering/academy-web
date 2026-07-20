// Tutor chat panel (T-040 → T-048). Retrieval → streamed browser-direct Claude
// → durable round, per turn. B9 (T-048) makes it durable and gives it the
// two-pane layout:
//   * one `prompt` row per completed round replaces the two tutor_turn writes
//     (transcripts.ts / migration 020); a cold mount re-hydrates the most
//     recent session's thread (prompt rounds, or pre-`prompt` tutor_turn
//     history) and seeds it back into the model context;
//   * a per-curriculum conversation cache keeps the thread across in-app nav;
//   * two hidable panes (progress summary · course outline), device-persisted,
//     rails on desktop and sheets on mobile; an outline selection opens the
//     module content in an overlay; a header switcher changes curriculum.
// Everything below the activeCurriculum resolution (B8) is unchanged spine.

import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useConversationCache, type CachedConversation } from '@/components/ConversationCacheProvider'
import GamificationStrip from '@/components/GamificationStrip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatBubble } from '@/components/ui/chat-bubble'
import { ChatComposer } from '@/components/ui/chat-composer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LessonCard } from '@/components/ui/lesson-card'
import { LessonOutlinePanel } from '@/components/ui/lesson-outline-panel'
import {
  lastUsedCurriculum,
  recordCurriculumUsed,
  resolveActiveCurriculum,
} from '@/lib/activeCurriculum'
import {
  fetchCatalogue,
  fetchContent,
  fetchEnrolments,
  fetchEnrolmentId,
  fetchGamification,
  fetchModules,
  fetchProgress,
  fetchSections,
  fetchTutorPreamble,
  type CatalogueRow,
  type ContentRow,
  type GamificationSummary,
  type ModuleRow,
  type PreambleData,
  type ProgressRow,
  type SectionRow,
} from '@/lib/api'
import { loadEmbedder } from '@/lib/embed'
import { moduleOutline, outlineProgressPct } from '@/lib/gamification'
import { haveTutorKey } from '@/lib/keys'
import { usePersistentBool } from '@/lib/persistentState'
import { retrieve } from '@/lib/retrieval'
import { composeUserTurn, streamTutorReply, type TutorTurn } from '@/lib/tutor'
import {
  fetchColdFill,
  fetchEarlierThread,
  recordPrompt,
  sessionToContinue,
  startTutorSession,
  toRagResult,
  type ChatTurn,
  type ChipSource,
} from '@/lib/transcripts'
import { TUTOR_MODEL, tutorConfigured } from '@/lib/tutorConfig'
import { cn } from '@/lib/utils'

const timeNow = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// The passages a reply is grounded in, as in-stream lesson chips. Reads the
// minimal ChipSource shape, so a re-hydrated round (RagRef refs) chips exactly
// like a live one (RetrievedPoint hits).
function SourceChips({ points }: { points: ChipSource[] }) {
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

// Header curriculum switcher (B9): a native select over the trainee's other
// entitled+enrolled curricula. Selecting one sets last-used and reloads the
// thread for that curriculum (from its own cache).
function CurriculumSwitcher({
  options,
  current,
  onSelect,
}: {
  options: CatalogueRow[]
  current: CatalogueRow
  onSelect: (slug: string) => void
}) {
  return (
    <select
      aria-label="Switch curriculum"
      value={current.slug}
      onChange={(e) => onSelect(e.target.value)}
      className="h-8 rounded-md border border-border bg-background px-2 text-sm font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {options.map((o) => (
        <option key={o.slug} value={o.slug}>
          {o.title}
        </option>
      ))}
    </select>
  )
}

function PaneToggle({
  label,
  hidden,
  onToggle,
  className,
}: {
  label: string
  hidden: boolean
  onToggle: () => void
  className?: string
}) {
  const Icon = hidden ? EyeOff : Eye
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-pressed={!hidden}
      title={`${hidden ? 'Show' : 'Hide'} ${label}`}
      onClick={onToggle}
    >
      <Icon />
      <span className="sr-only">{`${hidden ? 'Show' : 'Hide'} ${label}`}</span>
    </Button>
  )
}

// Left pane body: the outline percent + the engine strip (XP / streak / level).
function ProgressPane({
  outlinePct,
  summary,
  className,
}: {
  outlinePct: number | undefined
  summary: GamificationSummary | null
  className?: string
}) {
  return (
    <aside
      className={cn(
        'flex flex-col gap-3 rounded-(--r-lg) border bg-card p-4 text-card-foreground',
        className,
      )}
    >
      <p className="micro text-muted-foreground">Your progress</p>
      {outlinePct !== undefined && (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs font-semibold">Course outline</span>
            <span className="font-mono text-xs text-muted-foreground">{outlinePct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-(--dur-panel)"
              style={{ width: `${Math.min(100, Math.max(0, outlinePct))}%` }}
            />
          </div>
        </div>
      )}
      {summary ? (
        <GamificationStrip summary={summary} />
      ) : (
        <p className="text-xs text-muted-foreground">
          Your XP and streak appear here once you are signed in.
        </p>
      )}
    </aside>
  )
}

function ModuleSection({ row }: { row: ContentRow }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="micro mb-2 text-primary">{row.section_id ?? 'module overview'}</p>
      {/* Bodies are markdown source; MVP renders them verbatim (as the library view). */}
      <pre className="whitespace-pre-wrap font-sans text-sm">{row.body}</pre>
    </div>
  )
}

// The module-content overlay (B9): the same fetchContent read the library
// serves, over the chat thread — the thread stays mounted underneath.
function ModuleContentOverlay({
  curriculum,
  module,
  onClose,
}: {
  curriculum: CatalogueRow
  module: ModuleRow | null
  onClose: () => void
}) {
  const [content, setContent] = useState<ContentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!module) return
    setContent(null)
    setError(null)
    if (!module.code) {
      setContent([])
      return
    }
    let live = true
    fetchContent(curriculum.id, module.code).then(
      (rows) => live && setContent(rows),
      (e: Error) => live && setError(e.message),
    )
    return () => {
      live = false
    }
  }, [curriculum.id, module])

  return (
    <Dialog open={module !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent side="center">
        <DialogHeader>
          <DialogTitle>{module?.title ?? 'Module'}</DialogTitle>
          <DialogDescription>Course content · {curriculum.title}</DialogDescription>
        </DialogHeader>
        {content === null && !error && (
          <p className="text-sm text-muted-foreground">Loading content…</p>
        )}
        {error && <p className="text-sm text-destructive">Content failed to load: {error}</p>}
        {content?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {curriculum.access
              ? 'This module has no content yet.'
              : 'No content visible — entitlement required.'}
          </p>
        )}
        {content && content.length > 0 && (
          <div className="space-y-3">
            {content.map((s) => (
              <ModuleSection key={s.section_id ?? 'module'} row={s} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function Tutor() {
  const { conversations, getConversation, setConversation } = useConversationCache()
  const [curriculum, setCurriculum] = useState<CatalogueRow | null>(null)
  const [switchable, setSwitchable] = useState<CatalogueRow[]>([])
  const [noEnrolment, setNoEnrolment] = useState(false)
  const [preamble, setPreamble] = useState<PreambleData | null>(null)
  const [preambleReady, setPreambleReady] = useState(false)
  const [streaming, setStreaming] = useState<string | null>(null)
  const [pendingSources, setPendingSources] = useState<ChipSource[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcriptNote, setTranscriptNote] = useState<string | null>(null)
  const [embedNote, setEmbedNote] = useState<string | null>(null)
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [sections, setSections] = useState<SectionRow[]>([])
  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [summary, setSummary] = useState<GamificationSummary | null>(null)
  const [openModule, setOpenModule] = useState<ModuleRow | null>(null)
  const [mobilePane, setMobilePane] = useState<'progress' | 'outline' | null>(null)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  // A prepend ("load earlier") must not yank the reader to the thread's end.
  const skipFollowRef = useRef(false)

  // Device-persisted pane visibility (desktop rails).
  const [progressHidden, setProgressHidden] = usePersistentBool('academy.tutor.pane.progress', false)
  const [outlineHidden, setOutlineHidden] = usePersistentBool('academy.tutor.pane.outline', false)

  const cid = curriculum?.id ?? null
  const convo = cid !== null ? conversations[cid] : undefined
  const turns: ChatTurn[] = convo?.turns ?? []

  // B-12: warm the in-browser embedder while the trainee types their first
  // question (one-time ~25 MB fetch, then Cache-API cached).
  useEffect(() => {
    let live = true
    loadEmbedder((p) => {
      if (!live || p.status === 'done' || !p.file?.endsWith('.onnx')) return
      const pct = p.progress ? ` ${Math.round(p.progress)}%` : ''
      setEmbedNote(`Preparing course-content search — one-time model download (~25 MB)…${pct}`)
    }).then(
      () => live && setEmbedNote(null),
      () =>
        live &&
        setEmbedNote(
          'Course-content search model failed to load — retrieval will retry when you ask a question.',
        ),
    )
    return () => {
      live = false
    }
  }, [])

  // B8: which curriculum, from the activeCurriculum seam. Also records the set
  // of switchable curricula (entitled + enrolled) for the header switcher.
  useEffect(() => {
    Promise.all([fetchCatalogue(), fetchEnrolments()]).then(
      ([catalogue, enrolments]) => {
        const resolved = resolveActiveCurriculum(lastUsedCurriculum(), catalogue, enrolments)
        if (!resolved) {
          setNoEnrolment(true)
          return
        }
        const enrolledIds = new Set(enrolments.map((e) => e.curriculum_id))
        setSwitchable(catalogue.filter((c) => c.access && enrolledIds.has(c.id)))
        recordCurriculumUsed(resolved.slug)
        setCurriculum(resolved)
      },
      (e: Error) => setError(e.message),
    )
  }, [])

  // Preamble per curriculum (resets readiness on a switch so the composer waits).
  useEffect(() => {
    if (!curriculum) return
    setPreamble(null)
    setPreambleReady(false)
    fetchTutorPreamble(curriculum.id).then(
      (p) => {
        setPreamble(p)
        setPreambleReady(true)
      },
      (e: Error) => setError(`Could not load your student context: ${e.message}`),
    )
  }, [curriculum])

  // Outline + engine state (existing read paths, each best-effort).
  useEffect(() => {
    if (!curriculum) return
    fetchModules(curriculum.id).then(setModules, () => setModules([]))
    fetchSections(curriculum.id).then(setSections, () => setSections([]))
    fetchGamification().then(setSummary, () => setSummary(null))
    fetchEnrolmentId(curriculum.id).then(
      (id) =>
        id === null
          ? setProgress([])
          : fetchProgress(id).then(setProgress, () => setProgress([])),
      () => setProgress([]),
    )
  }, [curriculum])

  // Cold-fill: on first open of a curriculum, re-hydrate the most recent
  // session's thread and decide the session boundary (continue if today, else
  // seed a new session with the loaded history). Cached, so it runs once per
  // curriculum and in-app navigation never refetches.
  useEffect(() => {
    if (!curriculum) return
    const id = curriculum.id
    if (getConversation(id)?.loaded) return
    let live = true
    fetchColdFill(id).then(
      (cold) => {
        if (!live) return
        setConversation(id, {
          turns: cold.turns,
          sessionId: sessionToContinue(cold),
          loaded: true,
          olderSessionIds: cold.olderSessionIds,
          oldestStartedAt: cold.oldestStartedAt,
        })
      },
      () => {
        if (live)
          setConversation(id, {
            turns: [],
            sessionId: null,
            loaded: true,
            olderSessionIds: [],
            oldestStartedAt: null,
          })
      },
    )
    return () => {
      live = false
    }
  }, [curriculum, getConversation, setConversation])

  // Follow the conversation as exchanges land.
  useEffect(() => {
    if (skipFollowRef.current) {
      skipFollowRef.current = false
      return
    }
    if (turns.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [turns, streaming])

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

  const setThread = (update: (c: CachedConversation) => CachedConversation) => {
    if (cid === null) return
    const current = getConversation(cid) ?? {
      turns: [],
      sessionId: null,
      loaded: true,
      olderSessionIds: [],
      oldestStartedAt: null,
    }
    setConversation(cid, update(current))
  }

  const switchCurriculum = (slug: string) => {
    if (slug === curriculum.slug) return
    const next = switchable.find((c) => c.slug === slug)
    if (!next) return
    setError(null)
    setTranscriptNote(null)
    setDraft('')
    setStreaming(null)
    setPendingSources(null)
    setOpenModule(null)
    recordCurriculumUsed(next.slug)
    setCurriculum(next)
  }

  const selectModule = (id: string | number) => {
    const m = modules.find((mod) => mod.id === id)
    if (m) setOpenModule(m)
  }

  // The B9 tail: prepend the next older content-bearing session's thread.
  // Earlier rounds join the visible history (and so the model context) exactly
  // as cold-filled ones do.
  const loadEarlier = async () => {
    if (cid === null || loadingEarlier) return
    const current = getConversation(cid)
    if (!current) return
    setLoadingEarlier(true)
    try {
      const page = await fetchEarlierThread(cid, current.olderSessionIds, current.oldestStartedAt)
      skipFollowRef.current = true
      setThread((c) => ({
        ...c,
        turns: [...page.turns, ...c.turns],
        olderSessionIds: page.olderSessionIds,
        oldestStartedAt: page.oldestStartedAt,
      }))
    } catch (e) {
      setTranscriptNote(`Earlier history failed to load: ${String(e)}`)
    } finally {
      setLoadingEarlier(false)
    }
  }

  const send = async () => {
    const question = draft.trim()
    if (!question || busy || cid === null) return
    setBusy(true)
    setError(null)
    setDraft('')
    // Visible-text history (includes any re-hydrated rounds) seeds the model
    // context; only this turn carries its retrieval block (bounded growth).
    const history: TutorTurn[] = turns.map(({ role, text }) => ({ role, text }))
    setThread((c) => ({ ...c, turns: [...c.turns, { role: 'user', text: question, at: timeNow() }] }))
    try {
      const points = await retrieve(cid, question)
      setPendingSources(points)

      // Session opens lazily on the first round (needs the preamble's trainee
      // id; RLS re-checks it). A continued session keeps its id from cold-fill.
      let sid = getConversation(cid)?.sessionId ?? null
      if (sid === null && preamble) {
        try {
          const row = await startTutorSession(preamble.trainee.id, cid, TUTOR_MODEL)
          sid = row.id
          setThread((c) => ({ ...c, sessionId: sid }))
        } catch (e) {
          setTranscriptNote(`Transcript not recording: ${String(e)}`)
        }
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
      setThread((c) => ({
        ...c,
        turns: [
          ...c.turns,
          {
            role: 'assistant',
            text: reply.text,
            at: timeNow(),
            sources: points,
            meta: `${reply.model} · ${points.length} passage${points.length === 1 ? '' : 's'} retrieved · ${reply.inputTokens} in / ${reply.outputTokens} out tokens (your spend)`,
          },
        ],
      }))

      // B9 write: one durable round row per exchange (replaces the two
      // tutor_turn writes). Best-effort — a failed write never breaks the chat.
      if (sid !== null && preamble) {
        recordPrompt({
          sessionId: sid,
          traineeId: preamble.trainee.id,
          curriculumId: cid,
          inputPrompt: question,
          ragResult: toRagResult(points),
          response: reply.text,
          model: reply.model,
          promptTokens: reply.inputTokens,
          completionTokens: reply.outputTokens,
        }).catch((e) => setTranscriptNote(`Transcript write failed: ${String(e)}`))
      }
    } catch (e) {
      setStreaming(null)
      setPendingSources(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const canSwitch =
    switchable.length > 1 && switchable.some((c) => c.slug === curriculum.slug)
  const outline = moduleOutline(modules, sections, progress)
  const outlinePct = outlineProgressPct(outline)
  const outlineItems = outline.map((m) => ({
    id: m.id,
    label: m.label,
    state: m.state,
    meta: m.total > 0 ? `${m.done}/${m.total}` : undefined,
  }))

  const outlinePanel = (className?: string) => (
    <LessonOutlinePanel
      className={className}
      title={curriculum.title}
      subtitle={modules.length > 0 ? `${modules.length} module${modules.length === 1 ? '' : 's'}` : undefined}
      progressPct={outlinePct}
      items={outlineItems}
      onSelect={selectModule}
      selectedId={openModule?.id}
      footer={<Badge variant="secondary">self-attested</Badge>}
    />
  )

  return (
    <div className="space-y-4">
      <div>
        <Link to={`/library/${curriculum.slug}`} className="text-sm underline underline-offset-4">
          ← {curriculum.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Tutor</h1>
          {canSwitch ? (
            <CurriculumSwitcher options={switchable} current={curriculum} onSelect={switchCurriculum} />
          ) : (
            <Badge variant="outline">scoped to {curriculum.slug}</Badge>
          )}
          {/* D-3 trust labelling: client-written transcript, not verified. */}
          <Badge variant="secondary">self-attested transcript</Badge>
          <div className="ml-auto flex items-center gap-1">
            <PaneToggle
              className="hidden lg:inline-flex"
              label="progress pane"
              hidden={progressHidden}
              onToggle={() => setProgressHidden(!progressHidden)}
            />
            <PaneToggle
              className="hidden lg:inline-flex"
              label="outline pane"
              hidden={outlineHidden}
              onToggle={() => setOutlineHidden(!outlineHidden)}
            />
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobilePane('progress')}
            >
              Progress
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobilePane('outline')}
            >
              Outline
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Streams directly from Anthropic on your own key; course material is matched in
          this browser and retrieved from your entitled curricula. Rounds are saved so the
          tutor picks up where you left off.
        </p>
      </div>

      <div className="lg:flex lg:items-start lg:gap-4">
        {!progressHidden && (
          <ProgressPane
            className="mb-4 hidden lg:sticky lg:top-6 lg:mb-0 lg:flex lg:w-60 lg:shrink-0"
            outlinePct={outlinePct}
            summary={summary}
          />
        )}

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-2.5">
            {convo !== undefined &&
              (convo.olderSessionIds.length > 0 || convo.oldestStartedAt !== null) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-center text-muted-foreground"
                  disabled={loadingEarlier}
                  onClick={loadEarlier}
                >
                  {loadingEarlier ? 'Loading earlier rounds…' : 'Load earlier rounds'}
                </Button>
              )}
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
                {pendingSources && pendingSources.length > 0 && <SourceChips points={pendingSources} />}
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

        {!outlineHidden && outlinePanel('mb-4 hidden lg:sticky lg:top-6 lg:mb-0 lg:flex lg:w-72 lg:shrink-0')}
      </div>

      {/* Mobile: the panes as bottom sheets. */}
      <Dialog open={mobilePane !== null} onOpenChange={(open) => !open && setMobilePane(null)}>
        <DialogContent side="bottom" className="lg:hidden">
          <DialogHeader>
            <DialogTitle>{mobilePane === 'progress' ? 'Your progress' : 'Course outline'}</DialogTitle>
            <DialogDescription>{curriculum.title}</DialogDescription>
          </DialogHeader>
          {mobilePane === 'progress' ? (
            <ProgressPane outlinePct={outlinePct} summary={summary} className="border-0 p-0" />
          ) : (
            outlinePanel()
          )}
        </DialogContent>
      </Dialog>

      <ModuleContentOverlay curriculum={curriculum} module={openModule} onClose={() => setOpenModule(null)} />
    </div>
  )
}
