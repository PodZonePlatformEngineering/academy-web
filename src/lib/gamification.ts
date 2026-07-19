// Pure mappings from engine state (Neon, RLS-read) to the Trophy component
// props. Display-only: nothing here computes XP, streaks, or awards — the 009
// triggers are the engine (D-6); these functions just reshape server rows.

import type {
  AchievementRow,
  ActivityDayRow,
  AwardRow,
  GamificationSummary,
  ProgressRow,
  SectionRow,
} from '@/lib/api'
import type { StreakPeriod } from '@/components/ui/streak-calendar'

// The Trophy achievement shape (achievement-badge/grid inline their own copy
// of this interface; this mirrors it for the mapping layer).
export interface TrophyAchievement {
  id: string
  name: string
  trigger: 'metric' | 'api' | 'streak'
  badgeUrl?: string | null
  achievedAt: string | null
}

/** Consecutive ISO activity days → StreakPeriod ranges for the calendar. */
export function toStreakPeriods(days: ActivityDayRow[]): StreakPeriod[] {
  const sorted = [...new Set(days.map((d) => d.day))].sort()
  const periods: StreakPeriod[] = []
  for (const day of sorted) {
    const last = periods[periods.length - 1]
    if (last && nextDay(last.periodEnd) === day) {
      last.periodEnd = day
    } else {
      periods.push({ periodStart: day, periodEnd: day })
    }
  }
  return periods
}

function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Catalogue + earned awards → Trophy grid rows (earned first, then locked). */
export function toTrophyAchievements(
  catalogue: AchievementRow[],
  awards: AwardRow[],
): TrophyAchievement[] {
  const earnedAt = new Map(awards.map((a) => [a.code, a.awarded_at]))
  return catalogue
    .map((a) => ({
      id: a.code,
      name: a.title,
      trigger: (a.criteria_kind === 'streak_length' ? 'streak' : 'metric') as
        | 'streak'
        | 'metric',
      achievedAt: earnedAt.get(a.code) ?? null,
    }))
    .sort((a, b) => {
      if ((a.achievedAt === null) !== (b.achievedAt === null)) {
        return a.achievedAt === null ? 1 : -1
      }
      return a.id.localeCompare(b.id)
    })
}

/** Percent progress from the current level's threshold to the next (0–100). */
export function levelProgressPct(summary: GamificationSummary): number {
  const from = summary.level?.xp_threshold ?? 0
  const to = summary.next_level?.xp_threshold
  if (to === undefined || to <= from) return 100 // top level reached
  const pct = ((summary.total_xp - from) / (to - from)) * 100
  return Math.min(100, Math.max(0, Math.round(pct)))
}

/** section_browser rows grouped by module code (sections before labs). */
export function sectionsByModule(sections: SectionRow[]): Map<string, SectionRow[]> {
  const byModule = new Map<string, SectionRow[]>()
  for (const s of sections) {
    const list = byModule.get(s.module_code) ?? []
    list.push(s)
    byModule.set(s.module_code, list)
  }
  for (const list of byModule.values()) {
    list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'section' ? -1 : 1
      return (a.section_id ?? '').localeCompare(b.section_id ?? '')
    })
  }
  return byModule
}

/** Progress state for an anchor point, keyed off the RLS-read progress rows. */
export function stateForPoint(
  progress: ProgressRow[],
  pointId: string,
): ProgressRow['state'] {
  return progress.find((p) => p.point_id === pointId)?.state ?? 'not_started'
}

/** True when the module-level (point-less) row is complete — rollup reached. */
export function moduleComplete(progress: ProgressRow[], moduleId: number): boolean {
  return progress.some(
    (p) => p.module_id === moduleId && p.point_id === null && p.state === 'complete',
  )
}
