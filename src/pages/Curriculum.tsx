import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import GamificationStrip from '@/components/GamificationStrip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  fetchCatalogue,
  fetchContent,
  fetchEnrolmentId,
  fetchGamification,
  fetchModules,
  fetchProgress,
  fetchSections,
  markProgress,
  type CatalogueRow,
  type ContentRow,
  type GamificationSummary,
  type ModuleRow,
  type ProgressRow,
  type SectionRow,
} from '@/lib/api'
import { recordCurriculumUsed } from '@/lib/activeCurriculum'
import { moduleComplete, sectionsByModule, stateForPoint } from '@/lib/gamification'
import { tutorConfigured } from '@/lib/tutorConfig'

function Section({ row }: { row: ContentRow }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="micro mb-2 text-primary">{row.section_id ?? 'module overview'}</p>
      {/* Bodies are markdown source; MVP renders them verbatim (styling polish deferred). */}
      <pre className="whitespace-pre-wrap font-sans text-sm">{row.body}</pre>
    </div>
  )
}

// One markable unit (section or lab). The mark is a self-attested progress
// write via the mark_progress RPC — XP/streak/achievements happen server-side
// in the 009 triggers, never here (D-6).
function SectionMark({
  section,
  progress,
  marking,
  onMark,
}: {
  section: SectionRow
  progress: ProgressRow[]
  marking: boolean
  onMark: (section: SectionRow) => void
}) {
  const state = stateForPoint(progress, section.anchor_point_id)
  const label = section.kind === 'lab' ? 'Mark lab done' : 'Mark complete'
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm">
          {section.kind === 'lab' ? section.title : `${section.section_id} — ${section.title}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {section.kind === 'lab'
            ? 'lab'
            : `${section.point_count} point${section.point_count === 1 ? '' : 's'}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {state === 'complete' && <Badge variant="success">✓ complete</Badge>}
        {state === 'in_progress' && <Badge variant="secondary">in progress</Badge>}
        {state !== 'complete' && (
          <Button
            variant="outline"
            size="sm"
            disabled={marking}
            title="Self-attested — recorded as your own completion mark"
            onClick={() => onMark(section)}
          >
            {label}
          </Button>
        )}
      </div>
    </div>
  )
}

function Module({
  module,
  sections,
  progress,
  marking,
  entitled,
  onMark,
}: {
  module: ModuleRow
  sections: SectionRow[]
  progress: ProgressRow[]
  marking: boolean
  entitled: boolean
  onMark: (section: SectionRow) => void
}) {
  const [content, setContent] = useState<ContentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const openable = module.section_count > 0 || sections.length > 0
  const completed = moduleComplete(progress, module.id)

  const toggle = () => {
    setOpen(!open)
    if (!content && module.section_count > 0 && module.code) {
      fetchContent(module.curriculum_id, module.code).then(setContent, (e: Error) =>
        setError(e.message),
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{module.title}</CardTitle>
        {module.description && (
          <CardDescription className="whitespace-pre-wrap">{module.description}</CardDescription>
        )}
        <div className="flex items-center justify-end gap-2">
          {completed && <Badge variant="success">✓ module complete</Badge>}
          <Badge variant="secondary">
            {sections.length > 0
              ? `${sections.length} section${sections.length === 1 ? '' : 's'}`
              : `${module.section_count} section${module.section_count === 1 ? '' : 's'}`}
          </Badge>
          <Button variant="outline" size="sm" onClick={toggle} disabled={!openable}>
            {open ? 'Close' : 'Open'}
          </Button>
        </div>
        {!openable && (
          <CardDescription>
            {entitled ? 'This module has no content yet.' : 'No sections visible — entitlement required.'}
          </CardDescription>
        )}
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          {sections.length > 0 && (
            <div className="space-y-2">
              {sections.map((s) => (
                <SectionMark
                  key={s.anchor_point_id}
                  section={s}
                  progress={progress}
                  marking={marking}
                  onMark={onMark}
                />
              ))}
            </div>
          )}
          {error && <p className="text-sm text-destructive">Content failed to load: {error}</p>}
          {content?.map((s) => <Section key={s.section_id ?? 'module'} row={s} />)}
        </CardContent>
      )}
    </Card>
  )
}

export default function Curriculum() {
  const { slug } = useParams()
  // Arriving from the catalogue carries the row; a deep link refetches it.
  const seeded = (useLocation().state as { curriculum?: CatalogueRow } | null)?.curriculum
  const [curriculum, setCurriculum] = useState<CatalogueRow | null>(seeded ?? null)
  const [modules, setModules] = useState<ModuleRow[] | null>(null)
  const [sections, setSections] = useState<SectionRow[]>([])
  const [enrolmentId, setEnrolmentId] = useState<number | null>(null)
  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [summary, setSummary] = useState<GamificationSummary | null>(null)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (curriculum) return
    fetchCatalogue().then(
      (rows) => setCurriculum(rows.find((c) => c.slug === slug) ?? null),
      (e: Error) => setError(e.message),
    )
  }, [curriculum, slug])

  useEffect(() => {
    if (!curriculum) return
    // B8: a library visit marks this curriculum as last-used, so /tutor opens
    // on it (the seam ignores the record if access has lapsed).
    recordCurriculumUsed(curriculum.slug)
    fetchModules(curriculum.id).then(setModules, (e: Error) => setError(e.message))
    if (curriculum.access) {
      // Entitled read of the markable units + own engine state; each is
      // best-effort so a signed-out viewer still gets the module list.
      fetchSections(curriculum.id).then(setSections, () => setSections([]))
      fetchGamification().then(setSummary, () => setSummary(null))
      fetchEnrolmentId(curriculum.id).then(setEnrolmentId, () => setEnrolmentId(null))
    }
  }, [curriculum])

  const refreshProgress = useCallback(() => {
    if (enrolmentId === null) return
    fetchProgress(enrolmentId).then(setProgress, () => setProgress([]))
  }, [enrolmentId])

  useEffect(refreshProgress, [refreshProgress])

  const onMark = (section: SectionRow) => {
    if (!curriculum) return
    setMarking(true)
    markProgress(curriculum.id, section.module_code, section.anchor_point_id)
      .then((result) => {
        if (result.summary) setSummary(result.summary)
        refreshProgress()
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setMarking(false))
  }

  if (error) return <p className="text-sm text-destructive">Failed to load: {error}</p>
  if (!curriculum) return <p className="text-sm text-muted-foreground">Loading…</p>

  const grouped = sectionsByModule(sections)

  return (
    <div className="space-y-4">
      <div>
        <Link to="/library" className="text-sm underline underline-offset-4">
          ← Library
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">{curriculum.title}</h1>
          {tutorConfigured && curriculum.access && (
            <Button asChild variant="outline" size="sm">
              {/* This page's visit already recorded the curriculum as
                  last-used, so the top-level tutor opens on it. */}
              <Link to="/tutor">Ask the tutor</Link>
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{curriculum.description}</p>
      </div>
      <GamificationStrip summary={summary} />
      {!modules && <p className="text-sm text-muted-foreground">Loading modules…</p>}
      {modules && modules.length === 0 && (
        <p className="text-sm text-muted-foreground">No modules published yet.</p>
      )}
      {modules?.map((m) => (
        <Module
          key={m.id}
          module={m}
          sections={(m.code && grouped.get(m.code)) || []}
          progress={progress}
          marking={marking}
          entitled={curriculum.access}
          onMark={onMark}
        />
      ))}
    </div>
  )
}
