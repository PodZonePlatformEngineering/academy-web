import { describe, expect, it } from 'vitest'
import type {
  AchievementRow,
  ActivityDayRow,
  GamificationSummary,
  ModuleRow,
  ProgressRow,
  SectionRow,
} from '@/lib/api'
import {
  levelProgressPct,
  moduleComplete,
  moduleOutline,
  outlineProgressPct,
  sectionsByModule,
  stateForPoint,
  toStreakPeriods,
  toTrophyAchievements,
} from '@/lib/gamification'

const day = (d: string, points = 25): ActivityDayRow => ({
  learner_id: 1,
  day: d,
  events: 1,
  points,
})

describe('toStreakPeriods', () => {
  it('merges consecutive days into one period', () => {
    const periods = toStreakPeriods([day('2026-07-16'), day('2026-07-17'), day('2026-07-18')])
    expect(periods).toEqual([{ periodStart: '2026-07-16', periodEnd: '2026-07-18' }])
  })

  it('splits on gaps and handles month boundaries', () => {
    const periods = toStreakPeriods([day('2026-05-30'), day('2026-05-31'), day('2026-07-18')])
    expect(periods).toEqual([
      { periodStart: '2026-05-30', periodEnd: '2026-05-31' },
      { periodStart: '2026-07-18', periodEnd: '2026-07-18' },
    ])
  })

  it('deduplicates and sorts unordered input', () => {
    const periods = toStreakPeriods([day('2026-07-18'), day('2026-07-17'), day('2026-07-18')])
    expect(periods).toEqual([{ periodStart: '2026-07-17', periodEnd: '2026-07-18' }])
  })

  it('returns nothing for no activity', () => {
    expect(toStreakPeriods([])).toEqual([])
  })
})

describe('toTrophyAchievements', () => {
  const catalogue: AchievementRow[] = [
    { code: 'streak_3', title: 'On a Roll', description: null, icon: 'flame', criteria_kind: 'streak_length', params: { days: 3 } },
    { code: 'first_xp', title: 'First Steps', description: null, icon: 'sparkles', criteria_kind: 'first_xp', params: {} },
    { code: 'xp_100', title: 'Century', description: null, icon: 'coin', criteria_kind: 'xp_threshold', params: { threshold: 100 } },
  ]

  it('marks earned achievements and locks the rest, earned first', () => {
    const rows = toTrophyAchievements(catalogue, [
      { code: 'first_xp', awarded_at: '2026-07-05T20:54:21Z', title: 'First Steps', icon: 'sparkles' },
    ])
    expect(rows.map((r) => [r.id, r.achievedAt !== null])).toEqual([
      ['first_xp', true],
      ['streak_3', false],
      ['xp_100', false],
    ])
  })

  it('maps streak criteria to the streak trigger', () => {
    const rows = toTrophyAchievements(catalogue, [])
    expect(rows.find((r) => r.id === 'streak_3')?.trigger).toBe('streak')
    expect(rows.find((r) => r.id === 'xp_100')?.trigger).toBe('metric')
  })
})

describe('levelProgressPct', () => {
  const base: GamificationSummary = {
    learner: { id: 5, display_name: 'Martin', timezone: 'Europe/London' },
    total_xp: 125,
    level: { level: 2, name: 'Apprentice', xp_threshold: 100 },
    next_level: { level: 3, name: 'Practitioner', xp_threshold: 300 },
    streak: null,
    awards: [],
  }

  it('interpolates between thresholds', () => {
    // 125 XP between 100 and 300 → 12.5% → 13
    expect(levelProgressPct(base)).toBe(13)
  })

  it('caps at 100 when the top level is reached', () => {
    expect(levelProgressPct({ ...base, next_level: null, total_xp: 99999 })).toBe(100)
  })

  it('floors at 0 for inconsistent inputs', () => {
    expect(levelProgressPct({ ...base, total_xp: 50 })).toBe(0)
  })
})

describe('sectionsByModule / stateForPoint / moduleComplete', () => {
  const sec = (module: string, section: string | null, kind: 'section' | 'lab', anchor: string): SectionRow => ({
    curriculum_id: 5,
    module_code: module,
    kind,
    section_id: section,
    anchor_point_id: anchor,
    title: `${module}/${section ?? 'lab'}`,
    point_count: 3,
  })

  it('groups by module with sections before labs', () => {
    const grouped = sectionsByModule([
      sec('M1', null, 'lab', 'p-lab'),
      sec('M1', '02', 'section', 'p2'),
      sec('M1', '01', 'section', 'p1'),
      sec('M2', '01', 'section', 'p3'),
    ])
    expect([...grouped.keys()]).toEqual(['M1', 'M2'])
    expect(grouped.get('M1')?.map((s) => s.anchor_point_id)).toEqual(['p1', 'p2', 'p-lab'])
  })

  it('resolves point state with not_started fallback', () => {
    const progress: ProgressRow[] = [
      { id: 1, enrolment_id: 5, module_id: 6, state: 'complete', point_id: 'p1' },
      { id: 2, enrolment_id: 5, module_id: 6, state: 'in_progress', point_id: 'p2' },
    ]
    expect(stateForPoint(progress, 'p1')).toBe('complete')
    expect(stateForPoint(progress, 'p2')).toBe('in_progress')
    expect(stateForPoint(progress, 'p9')).toBe('not_started')
  })

  it('detects the module-level rollup row only', () => {
    const progress: ProgressRow[] = [
      { id: 1, enrolment_id: 5, module_id: 6, state: 'complete', point_id: 'p1' },
      { id: 2, enrolment_id: 5, module_id: 7, state: 'complete', point_id: null },
    ]
    expect(moduleComplete(progress, 7)).toBe(true)
    expect(moduleComplete(progress, 6)).toBe(false)
  })
})

describe('moduleOutline / outlineProgressPct', () => {
  const mod = (id: number, code: string | null, title: string, count = 2): ModuleRow => ({
    id,
    curriculum_id: 5,
    code,
    slug: title.toLowerCase().replace(/\s/g, '-'),
    title,
    ordinal: id,
    section_count: count,
  })
  const sec = (module: string, section: string, anchor: string): SectionRow => ({
    curriculum_id: 5,
    module_code: module,
    kind: 'section',
    section_id: section,
    anchor_point_id: anchor,
    title: `${module}/${section}`,
    point_count: 3,
  })
  const row = (id: number, moduleId: number, state: ProgressRow['state'], point: string | null): ProgressRow => ({
    id,
    enrolment_id: 5,
    module_id: moduleId,
    state,
    point_id: point,
  })

  const modules = [mod(6, 'M1', 'Foundations'), mod(7, 'M2', 'Context'), mod(8, 'M3', 'Agents')]
  const sections = [sec('M1', '01', 'p1'), sec('M1', '02', 'p2'), sec('M2', '01', 'p3')]

  it('derives one row per module with done counts and states', () => {
    const progress = [row(1, 6, 'complete', 'p1'), row(2, 6, 'in_progress', 'p2')]
    expect(moduleOutline(modules, sections, progress)).toEqual([
      { id: 6, label: 'Foundations', state: 'in_progress', done: 1, total: 2 },
      { id: 7, label: 'Context', state: 'not_started', done: 0, total: 1 },
      { id: 8, label: 'Agents', state: 'not_started', done: 0, total: 2 },
    ])
  })

  it('completes a module when all its sections are marked or the rollup exists', () => {
    const progress = [
      row(1, 6, 'complete', 'p1'),
      row(2, 6, 'complete', 'p2'),
      row(3, 7, 'complete', null), // rollup without visible section marks
    ]
    const states = moduleOutline(modules, sections, progress).map((i) => i.state)
    expect(states).toEqual(['complete', 'complete', 'not_started'])
  })

  it('falls back to section_count for modules with no visible sections', () => {
    const items = moduleOutline(modules, sections, [])
    expect(items.find((i) => i.id === 8)?.total).toBe(2)
  })

  it('sums section completion into a percentage, undefined when unmarkable', () => {
    const progress = [row(1, 6, 'complete', 'p1')]
    // 1 done of 2 + 1 + 2 markable
    expect(outlineProgressPct(moduleOutline(modules, sections, progress))).toBe(20)
    expect(outlineProgressPct([])).toBeUndefined()
    expect(outlineProgressPct(moduleOutline([mod(9, null, 'Empty', 0)], [], []))).toBeUndefined()
  })
})
