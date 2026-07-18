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
import { TUTOR_MODEL } from '@/lib/tutorConfig'

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

export interface TutorTurn {
  role: 'user' | 'assistant'
  text: string
}

/** System prompt = versioned constant + the per-session student context. */
export function composeSystem(preamble: PreambleData | null): string {
  if (!preamble) return TUTOR_SYSTEM_PROMPT_V1
  return (
    TUTOR_SYSTEM_PROMPT_V1 +
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
}

/**
 * Stream one tutor reply. `history` is prior visible turns (oldest first);
 * `userContent` is the composed current turn. Deltas arrive via onDelta;
 * resolves with the full text + the API's own token counts (D-3).
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
    max_tokens: 2048,
    system: composeSystem(preamble),
    messages: [
      ...history.map((t) => ({ role: t.role, content: t.text })),
      { role: 'user' as const, content: userContent },
    ],
  })
  stream.on('text', onDelta)
  const final = await stream.finalMessage()
  const text = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return {
    text,
    model: final.model,
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  }
}
