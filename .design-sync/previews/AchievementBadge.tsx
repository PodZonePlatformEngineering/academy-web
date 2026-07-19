import { AchievementBadge } from 'academy-web'

export const Earned = () => (
  <AchievementBadge
    achievement={{ id: 'a1', name: 'First Steps', trigger: 'metric', achievedAt: '2026-07-19T09:00:00Z' }}
  />
)

export const Locked = () => (
  <AchievementBadge
    achievement={{ id: 'a2', name: 'Module Master', trigger: 'metric', achievedAt: null }}
  />
)

export const InProgress = () => (
  <AchievementBadge
    achievement={{ id: 'a3', name: 'Week-long Streak', trigger: 'streak', progress: 0.6, achievedAt: null }}
  />
)

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
    {(['sm', 'default', 'lg', 'xl'] as const).map((s) => (
      <AchievementBadge
        key={s}
        badgeSize={s}
        achievement={{ id: `s-${s}`, name: 'First Steps', trigger: 'metric', achievedAt: '2026-07-19T09:00:00Z' }}
      />
    ))}
  </div>
)
