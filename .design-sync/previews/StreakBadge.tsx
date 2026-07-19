import { StreakBadge } from 'academy-web'

export const Daily = () => <StreakBadge length={7} frequency="daily" />

export const WithSubtitle = () => (
  <StreakBadge length={12} frequency="daily" subtitle="Personal best" />
)

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
    <StreakBadge size="sm" length={3} frequency="daily" />
    <StreakBadge length={7} frequency="weekly" />
    <StreakBadge size="lg" length={30} frequency="daily" subtitle="A whole month" />
  </div>
)
