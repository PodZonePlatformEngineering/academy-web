// Tutor chat panel (T-040 Task 2/3): scoped retrieval → streamed browser-direct
// Claude → transcript rows, per turn. UI is deliberately minimal (MVP);
// the streaming + scoping + transcript spine is the product.

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  fetchCatalogue,
  fetchTutorPreamble,
  type CatalogueRow,
  type PreambleData,
} from '@/lib/api'
import { loadEmbedder } from '@/lib/embed'
import { haveTutorKey } from '@/lib/keys'
import { retrieve } from '@/lib/retrieval'
import { composeUserTurn, streamTutorReply, type TutorTurn } from '@/lib/tutor'
import { recordTurn, startTutorSession } from '@/lib/transcripts'
import { TUTOR_MODEL, tutorConfigured } from '@/lib/tutorConfig'

interface ChatTurn extends TutorTurn {
  meta?: string
}

export default function Tutor() {
  const { slug } = useParams()
  const seeded = (useLocation().state as { curriculum?: CatalogueRow } | null)?.curriculum
  const [curriculum, setCurriculum] = useState<CatalogueRow | null>(seeded ?? null)
  const [preamble, setPreamble] = useState<PreambleData | null>(null)
  const [preambleReady, setPreambleReady] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [streaming, setStreaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcriptNote, setTranscriptNote] = useState<string | null>(null)
  const [embedNote, setEmbedNote] = useState<string | null>(null)
  const sessionIdRef = useRef<number | null>(null)

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

  useEffect(() => {
    if (curriculum) return
    fetchCatalogue().then(
      (rows) => setCurriculum(rows.find((c) => c.slug === slug) ?? null),
      (e: Error) => setError(e.message),
    )
  }, [curriculum, slug])

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
            <Link to="/keys" className="underline underline-offset-4">
              Your keys
            </Link>{' '}
            first.
          </CardDescription>
        </CardHeader>
      </Card>
    )
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
    setTurns((t) => [...t, { role: 'user', text: question }])
    try {
      // Retrieval first — in-browser embed, then rag_search under RLS (B-12):
      // scope is the active curriculum; entitlement yields rows or nothing.
      const points = await retrieve(curriculum.id, question)

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
      setTurns((t) => [
        ...t,
        {
          role: 'assistant',
          text: reply.text,
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
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link to={`/curriculum/${curriculum.slug}`} className="text-sm underline underline-offset-4">
          ← {curriculum.title}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-xl font-semibold">Tutor</h1>
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

      {embedNote && <p className="text-sm text-muted-foreground">{embedNote}</p>}
      {transcriptNote && <p className="text-sm text-destructive">{transcriptNote}</p>}

      <div className="space-y-3">
        {turns.map((t, i) => (
          <div key={i} className={`rounded-md border p-3 ${t.role === 'user' ? 'bg-muted/30' : ''}`}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {t.role === 'user' ? 'You' : 'Tutor'}
            </p>
            <pre className="whitespace-pre-wrap font-sans text-sm">{t.text}</pre>
            {t.meta && <p className="mt-2 text-xs text-muted-foreground">{t.meta}</p>}
          </div>
        ))}
        {streaming !== null && (
          <div className="rounded-md border p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Tutor</p>
            <pre className="whitespace-pre-wrap font-sans text-sm">{streaming || '…'}</pre>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-start gap-2">
        <textarea
          className="min-h-20 w-full rounded-md border bg-background p-3 text-sm"
          placeholder={`Ask about ${curriculum.title}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <Button onClick={() => void send()} disabled={busy || !draft.trim() || !preambleReady}>
          {busy ? 'Thinking…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
