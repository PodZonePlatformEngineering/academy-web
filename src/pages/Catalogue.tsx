import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { fetchCatalogue, type CatalogueRow } from '@/lib/api'

export default function Catalogue() {
  const [rows, setRows] = useState<CatalogueRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCatalogue().then(setRows, (e: Error) => setError(e.message))
  }, [])

  if (error) return <p className="text-sm text-destructive">Catalogue failed to load: {error}</p>
  if (!rows) return <p className="text-sm text-muted-foreground">Loading catalogue…</p>

  return (
    <div className="space-y-4">
      {/* B8: the trophy panel that headed this page while it was the signed-in
          home now lives on /scoreboard — this page is the library, for anyone. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{c.title}</CardTitle>
                <Badge variant={c.access ? 'default' : 'outline'}>
                  {c.access ? 'enrolled' : c.tier === 'free' ? 'free' : 'locked'}
                </Badge>
              </div>
              <CardDescription>{c.description ?? '—'}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <Link
                to={`/library/${c.slug}`}
                state={{ curriculum: c }}
                className="underline underline-offset-4"
              >
                Browse modules
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
