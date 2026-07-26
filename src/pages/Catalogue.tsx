import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { fetchCatalogue, type CatalogueRow } from '@/lib/api'
import { authConfigured } from '@/lib/auth'
import { useAuthState } from '@/lib/auth-state'

function CatalogueGrid({ rows }: { rows: CatalogueRow[] }) {
  return (
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
  )
}

// T-058: the Data API requires a valid bearer JWT on every call, gateway-side
// — there is no anonymous-caller role reachable from a signed-out visitor
// here (confirmed live: Stack Auth's own anonymous-session tokens are signed
// by a key the Data API's configured JWKS can't resolve — "jwk not found").
// A signed-out fetchCatalogue() call is therefore not a permissions gap to
// patch with a grant; it always 400s at the gateway before Postgres sees it.
// Signed-out visitors get a labelled sign-in nudge instead of a doomed call.
function SignInNudge() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to browse the catalogue</CardTitle>
        <CardDescription>
          The live catalogue is served per-account. Sign in — it&apos;s quick, and free
          curricula stay free.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/sign-in">
            Sign in <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function Catalogue() {
  const { visitor } = useAuthState()
  const [rows, setRows] = useState<CatalogueRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const needsSignIn = authConfigured && visitor === 'signed-out'

  useEffect(() => {
    if (needsSignIn || visitor === 'unknown') return
    fetchCatalogue().then(setRows, (e: Error) => setError(e.message))
  }, [needsSignIn, visitor])

  if (needsSignIn) return <SignInNudge />
  if (visitor === 'unknown') return <p className="text-sm text-muted-foreground">Loading catalogue…</p>
  if (error) return <p className="text-sm text-destructive">Catalogue failed to load: {error}</p>
  if (!rows) return <p className="text-sm text-muted-foreground">Loading catalogue…</p>

  const enrolled = rows.filter((c) => c.access)
  const discover = rows.filter((c) => !c.access)

  return (
    <div className="space-y-6">
      {/* B8: the trophy panel that headed this page while it was the signed-in
          home now lives on /scoreboard — this page is the library, for anyone. */}
      {enrolled.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your programmes</h2>
          <CatalogueGrid rows={enrolled} />
        </div>
      )}
      <div className="space-y-3">
        {enrolled.length > 0 && <h2 className="text-lg font-semibold">Discover more</h2>}
        <CatalogueGrid rows={discover} />
      </div>
    </div>
  )
}
