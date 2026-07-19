// Active-curriculum seam (B8 Task 2) — one answer to "which curriculum is
// the tutor about right now?", shared by the top-level /tutor route today and
// B9's curriculum switcher tomorrow.
//
// Resolution precedence:
//   1. Device-local last-used — recorded on tutor open and on every
//      /library/:slug visit (and by the legacy /curriculum/:slug/tutor
//      redirect, so old deep links land on the same curriculum). Only honoured
//      while the trainee still has access to it — a lapsed entitlement falls
//      through rather than opening the tutor on a curriculum it will refuse.
//   2. The single active enrolment, when there is exactly one.
//   3. The newest active enrolment (enrolled_at) otherwise.
// Nothing resolvable → null; the /tutor route redirects to /library.
//
// The record is device-local by design (like the BYO key): it is a UI
// convenience, not platform state — no schema changes in this brief.

import type { CatalogueRow, EnrolmentRow } from '@/lib/api'

const LAST_USED = 'academy.active_curriculum'

/** The device-local last-used curriculum slug, if any. */
export function lastUsedCurriculum(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(LAST_USED)
}

/** Record a curriculum as last-used (tutor open, /library/:slug visit). */
export function recordCurriculumUsed(slug: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(LAST_USED, slug)
}

/** Pure resolution over already-fetched rows — unit-tested; no I/O. */
export function resolveActiveCurriculum(
  lastUsedSlug: string | null,
  catalogue: CatalogueRow[],
  enrolments: EnrolmentRow[],
): CatalogueRow | null {
  const lastUsed = lastUsedSlug
    ? catalogue.find((c) => c.slug === lastUsedSlug && c.access)
    : undefined
  if (lastUsed) return lastUsed

  const enrolled = enrolments
    .map((e) => ({ enrolment: e, row: catalogue.find((c) => c.id === e.curriculum_id) }))
    .filter((x): x is { enrolment: EnrolmentRow; row: CatalogueRow } => Boolean(x.row))
  if (enrolled.length === 0) return null
  if (enrolled.length === 1) return enrolled[0].row

  return enrolled.reduce((newest, x) =>
    x.enrolment.enrolled_at > newest.enrolment.enrolled_at ? x : newest,
  ).row
}
