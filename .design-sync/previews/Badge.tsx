import { Badge } from 'academy-web'

export const Variants = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
    <Badge>Enrolled</Badge>
    <Badge variant="secondary">Self-attested</Badge>
    <Badge variant="outline">Module M3</Badge>
    <Badge variant="destructive">Expired key</Badge>
    <Badge variant="ghost">Draft</Badge>
  </div>
)

export const InContext = () => (
  <p style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
    Prompt Engineering <Badge variant="secondary">access: enrolled</Badge>
    Code AI <Badge variant="outline">locked</Badge>
  </p>
)
