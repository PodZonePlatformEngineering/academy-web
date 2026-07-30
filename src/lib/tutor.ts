// LLM plane (U-5, D-2): browser-direct Claude with the trainee's own key.
//
// SSE streaming via the official SDK; dangerouslyAllowBrowser sets the
// anthropic-dangerous-direct-browser-access CORS opt-in header. The key never
// touches platform services — browser → api.anthropic.com only.
//
// Context assembly (T-001 §6.2, trimmed to schema v1): the student-context
// preamble loads once per session into the system prompt; course-content
// retrieval runs per turn and rides in that turn's user message. History is
// re-sent as the visible turn texts only (old retrieval blocks are dropped) —
// bounded token growth on the trainee's own spend.

import Anthropic from '@anthropic-ai/sdk'
import type { PreambleData } from '@/lib/api'
import { getKey } from '@/lib/keys'
import type { RetrievedPoint } from '@/lib/retrieval'
import { TUTOR_MAX_TOKENS, TUTOR_MODEL, TUTOR_THINKING_EFFORT } from '@/lib/tutorConfig'

// Versioned constant — prompt iteration is post-MVP; bump the suffix, never
// edit in place. Seeded from the T-001 §9.3 Socratic qualification criteria
// (conceptual depth / learning arc / transferable principles) and §9.4 scope
// rule; D-10: progress-only, the tutor never grades or certifies.
export const TUTOR_SYSTEM_PROMPT_V1 = `You are Alex, the PodZone Academy tutor for the student's active curriculum.

Teach Socratically:
- Open "why" questions and guided reasoning over answer delivery — help the student reason from misconception to understanding rather than handing them conclusions (learning arc).
- Prefer conceptual depth: connect the student's question to the underlying principle, not just the immediate fact (conceptual depth).
- Draw out principles that transfer beyond the example at hand (transferable principles).
- Adapt to the student context you are given: their progress, current module, and what they have already completed. Reference earlier modules when they connect.

Scope:
- Stay within the active curriculum. Course material retrieved for this turn appears in <retrieved_context> blocks — ground your teaching in it and cite the module/section you are drawing on.
- If the retrieved material does not cover the question, say so and guide the student to the nearest covered concept; do not invent course content.

Boundaries:
- You do not grade, score, or certify anything. If asked for a grade or a pass/fail judgement, decline and redirect to reflection on the material.
- Keep answers focused; end most turns with one question that moves the student's thinking forward.`

// V2 — bumped (never edited in place) to add an explicit concision budget.
// Rationale (T-115, measured 2026-07-30): visible answers average ~1,474 tokens
// and hit the ceiling on 25% of live turns; V1's only length guidance was the
// single clause "Keep answers focused". A complete short answer beats a
// truncated long one, and concision is better Socratic form — one load-bearing
// question does more than a lecture. Only the answer-length guidance changed;
// the pedagogy, scope, and boundaries are byte-identical to V1.
export const TUTOR_SYSTEM_PROMPT_V2 = `You are Alex, the PodZone Academy tutor for the student's active curriculum.

Teach Socratically:
- Open "why" questions and guided reasoning over answer delivery — help the student reason from misconception to understanding rather than handing them conclusions (learning arc).
- Prefer conceptual depth: connect the student's question to the underlying principle, not just the immediate fact (conceptual depth).
- Draw out principles that transfer beyond the example at hand (transferable principles).
- Adapt to the student context you are given: their progress, current module, and what they have already completed. Reference earlier modules when they connect.

Scope:
- Stay within the active curriculum. Course material retrieved for this turn appears in <retrieved_context> blocks — ground your teaching in it and cite the module/section you are drawing on.
- If the retrieved material does not cover the question, say so and guide the student to the nearest covered concept; do not invent course content.

Boundaries:
- You do not grade, score, or certify anything. If asked for a grade or a pass/fail judgement, decline and redirect to reflection on the material.

Answer length:
- Be concise. Aim for a few short paragraphs — a focused answer the student will actually read, not an exhaustive lecture. Prefer the one insight that unblocks them over covering everything.
- End most turns with a single question that moves the student's thinking forward. One good question does more Socratic work than a long explanation.`

// Live system prompt — the concision-budgeted V2 (T-115).
export const TUTOR_SYSTEM_PROMPT = TUTOR_SYSTEM_PROMPT_V2

export interface TutorTurn {
  role: 'user' | 'assistant'
  text: string
}

/** System prompt = versioned constant + the per-session student context. */
export function composeSystem(preamble: PreambleData | null): string {
  if (!preamble) return TUTOR_SYSTEM_PROMPT
  return (
    TUTOR_SYSTEM_PROMPT +
    '\n\n<student_context>\n' +
    JSON.stringify(preamble, null, 1) +
    '\n</student_context>'
  )
}

/** Current user turn = this turn's retrieval hits + the question. */
export function composeUserTurn(question: string, points: RetrievedPoint[]): string {
  if (points.length === 0) {
    return `<retrieved_context>\n(no course material matched this question)\n</retrieved_context>\n\n${question}`
  }
  const blocks = points
    .map((p) => {
      const where = [p.module_id, p.section_id].filter(Boolean).join('/')
      const head = [p.type, where, p.title].filter(Boolean).join(' · ')
      return `--- ${head}\n${p.text}`
    })
    .join('\n\n')
  return `<retrieved_context>\n${blocks}\n</retrieved_context>\n\n${question}`
}

export interface TutorReply {
  text: string
  model: string
  inputTokens: number
  outputTokens: number
  // T-114: cache accounting. On the trainee's own key — a write on the first
  // turn, a read on later turns as the system+history prefix is reused.
  cacheCreationTokens: number
  cacheReadTokens: number
  // T-115: null unless the API cut the answer short (`max_tokens`), so the UI
  // and the persisted record can both tell a truncated answer from a finished
  // one instead of it being silent.
  stopReason: string | null
  truncated: boolean
}

// T-114: the system block and the most-recent history block each carry a 1-hour
// ephemeral breakpoint. The 1h TTL (not the 5-min default) is set from the live
// inter-turn gap distribution — median 6.2 min, ~90% of turns land inside 1h.
const CACHE_1H = { type: 'ephemeral' as const, ttl: '1h' as const }

/**
 * System as an array of text blocks so it can carry `cache_control`. The WHOLE
 * block is cached (constant + <student_context>), not just the constant — the
 * constant alone is ~330 tokens, under Sonnet 5's 1,024-token cacheable floor,
 * so a breakpoint on it would silently no-op (Trap 2). <student_context> pushes
 * the composed block over the floor and correctly invalidates when progress
 * changes. Brand-new trainees with almost no progress may fall under the floor
 * and stay uncached on turns 1–2; the history breakpoint covers them once the
 * conversation accumulates — no padding is added to force it.
 */
export function composeSystemBlocks(
  preamble: PreambleData | null,
): Anthropic.TextBlockParam[] {
  return [{ type: 'text', text: composeSystem(preamble), cache_control: CACHE_1H }]
}

/**
 * History as message params, with a cache breakpoint on the LAST block of the
 * most-recent prior turn so every request reuses the whole conversation prefix
 * (where input volume actually lives — it grows within a session). The current
 * user turn is never cached: it carries this turn's <retrieved_context>, which
 * is fresh per turn by design and must stay uncacheable (do not move retrieval
 * into the system prompt — that would invalidate the cache every turn).
 */
export function composeMessages(
  history: TutorTurn[],
  userContent: string,
): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = history.map((t, i) => {
    const isLast = i === history.length - 1
    return {
      role: t.role,
      content: isLast
        ? [{ type: 'text', text: t.text, cache_control: CACHE_1H }]
        : t.text,
    }
  })
  msgs.push({ role: 'user', content: userContent })
  return msgs
}

/**
 * Stream one tutor reply. `history` is prior visible turns (oldest first);
 * `userContent` is the composed current turn. Deltas arrive via onDelta;
 * resolves with the full text + the API's own token counts (D-3), cache
 * accounting, and the stop reason.
 *
 * Posture (T-115, measured 2026-07-30): Sonnet 5 runs ADAPTIVE thinking when
 * `thinking` is omitted, and `max_tokens` caps thinking + visible together — a
 * 2048 cap was fully consumed by thinking on hard turns, 0 visible tokens. We
 * keep adaptive thinking on (richer Socratic reasoning on the trainee's own
 * key) but bound it with `output_config.effort` and raise `max_tokens`, both
 * configurable. Not disabled: adaptive gives better guided reasoning, and the
 * disabled-mode failure modes (tool-call-as-text, `<thinking>` leakage) don't
 * apply here anyway — the tutor uses no tools. Streaming means the non-stream
 * SDK timeout that caps large `max_tokens` does not apply.
 */
export async function streamTutorReply(
  history: TutorTurn[],
  userContent: string,
  preamble: PreambleData | null,
  onDelta: (text: string) => void,
): Promise<TutorReply> {
  const key = getKey('anthropic')
  if (!key) throw new Error('No Anthropic key — enter one under "Your keys".')

  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true })
  const stream = client.messages.stream({
    model: TUTOR_MODEL,
    max_tokens: TUTOR_MAX_TOKENS,
    thinking: { type: 'adaptive' },
    output_config: { effort: TUTOR_THINKING_EFFORT as Anthropic.OutputConfig['effort'] },
    system: composeSystemBlocks(preamble),
    messages: composeMessages(history, userContent),
  })
  stream.on('text', onDelta)
  const final = await stream.finalMessage()
  const text = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const stopReason = final.stop_reason
  return {
    text,
    model: final.model,
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
    cacheCreationTokens: final.usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: final.usage.cache_read_input_tokens ?? 0,
    stopReason,
    truncated: stopReason === 'max_tokens',
  }
}
