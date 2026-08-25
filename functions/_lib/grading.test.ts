// Regression test for ACP-420 (academy-frontend#94): Qdrant's scroll API has
// no guaranteed point ordering, so listAssessmentQuestions() must sort by the
// payload's own `ordinal` field before returning — otherwise questions can
// render out of order in both academy-web and academy-frontend, which both
// consume this same shared backend function.

import { describe, expect, it, vi } from 'vitest'
import { listAssessmentQuestions } from './grading'

function mockScrollResponse(points: Array<{ id: string; ordinal: number | null }>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        result: {
          points: points.map((p) => ({ id: p.id, payload: { ordinal: p.ordinal } })),
          next_page_offset: null,
        },
      }),
    })),
  )
}

describe('listAssessmentQuestions', () => {
  it('returns questions sorted ordinal-ascending, regardless of scroll order', async () => {
    mockScrollResponse([
      { id: 'q5', ordinal: 5 },
      { id: 'q1', ordinal: 1 },
      { id: 'q3', ordinal: 3 },
      { id: 'q2', ordinal: 2 },
      { id: 'q4', ordinal: 4 },
    ])
    const questions = await listAssessmentQuestions('key', 'code-ai', 'M1', 'assessment')
    expect(questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5'])
  })

  it('sorts a null/missing ordinal last rather than coercing it to the front', async () => {
    mockScrollResponse([
      { id: 'q2', ordinal: 2 },
      { id: 'qNull', ordinal: null },
      { id: 'q1', ordinal: 1 },
    ])
    const questions = await listAssessmentQuestions('key', 'code-ai', 'M1', 'assessment')
    expect(questions.map((q) => q.id)).toEqual(['q1', 'q2', 'qNull'])
  })
})
