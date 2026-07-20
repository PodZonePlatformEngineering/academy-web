// Scoreboard (B10): trophy surface in the new IA. GamificationPanel carries
// the account-wide XP/level/streak/achievements (unchanged, T-042); this page
// adds the per-curriculum completion view gamification_summary() doesn't
// cover — an SPA-only assembly over the same entitled reads Curriculum.tsx
// and Tutor.tsx already use, reusing their moduleOutline/outlineProgressPct
// math rather than rederiving it (no new RPC).

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GamificationPanel from '@/components/GamificationPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  fetchCatalogue,
  fetchEnrolmentId,
  fetchModules,
  fetchProgress,
  fetchSections,
  type CatalogueRow,
} from '@/lib/api'
import { moduleOutline, outlineProgressPct } from '@/lib/gamification'

function CurriculumProgressRow({ curriculum }: { curriculum: CatalogueRow }) {
  const [pct, setPct] = useState<number | undefined>(undefined)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([
      fetchModules(curriculum.id),
      fetchSections(curriculum.id),
      fetchEnrolmentId(curriculum.id).then((id) => (id === null ? [] : fetchProgress(id))),
    ]).then(
      ([modules, sections, progress]) => {
        if (!live) return
        setPct(outlineProgressPct(moduleOutline(modules, sections, progress)))
        setReady(true)
      },
      () => live && setReady(true),
    )
    return () => {
      live = false
    }
  }, [curriculum.id])

  return (
    <Link
      to={`/library/${curriculum.slug}`}
      state={{ curriculum }}
      className="block rounded-lg border p-3 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium">{curriculum.title}</p>
        <span className="shrink-0 text-xs text-muted-foreground">
          {!ready ? '…' : pct === undefined ? 'no sections yet' : `${pct}%`}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct ?? 0}%` }} />
      </div>
    </Link>
  )
}

function CurriculumProgress() {
  const [enrolled, setEnrolled] = useState<CatalogueRow[] | null>(null)

  useEffect(() => {
    fetchCatalogue().then(
      (rows) => setEnrolled(rows.filter((c) => c.access)),
      () => setEnrolled([]),
    )
  }, [])

  if (enrolled && enrolled.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your programmes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!enrolled && <p className="text-sm text-muted-foreground">Loading…</p>}
        {enrolled?.map((c) => <CurriculumProgressRow key={c.id} curriculum={c} />)}
      </CardContent>
    </Card>
  )
}

export default function Scoreboard() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Scoreboard</h1>
        <p className="text-sm text-muted-foreground">
          XP, streaks, and achievements — computed server-side from your own
          completion marks.
        </p>
      </div>
      <GamificationPanel />
      <CurriculumProgress />
    </div>
  )
}
