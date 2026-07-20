import { describe, expect, it } from 'vitest'
import type { RetrievedPoint } from '@/lib/retrieval'
import {
  roundMeta,
  roundToTurns,
  sessionToContinue,
  toRagResult,
  turnRowsToTurns,
  type PromptRow,
  type TutorTurnRow,
} from '@/lib/transcripts'

const point = (over: Partial<RetrievedPoint> = {}): RetrievedPoint => ({
  score: 0.8,
  type: 'section',
  module_id: 'M2',
  section_id: '01',
  title: 'Context Windows',
  text: 'the passage body',
  ...over,
})

const round = (over: Partial<PromptRow> = {}): PromptRow => ({
  id: 1,
  tutor_session_id: 7,
  curriculum_id: 1,
  created_at: '2026-07-20T09:30:00Z',
  input_prompt: 'what is a context window?',
  rag_result: [
    { point_id: null, module_id: 'M2', section_id: '01', title: 'Context Windows', score: 0.83 },
  ],
  response: 'A context window is…',
  model: 'claude-opus-4-8',
  prompt_tokens: 120,
  completion_tokens: 240,
  ...over,
})

describe('toRagResult', () => {
  it('keeps refs + score and reserves point_id (rag_search emits none yet)', () => {
    expect(toRagResult([point()])).toEqual([
      { point_id: null, module_id: 'M2', section_id: '01', title: 'Context Windows', score: 0.8 },
    ])
  })
  it('stores no passage text (Q-2)', () => {
    const refs = toRagResult([point()])
    expect(JSON.stringify(refs)).not.toContain('the passage body')
  })
})

describe('roundToTurns', () => {
  it('expands a round into a user then assistant bubble, chips from rag_result', () => {
    const turns = roundToTurns(round())
    expect(turns.map((t) => t.role)).toEqual(['user', 'assistant'])
    expect(turns[0].text).toBe('what is a context window?')
    expect(turns[1].text).toBe('A context window is…')
    expect(turns[1].sources).toHaveLength(1)
  })
  it('drops the assistant bubble when the round never got a response', () => {
    const turns = roundToTurns(round({ response: null }))
    expect(turns.map((t) => t.role)).toEqual(['user'])
  })
})

describe('roundMeta', () => {
  it('mirrors the live meta line (model · passages · token spend)', () => {
    expect(roundMeta(round())).toBe(
      'claude-opus-4-8 · 1 passage retrieved · 120 in / 240 out tokens (your spend)',
    )
  })
  it('omits the token clause when a round carried no counts', () => {
    expect(roundMeta(round({ prompt_tokens: null, completion_tokens: null }))).toBe(
      'claude-opus-4-8 · 1 passage retrieved',
    )
  })
})

describe('turnRowsToTurns', () => {
  const turn = (over: Partial<TutorTurnRow>): TutorTurnRow => ({
    id: 1,
    tutor_session_id: 3,
    role: 'user',
    text: 'hi',
    prompt_tokens: null,
    completion_tokens: null,
    created_at: '2026-07-19T10:00:00Z',
    ...over,
  })
  it('renders pre-`prompt` user/assistant turns with no source chips', () => {
    const rows = [turn({ role: 'user', text: 'q' }), turn({ role: 'assistant', text: 'a' })]
    const turns = turnRowsToTurns(rows)
    expect(turns.map((t) => t.role)).toEqual(['user', 'assistant'])
    expect(turns.every((t) => t.sources === undefined)).toBe(true)
  })
  it('ignores system rows', () => {
    expect(turnRowsToTurns([turn({ role: 'system', text: 'sys' })])).toEqual([])
  })
})

describe('sessionToContinue', () => {
  const base = new Date('2026-07-20T12:00:00Z')
  it('continues a session that started today', () => {
    const cold = { sessionId: 42, startedAt: base.toISOString(), turns: [] }
    expect(sessionToContinue(cold, base)).toBe(42)
  })
  it('opens a new session when the latest loaded session is from another day', () => {
    const cold = { sessionId: 42, startedAt: base.toISOString(), turns: [] }
    const twoDaysOn = new Date(base.getTime() + 2 * 86_400_000)
    expect(sessionToContinue(cold, twoDaysOn)).toBeNull()
  })
  it('is null when nothing was loaded', () => {
    expect(sessionToContinue({ sessionId: null, startedAt: null })).toBeNull()
  })
})
