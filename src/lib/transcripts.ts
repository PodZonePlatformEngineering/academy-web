// Transcript capture (T-040 Task 3, D-3): tutor_session / tutor_turn rows
// written through the Data API under RLS as the conversation proceeds.
//
// RLS (migration 008) means the JWT-resolved trainee can only insert sessions
// for themselves and turns into their own sessions — the client supplies
// trainee_id but the WITH CHECK policy is the gate. Token counts come from
// the Messages API response per assistant turn; user turns carry none.
// Everything written here is self-attested (D-3) and displayed as such; no
// grading, no claims writes (D-10 — progress capture is B4/T-042).

import { post } from '@/lib/api'

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

/** Record one turn with the API-reported token counts (assistant turns). */
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
