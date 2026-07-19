// Scoreboard v0 (B8): a route home for the trophy surface in the new IA.
// Hosts the existing GamificationPanel unchanged — B10 owns the real
// scoreboard content and replaces this page's body.

import GamificationPanel from '@/components/GamificationPanel'

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
    </div>
  )
}
