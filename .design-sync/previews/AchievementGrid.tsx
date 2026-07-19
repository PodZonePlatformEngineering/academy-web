import { AchievementGrid } from 'academy-web'

const achievements = [
  { id: '1', name: 'First Steps', trigger: 'metric' as const, achievedAt: '2026-07-18T10:00:00Z' },
  { id: '2', name: 'Curious Mind', trigger: 'api' as const, achievedAt: '2026-07-18T12:00:00Z' },
  { id: '3', name: 'Streak Starter', trigger: 'streak' as const, achievedAt: '2026-07-19T08:00:00Z' },
  { id: '4', name: 'Module Master', trigger: 'metric' as const, achievedAt: null, progress: 0.6 },
  { id: '5', name: 'Marathon Learner', trigger: 'streak' as const, achievedAt: null, progress: 0.2 },
  { id: '6', name: 'Tutor Regular', trigger: 'api' as const, achievedAt: null },
]

export const ThreeColumns = () => (
  <AchievementGrid achievements={achievements} columns={3} style={{ maxWidth: 420 }} />
)

export const CompactAuto = () => (
  <AchievementGrid achievements={achievements} columns="auto" gap="sm" badgeSize="sm" />
)
