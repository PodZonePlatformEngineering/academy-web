// Offline tests for the tutor client modules — pure logic only (no network,
// no browser storage): scope mapping, context composition, key masking.

import { describe, expect, it } from 'vitest'
import { maskKey } from '@/lib/keys'
import type { RetrievedPoint } from '@/lib/retrieval'
import {
  composeMessages,
  composeSystem,
  composeSystemBlocks,
  composeUserTurn,
  TUTOR_SYSTEM_PROMPT,
  type TutorTurn,
} from '@/lib/tutor'
import type { PreambleData } from '@/lib/api'

describe('composeSystem', () => {
  const preamble: PreambleData = {
    trainee: { id: 7, display_name: 'Test Trainee', email: 't@example.com' },
    active_curriculum: {
      id: 1,
      slug: 'prompt-engineering',
      title: 'Prompt Engineering',
      description: null,
      entitled: true,
    },
    enrolments: [],
    progress: [],
    generated_at: '2026-07-18T00:00:00Z',
  }

  it('is the bare versioned prompt without a preamble', () => {
    expect(composeSystem(null)).toBe(TUTOR_SYSTEM_PROMPT)
  })

  it('appends the student context after the versioned prompt', () => {
    const sys = composeSystem(preamble)
    expect(sys.startsWith(TUTOR_SYSTEM_PROMPT)).toBe(true)
    expect(sys).toContain('<student_context>')
    expect(sys).toContain('"display_name": "Test Trainee"')
  })

  // T-115: the live prompt (V2) carries an explicit concision budget so answers
  // stop overrunning the output cap. Guards against a silent revert to V1.
  it('carries an answer-length budget', () => {
    expect(TUTOR_SYSTEM_PROMPT).toContain('Answer length:')
    expect(TUTOR_SYSTEM_PROMPT).toContain('Be concise')
  })
})

// T-114 request shape — asserted structurally so a refactor can't silently
// revert the system to a plain string or drop a cache breakpoint.
describe('composeSystemBlocks (cacheable system, Task 2)', () => {
  const preamble: PreambleData = {
    trainee: { id: 7, display_name: 'Test Trainee', email: 't@example.com' },
    active_curriculum: {
      id: 1,
      slug: 'prompt-engineering',
      title: 'Prompt Engineering',
      description: null,
      entitled: true,
    },
    enrolments: [],
    progress: [],
    generated_at: '2026-07-18T00:00:00Z',
  }

  it('is an array of text blocks, not a plain string', () => {
    const blocks = composeSystemBlocks(preamble)
    expect(Array.isArray(blocks)).toBe(true)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('text')
  })

  it('caches the WHOLE system block with a 1-hour ephemeral breakpoint', () => {
    const [block] = composeSystemBlocks(preamble)
    // Whole block = constant + <student_context>, so it clears the 1,024-token
    // cacheable floor the constant alone (~330 tok) would silently miss (Trap 2).
    expect(block.text).toContain('<student_context>')
    expect(block.cache_control).toEqual({ type: 'ephemeral', ttl: '1h' })
  })
})

describe('composeMessages (multi-turn breakpoint, Task 2)', () => {
  const history: TutorTurn[] = [
    { role: 'user', text: 'Q1' },
    { role: 'assistant', text: 'A1' },
    { role: 'user', text: 'Q2' },
    { role: 'assistant', text: 'A2' },
  ]
  const current = '<retrieved_context>…</retrieved_context>\n\nQ3'

  it('puts a 1h breakpoint on the LAST prior turn and nowhere else in history', () => {
    const msgs = composeMessages(history, current)
    // history turns + the current user turn
    expect(msgs).toHaveLength(history.length + 1)
    // Only the last history block is a cached content array; earlier turns are
    // bare strings (no breakpoint).
    history.forEach((_, i) => {
      const content = msgs[i].content
      if (i === history.length - 1) {
        expect(Array.isArray(content)).toBe(true)
        const block = (content as { cache_control?: unknown }[])[0]
        expect(block.cache_control).toEqual({ type: 'ephemeral', ttl: '1h' })
      } else {
        expect(typeof content).toBe('string')
      }
    })
  })

  it('keeps the current user turn last and UNcached (fresh RAG rides here)', () => {
    const msgs = composeMessages(history, current)
    const last = msgs[msgs.length - 1]
    expect(last.role).toBe('user')
    expect(last.content).toBe(current)
    // A plain string carries no cache_control — retrieval must stay volatile.
    expect(typeof last.content).toBe('string')
  })

  it('adds no history breakpoint on the very first turn', () => {
    const msgs = composeMessages([], current)
    expect(msgs).toHaveLength(1)
    expect(msgs[0].content).toBe(current)
  })
})

describe('composeUserTurn', () => {
  const point: RetrievedPoint = {
    score: 0.9,
    type: 'section',
    module_id: 'M1',
    section_id: '02',
    title: 'Context windows',
    text: 'A context window is…',
  }

  it('wraps retrieval hits and keeps the question last', () => {
    const turn = composeUserTurn('What is a context window?', [point])
    expect(turn).toContain('<retrieved_context>')
    expect(turn).toContain('section · M1/02 · Context windows')
    expect(turn).toContain('A context window is…')
    expect(turn.endsWith('What is a context window?')).toBe(true)
  })

  it('says so explicitly when nothing was retrieved', () => {
    const turn = composeUserTurn('Off-syllabus question', [])
    expect(turn).toContain('no course material matched')
    expect(turn.endsWith('Off-syllabus question')).toBe(true)
  })
})

describe('maskKey', () => {
  it('shows only a head and tail of long keys', () => {
    const masked = maskKey('sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234')
    expect(masked).toBe('sk-ant-…1234')
    expect(masked).not.toContain('abcdefgh')
  })

  it('fully masks short values', () => {
    expect(maskKey('short')).toBe('••••')
  })
})
