import { GamificationStrip } from 'academy-web'

const summary = {
  learner: { id: 5, display_name: 'Martin', timezone: 'Europe/London' },
  total_xp: 125,
  level: { level: 2, name: 'Apprentice', xp_threshold: 100 },
  next_level: { level: 3, name: 'Practitioner', xp_threshold: 250 },
  streak: { learner_id: 5, current_len: 6, longest_len: 9, last_active_date: '2026-07-19' },
  awards: [
    { code: 'first-steps', awarded_at: '2026-07-18T10:00:00Z', title: 'First Steps', icon: null },
    { code: 'streak-starter', awarded_at: '2026-07-19T08:00:00Z', title: 'Streak Starter', icon: null },
  ],
}

export const Active = () => <GamificationStrip summary={summary} />

export const NoStreakYet = () => (
  <GamificationStrip summary={{ ...summary, total_xp: 10, level: { level: 1, name: 'Newcomer', xp_threshold: 0 }, streak: null, awards: [] }} />
)
