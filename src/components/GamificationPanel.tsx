// Home/profile gamification panel (T-042 Task 2) — the Trophy-kit face of the
// Neon-native engine. Presentational throughout (D-6): XP, level, streak, and
// awards are read via gamification_summary / activity_day / achievement under
// the caller's RLS; nothing is computed or written client-side. Everything on
// display derives from self-attested inputs and is labelled as such (D-10/D-3).

import { useCallback, useEffect, useState } from 'react'
import { AchievementGrid } from '@/components/ui/achievement-grid'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PointsBadge } from '@/components/ui/points-badge'
import { StreakCard } from '@/components/ui/streak-card'
import {
  fetchAchievements,
  fetchActivityDays,
  fetchGamification,
  updateTimezone,
  type AchievementRow,
  type ActivityDayRow,
  type GamificationSummary,
} from '@/lib/api'
import {
  levelProgressPct,
  toStreakPeriods,
  toTrophyAchievements,
} from '@/lib/gamification'

function LevelProgress({ summary }: { summary: GamificationSummary }) {
  const pct = levelProgressPct(summary)
  return (
    <div className="min-w-48 flex-1">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Level {summary.level?.level ?? 0} · {summary.level?.name ?? 'Unranked'}
        </span>
        <span>
          {summary.next_level
            ? `${summary.total_xp} / ${summary.next_level.xp_threshold} XP to ${summary.next_level.name}`
            : 'top level'}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function TimezoneField({
  summary,
  onSaved,
}: {
  summary: GamificationSummary
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const zones = Intl.supportedValuesOf('timeZone')
  const save = (tz: string) => {
    setSaving(true)
    updateTimezone(summary.learner.id, tz)
      .then(onSaved)
      .finally(() => setSaving(false))
  }
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Streak timezone
      <select
        className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
        value={summary.learner.timezone}
        disabled={saving}
        onChange={(e) => save(e.target.value)}
      >
        {!zones.includes(summary.learner.timezone) && (
          <option value={summary.learner.timezone}>{summary.learner.timezone}</option>
        )}
        {zones.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function GamificationPanel() {
  const [summary, setSummary] = useState<GamificationSummary | null>(null)
  const [catalogue, setCatalogue] = useState<AchievementRow[]>([])
  const [days, setDays] = useState<ActivityDayRow[]>([])

  const refresh = useCallback(() => {
    fetchGamification().then(setSummary, () => setSummary(null))
    fetchAchievements().then(setCatalogue, () => setCatalogue([]))
    fetchActivityDays().then(setDays, () => setDays([]))
  }, [])

  useEffect(refresh, [refresh])

  // Signed out, anchorless, or demo without fixtures: no panel.
  if (!summary) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>
            {summary.learner.display_name
              ? `${summary.learner.display_name}'s progress`
              : 'Your progress'}
          </CardTitle>
          <Badge variant="secondary">self-attested</Badge>
        </div>
        <CardDescription>
          XP, streaks, and achievements are computed server-side from your own
          completion marks — a motivational layer, not a credential.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <PointsBadge name="XP" total={summary.total_xp} />
          <LevelProgress summary={summary} />
        </div>
        <StreakCard
          streak={toStreakPeriods(days)}
          currentStreak={summary.streak?.current_len ?? 0}
          longestStreak={summary.streak?.longest_len ?? 0}
          total={summary.total_xp}
          title="Activity streak"
          actionLabel="Refresh"
          onActionClick={refresh}
          howItWorksItems={[
            'Marking a section, lab, or tutor activity counts as a day of activity.',
            'Consecutive active days grow your streak; a gap resets it.',
            'Days follow your streak timezone below.',
          ]}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Achievements</p>
          <p className="text-xs text-muted-foreground">
            {summary.awards.length} of {catalogue.length || '—'} earned
          </p>
        </div>
        {catalogue.length > 0 && (
          <AchievementGrid
            achievements={toTrophyAchievements(catalogue, summary.awards)}
            badgeSize="sm"
          />
        )}
        <TimezoneField summary={summary} onSaved={refresh} />
      </CardContent>
    </Card>
  )
}
