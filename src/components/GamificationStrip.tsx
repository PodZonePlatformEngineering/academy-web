// Compact engine-state strip for the curriculum view (T-042 Task 2).
// Presentational only: every number comes from gamification_summary, computed
// server-side by the 009 triggers and read under the caller's RLS.

import { Badge } from '@/components/ui/badge'
import { PointsBadge } from '@/components/ui/points-badge'
import { StreakBadge } from '@/components/ui/streak-badge'
import { levelProgressPct } from '@/lib/gamification'
import type { GamificationSummary } from '@/lib/api'

function GamificationStrip({ summary }: { summary: GamificationSummary | null }) {
  if (!summary) return null
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
      <PointsBadge size="sm" name="XP" total={summary.total_xp} />
      <StreakBadge
        size="sm"
        className="w-auto flex-row gap-1.5 rounded-md p-1.5"
        length={summary.streak?.current_len ?? 0}
        subtitle=""
      />
      {summary.level && (
        <Badge variant="secondary">
          Level {summary.level.level} · {summary.level.name}
          {summary.next_level && ` — ${levelProgressPct(summary)}% to ${summary.next_level.name}`}
        </Badge>
      )}
      <Badge variant="outline" className="ml-auto">
        self-attested progress
      </Badge>
    </div>
  )
}

// Named export alongside the default — the codebase convention everywhere else,
// and required for consumers that re-export via `export *` (design-sync bundle).
export { GamificationStrip }
export default GamificationStrip
