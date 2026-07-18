// Offline tests for the tutor client modules — pure logic only (no network,
// no browser storage): scope mapping, context composition, key masking.

import { describe, expect, it } from 'vitest'
import { maskKey } from '@/lib/keys'
import type { RetrievedPoint } from '@/lib/retrieval'
import { composeSystem, composeUserTurn, TUTOR_SYSTEM_PROMPT_V1 } from '@/lib/tutor'
import { contentCollection } from '@/lib/tutorConfig'
import type { PreambleData } from '@/lib/api'

describe('contentCollection (D-4 scope mapping)', () => {
  it('maps a curriculum slug to its -content collection', () => {
    expect(contentCollection('prompt-engineering')).toBe('academy-prompt-engineering-content')
    expect(contentCollection('code-ai')).toBe('academy-code-ai-content')
  })

  it('never yields a -keys collection name', () => {
    expect(contentCollection('prompt-engineering')).not.toContain('-keys')
  })
})

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
    expect(composeSystem(null)).toBe(TUTOR_SYSTEM_PROMPT_V1)
  })

  it('appends the student context after the versioned prompt', () => {
    const sys = composeSystem(preamble)
    expect(sys.startsWith(TUTOR_SYSTEM_PROMPT_V1)).toBe(true)
    expect(sys).toContain('<student_context>')
    expect(sys).toContain('"display_name": "Test Trainee"')
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
