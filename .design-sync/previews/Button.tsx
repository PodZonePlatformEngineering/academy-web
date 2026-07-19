import { Button } from 'academy-web'

export const Variants = () => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button>Mark section complete</Button>
    <Button variant="outline">View curriculum</Button>
    <Button variant="secondary">Ask the tutor</Button>
    <Button variant="ghost">Skip for now</Button>
    <Button variant="destructive">Clear API key</Button>
    <Button variant="link">How streaks work</Button>
  </div>
)

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button size="sm">Small</Button>
    <Button>Default</Button>
    <Button size="lg">Large</Button>
  </div>
)

export const Disabled = () => (
  <div style={{ display: 'flex', gap: 12 }}>
    <Button disabled>Marking…</Button>
    <Button variant="outline" disabled>Locked</Button>
  </div>
)
