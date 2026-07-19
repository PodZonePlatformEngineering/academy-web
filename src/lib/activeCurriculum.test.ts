import { describe, expect, it } from 'vitest'
import { resolveActiveCurriculum } from '@/lib/activeCurriculum'
import type { CatalogueRow, EnrolmentRow } from '@/lib/api'

const row = (id: number, slug: string, access = true): CatalogueRow => ({
  id,
  slug,
  title: slug,
  tier: null,
  version: null,
  description: null,
  access,
})

const enr = (id: number, curriculum_id: number, enrolled_at: string): EnrolmentRow => ({
  id,
  curriculum_id,
  enrolled_at,
})

const catalogue = [row(1, 'prompt-eng'), row(2, 'code-ai'), row(3, 'locked-course', false)]

describe('resolveActiveCurriculum', () => {
  it('prefers the device-local last-used curriculum', () => {
    const enrolments = [enr(10, 1, '2026-07-01T00:00:00Z'), enr(11, 2, '2026-07-15T00:00:00Z')]
    expect(resolveActiveCurriculum('prompt-eng', catalogue, enrolments)?.id).toBe(1)
  })

  it('ignores a last-used curriculum the trainee no longer has access to', () => {
    const enrolments = [enr(10, 1, '2026-07-01T00:00:00Z')]
    expect(resolveActiveCurriculum('locked-course', catalogue, enrolments)?.id).toBe(1)
  })

  it('ignores a last-used slug no longer in the catalogue', () => {
    const enrolments = [enr(10, 2, '2026-07-01T00:00:00Z')]
    expect(resolveActiveCurriculum('renamed-away', catalogue, enrolments)?.id).toBe(2)
  })

  it('falls back to the single enrolment when nothing is last-used', () => {
    const enrolments = [enr(10, 2, '2026-07-01T00:00:00Z')]
    expect(resolveActiveCurriculum(null, catalogue, enrolments)?.id).toBe(2)
  })

  it('picks the newest enrolment when there are several', () => {
    const enrolments = [enr(10, 1, '2026-07-01T00:00:00Z'), enr(11, 2, '2026-07-15T00:00:00Z')]
    expect(resolveActiveCurriculum(null, catalogue, enrolments)?.id).toBe(2)
  })

  it('skips enrolments whose curriculum is not in the visible catalogue', () => {
    const enrolments = [enr(10, 99, '2026-07-20T00:00:00Z'), enr(11, 1, '2026-07-01T00:00:00Z')]
    expect(resolveActiveCurriculum(null, catalogue, enrolments)?.id).toBe(1)
  })

  it('resolves nothing when there are no enrolments — /tutor sends this to /library', () => {
    expect(resolveActiveCurriculum(null, catalogue, [])).toBeNull()
    expect(resolveActiveCurriculum('locked-course', catalogue, [])).toBeNull()
  })
})
