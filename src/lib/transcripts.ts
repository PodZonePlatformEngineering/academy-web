// Round persistence + cold-fill (T-048 B9, D-3): the tutor's durable memory.
//
// B9 replaces the tutor_turn WRITE path with one `prompt` row per completed
// round (question → retrieval → reply), written through the Data API under RLS
// (academy-admin migration 020). RLS means the JWT-resolved trainee can only
// insert rounds tagged with their own trainee_id — the client supplies it but
// the WITH CHECK policy is the gate. `rag_result` carries retrieval REFS +
// SCORES only (Q-2), never passage text — the bodies stay in the RLS-gated
// curriculum_point store and are re-fetched on demand.
//
// `tutor_turn` writes STOP here, but the table (and recordTurn) are kept: its
// operator-reviewed rows are the pre-`prompt` cold-fill history. On a cold
// mount the most recent session's thread is re-hydrated from `prompt` rows
// where they exist and from `tutor_turn` for pre-`prompt` sessions, rendered
// as bubbles + source chips and re-seeded into the model history as visible
// text only (the bounded-growth rule in tutor.ts is unchanged — old retrieval
// blocks stay dropped). Everything here is self-attested (D-3).

import { demoMode, get, post } from '@/lib/api'
import type { RetrievedPoint } from '@/lib/retrieval'

export interface TutorSessionRow {
  id: number
  trainee_id: number
  curriculum_id: number | null
  model: string | null
  started_at: string
  ended_at: string | null
}

export interface TutorTurnRow {
  id: number
  tutor_session_id: number
  role: 'user' | 'assistant' | 'system'
  text: string
  prompt_tokens: number | null
  completion_tokens: number | null
  created_at: string
}

// One retrieval hit as stored on a round: refs + score, no passage text (Q-2).
// point_id is reserved — rag_search (migration 017) does not emit it yet, so
// the label fields (module/section/title) are what re-render the chips today.
export interface RagRef {
  point_id: string | null
  module_id: string | null
  section_id: string | null
  title: string | null
  score: number
}

export interface PromptRow {
  id: number
  tutor_session_id: number
  curriculum_id: number | null
  created_at: string
  input_prompt: string
  rag_result: RagRef[]
  response: string | null
  model: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
}

// The minimal shape the in-stream source chips read — satisfied by both a live
// RetrievedPoint and a stored RagRef, so a loaded round chips exactly like a
// live one.
export interface ChipSource {
  score: number
  type?: string | null
  module_id: string | null
  section_id: string | null
  title: string | null
}

// A rendered conversation turn (one chat bubble). Shared by the live stream
// and the cold-fill re-hydration so both render through the same path.
export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
  /** Local time label under the bubble. */
  at?: string
  /** Model / passages / token meta line (assistant turns). */
  meta?: string
  /** Retrieval hits shown as chips above an assistant turn. */
  sources?: ChipSource[]
}

/** Refs + scores for the round store, built from a turn's retrieval hits. */
export function toRagResult(points: RetrievedPoint[]): RagRef[] {
  return points.map((p) => ({
    point_id: null,
    module_id: p.module_id,
    section_id: p.section_id,
    title: p.title,
    score: p.score,
  }))
}

// --- Writes ----------------------------------------------------------------

/** Open a transcript session; returns the created row (RLS-checked). */
export async function startTutorSession(
  traineeId: number,
  curriculumId: number,
  model: string,
): Promise<TutorSessionRow> {
  const rows = await post<TutorSessionRow[]>('/tutor_session', {
    trainee_id: traineeId,
    curriculum_id: curriculumId,
    model,
  })
  return rows[0]
}

export interface PromptRoundInput {
  sessionId: number
  traineeId: number
  curriculumId: number
  inputPrompt: string
  ragResult: RagRef[]
  response: string
  model: string
  promptTokens: number | null
  completionTokens: number | null
}

/**
 * Persist one completed round (B9 write path — replaces the two recordTurn
 * calls). RLS re-checks trainee_id server-side.
 */
export async function recordPrompt(round: PromptRoundInput): Promise<PromptRow> {
  const rows = await post<PromptRow[]>('/prompt', {
    tutor_session_id: round.sessionId,
    trainee_id: round.traineeId,
    curriculum_id: round.curriculumId,
    input_prompt: round.inputPrompt,
    rag_result: round.ragResult,
    response: round.response,
    model: round.model,
    prompt_tokens: round.promptTokens,
    completion_tokens: round.completionTokens,
  })
  return rows[0]
}

/**
 * Legacy per-turn write, KEPT for the read path only — the B9 write path is
 * recordPrompt. `tutor_turn` still backs the pre-`prompt` cold-fill history.
 */
export async function recordTurn(
  sessionId: number,
  role: 'user' | 'assistant',
  text: string,
  promptTokens: number | null = null,
  completionTokens: number | null = null,
): Promise<TutorTurnRow> {
  const rows = await post<TutorTurnRow[]>('/tutor_turn', {
    tutor_session_id: sessionId,
    role,
    text,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
  })
  return rows[0]
}

// --- Cold-fill reads -------------------------------------------------------

// How many recent sessions to scan for the first content-bearing one (an
// opened-but-abandoned session carries no rounds). MVP loads that one session;
// "load earlier" paging over older sessions is the deferred B9 tail.
const COLD_FILL_SESSION_SCAN = 8

const PROMPT_SELECT =
  'id,tutor_session_id,curriculum_id,created_at,input_prompt,rag_result,' +
  'response,model,prompt_tokens,completion_tokens'
const TURN_SELECT = 'id,tutor_session_id,role,text,prompt_tokens,completion_tokens,created_at'

/** The caller's recent sessions for a curriculum, newest first (RLS: own). */
export async function fetchRecentSessions(
  curriculumId: number,
  limit = COLD_FILL_SESSION_SCAN,
): Promise<TutorSessionRow[]> {
  return get<TutorSessionRow[]>(
    `/tutor_session?curriculum_id=eq.${curriculumId}&order=started_at.desc&limit=${limit}` +
      '&select=id,trainee_id,curriculum_id,model,started_at,ended_at',
  )
}

/** The rounds of one session, oldest first (RLS: own). */
export async function fetchPromptRounds(sessionId: number): Promise<PromptRow[]> {
  return get<PromptRow[]>(
    `/prompt?tutor_session_id=eq.${sessionId}&order=created_at.asc&select=${PROMPT_SELECT}`,
  )
}

/** The pre-`prompt` turns of one session, oldest first (RLS: own). */
export async function fetchSessionTurns(sessionId: number): Promise<TutorTurnRow[]> {
  return get<TutorTurnRow[]>(
    `/tutor_turn?tutor_session_id=eq.${sessionId}&order=created_at.asc,id.asc&select=${TURN_SELECT}`,
  )
}

export interface ColdFill {
  /** The session whose thread was loaded, or null when there is none. */
  sessionId: number | null
  /** started_at of that session — drives the today/new-session boundary. */
  startedAt: string | null
  /** The re-hydrated thread, oldest first. */
  turns: ChatTurn[]
}

/**
 * Re-hydrate the most recent content-bearing session for a curriculum. Prefers
 * `prompt` rounds; falls back to pre-`prompt` `tutor_turn` history. MVP loads
 * exactly one session (the deferred tail pages older ones).
 */
export async function fetchColdFill(curriculumId: number): Promise<ColdFill> {
  const empty: ColdFill = { sessionId: null, startedAt: null, turns: [] }
  if (demoMode) return empty
  const sessions = await fetchRecentSessions(curriculumId)
  for (const s of sessions) {
    const rounds = await fetchPromptRounds(s.id)
    if (rounds.length > 0) {
      return { sessionId: s.id, startedAt: s.started_at, turns: rounds.flatMap(roundToTurns) }
    }
    const turns = await fetchSessionTurns(s.id)
    const rendered = turnRowsToTurns(turns)
    if (rendered.length > 0) {
      return { sessionId: s.id, startedAt: s.started_at, turns: rendered }
    }
  }
  return empty
}

// --- Pure row → bubble transforms (unit-tested; no I/O) --------------------

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** The assistant meta line for a loaded round — mirrors the live stream's. */
export function roundMeta(round: PromptRow): string {
  const n = round.rag_result.length
  const parts = [round.model ?? undefined, `${n} passage${n === 1 ? '' : 's'} retrieved`]
  if (round.prompt_tokens != null || round.completion_tokens != null) {
    parts.push(`${round.prompt_tokens ?? 0} in / ${round.completion_tokens ?? 0} out tokens (your spend)`)
  }
  return parts.filter(Boolean).join(' · ')
}

/** One stored round → its user + assistant bubbles. */
export function roundToTurns(round: PromptRow): ChatTurn[] {
  const at = fmtTime(round.created_at)
  const turns: ChatTurn[] = [{ role: 'user', text: round.input_prompt, at }]
  if (round.response != null) {
    turns.push({
      role: 'assistant',
      text: round.response,
      at,
      meta: roundMeta(round),
      sources: round.rag_result,
    })
  }
  return turns
}

/** Pre-`prompt` turn rows → bubbles (old retrieval blocks stay dropped). */
export function turnRowsToTurns(rows: TutorTurnRow[]): ChatTurn[] {
  return rows
    .filter((r): r is TutorTurnRow & { role: 'user' | 'assistant' } =>
      r.role === 'user' || r.role === 'assistant')
    .map((r) => ({ role: r.role, text: r.text, at: fmtTime(r.created_at) }))
}

/** The local calendar date of an ISO timestamp (YYYY-MM-DD). */
export function localDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : toLocalDay(d)
}

function toLocalDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Session boundary (brief): continue the loaded session only when it started
 * today (local), else the loaded thread is display-continuity for a NEW
 * session opened on the next question — honest transcript boundaries.
 */
export function sessionToContinue(cold: ColdFill, now: Date = new Date()): number | null {
  if (cold.sessionId === null || !cold.startedAt) return null
  return localDate(cold.startedAt) === toLocalDay(now) ? cold.sessionId : null
}
