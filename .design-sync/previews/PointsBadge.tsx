import { PointsBadge } from 'academy-web'

export const Default = () => <PointsBadge name="XP" total={125} />

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
    <PointsBadge size="sm" name="XP" total={125} />
    <PointsBadge name="XP" total={1250} />
    <PointsBadge size="lg" name="XP" total={12500} />
  </div>
)

export const Formatted = () => (
  <PointsBadge name="Lifetime XP" total={12500} formatValue={(v) => v.toLocaleString('en-GB')} />
)
