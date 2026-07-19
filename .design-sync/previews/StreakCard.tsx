import { StreakCard } from 'academy-web'

const july = [
  { periodStart: '2026-07-06', periodEnd: '2026-07-09' },
  { periodStart: '2026-07-14', periodEnd: '2026-07-19' },
]

export const Full = () => (
  <StreakCard
    style={{ maxWidth: 400 }}
    streak={july}
    currentStreak={6}
    longestStreak={9}
    total={26}
    title="Learning streak"
    actionLabel="Keep it going"
    showHowItWorks
    howItWorksTitle="How streaks work"
    howItWorksItems={[
      'Complete any section to keep the day active',
      'Tutor sessions count toward your streak',
      'Streaks are timezone-aware — set yours in your profile',
    ]}
  />
)

export const Minimal = () => (
  <StreakCard
    style={{ maxWidth: 360 }}
    streak={july}
    currentStreak={6}
    longestStreak={9}
    total={26}
  />
)
