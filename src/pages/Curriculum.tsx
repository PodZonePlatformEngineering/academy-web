import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
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
  fetchModules,
  type CatalogueRow,
  type ContentRow,
  type ModuleRow,
} from '@/lib/api'

function Section({ row }: { row: ContentRow }) {
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {row.section_id ?? 'module overview'}
      </p>
      {/* Bodies are markdown source; MVP renders them verbatim (styling polish deferred). */}
      <pre className="whitespace-pre-wrap font-sans text-sm">{row.body}</pre>
    </div>
  )
}

function Module({ module }: { module: ModuleRow }) {
  const [sections, setSections] = useState<ContentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const toggle = () => {
    setOpen(!open)
    if (!sections && module.code) {
      fetchContent(module.curriculum_id, module.code).then(setSections, (e: Error) =>
        setError(e.message),
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{module.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {module.section_count} section{module.section_count === 1 ? '' : 's'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={toggle}
              disabled={module.section_count === 0}
            >
              {open ? 'Close' : 'Open'}
            </Button>
          </div>
        </div>
        {module.section_count === 0 && (
          <CardDescription>No sections visible — entitlement required.</CardDescription>
        )}
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">Content failed to load: {error}</p>}
          {!error && !sections && <p className="text-sm text-muted-foreground">Loading…</p>}
          {sections?.map((s) => <Section key={s.section_id ?? 'module'} row={s} />)}
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
    fetchModules(curriculum.id).then(setModules, (e: Error) => setError(e.message))
  }, [curriculum])

  if (error) return <p className="text-sm text-destructive">Failed to load: {error}</p>
  if (!curriculum) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-4">
      <div>
        <Link to="/catalogue" className="text-sm underline underline-offset-4">
          ← Catalogue
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{curriculum.title}</h1>
        <p className="text-sm text-muted-foreground">{curriculum.description}</p>
      </div>
      {!modules && <p className="text-sm text-muted-foreground">Loading modules…</p>}
      {modules && modules.length === 0 && (
        <p className="text-sm text-muted-foreground">No modules published yet.</p>
      )}
      {modules?.map((m) => <Module key={m.id} module={m} />)}
    </div>
  )
}
