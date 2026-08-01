// Type-keyed content-type dispatch (PROJ-011/T-138 item 1). Replaces the
// field-presence branching the schema-v2 review traced "un-uniform
// rendering" to (review plan §2) — content.type (academy-admin migration
// 035, T-132 item 5) is now a real, queryable signal, so this dispatches on
// it directly instead of inferring structure from which fields happen to be
// set.
//
// Single component for both the library's inline expand view
// (Curriculum.tsx) and the tutor's module-content overlay (Tutor.tsx) — the
// former `Section`/`ModuleSection` twins (review plan §4, informally tracked
// against T-051) are folded into this one definition (item 6).
import MarkdownBody from '@/components/MarkdownBody'
import { Badge } from '@/components/ui/badge'
import type { ContentRow } from '@/lib/api'

// Types the web renderer already knows how to show as prose. Everything
// else — including a `null` future type or a currently-unbuilt one like
// `group_discussion` — falls through to the unavailable state below rather
// than being rendered blindly or silently dropped (review plan §3.1: unsuited
// content must stay visible, marked unavailable, never hidden).
const MARKDOWN_TYPES = new Set(['section', 'module_readme', 'curriculum_readme', 'lab', 'resource'])

function unavailableReason(type: string): string {
  if (type === 'group_discussion') {
    return 'Group discussion prompts aren’t viewable here yet — they surface once the inter-cohort discussion feature ships.'
  }
  return `Content of type "${type}" isn’t supported in this view yet.`
}

export default function ContentBlock({ row }: { row: ContentRow }) {
  const label = row.section_id ?? 'module overview'
  // A null type is a pre-schema-v2 row with no matching curriculum_point
  // (e.g. the T-039 acceptance test-seed stub) — it predates the type
  // column entirely, so it renders as ordinary prose exactly as it always
  // has, not as an unknown/unsuited type.
  if (row.type === null || MARKDOWN_TYPES.has(row.type)) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="micro mb-2 text-primary">{label}</p>
        <MarkdownBody>{row.body}</MarkdownBody>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-dashed bg-muted/10 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="micro text-primary">{label}</p>
        <Badge variant="outline">unavailable in this view</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{unavailableReason(row.type)}</p>
    </div>
  )
}
