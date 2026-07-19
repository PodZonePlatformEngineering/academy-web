import { StreakCalendar } from 'academy-web'

const july = new Date(2026, 6, 1)
const streak = [
  { periodStart: '2026-07-06', periodEnd: '2026-07-09' },
  { periodStart: '2026-07-14', periodEnd: '2026-07-19' },
]
const withFreeze = [
  { periodStart: '2026-07-06', periodEnd: '2026-07-10' },
  { periodStart: '2026-07-11', periodEnd: '2026-07-12', usedFreeze: true },
  { periodStart: '2026-07-13', periodEnd: '2026-07-19' },
]

// The week view anchors to the CURRENT week (time-dependent), so it can't be
// previewed deterministically — both cells pin the month view to July 2026.
export const Month = () => <StreakCalendar streak={streak} view="month" month={july} />

export const WithFreeze = () => <StreakCalendar streak={withFreeze} view="month" month={july} />
