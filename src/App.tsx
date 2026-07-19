import { HashRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { demoMode } from '@/lib/api'
import { authConfigured, signIn, signOut } from '@/lib/auth'
import { AuthStateProvider, useAuthState } from '@/lib/auth-state'
import { routeDecision } from '@/lib/routing'
import { tutorConfigured } from '@/lib/tutorConfig'
import Catalogue from '@/pages/Catalogue'
import Curriculum from '@/pages/Curriculum'
import Keys from '@/pages/Keys'
import Landing from '@/pages/Landing'
import Tutor from '@/pages/Tutor'

function AuthControls() {
  const { user, ready, setUser } = useAuthState()

  if (!authConfigured || !ready) return null
  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {user.displayName ?? user.email ?? 'Signed in'}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut().then(() => setUser(null))}
        >
          Sign out
        </Button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => signIn('google')}>
        Sign in with Google
      </Button>
      <Button variant="outline" size="sm" onClick={() => signIn('github')}>
        Sign in with GitHub
      </Button>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-heading text-lg font-semibold">
              PodZone Academy
            </Link>
            <Link to="/catalogue" className="text-sm text-muted-foreground hover:text-foreground">
              Catalogue
            </Link>
            {tutorConfigured && (
              <Link to="/keys" className="text-sm text-muted-foreground hover:text-foreground">
                Your keys
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            {demoMode && <Badge variant="outline">demo data — backend not connected</Badge>}
            <Badge variant="secondary">MVP</Badge>
            <AuthControls />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  )
}

function NotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Not found</CardTitle>
        <CardDescription>
          No such page. <Link to="/" className="underline">Back to the academy</Link>.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

// The B7 front-door rule, applied once above the route table — the decision
// itself is pure and lives (with its tests) in lib/routing.ts.
function RouteGate({ children }: { children: React.ReactNode }) {
  const { visitor } = useAuthState()
  const { pathname } = useLocation()
  const decision = routeDecision(pathname, visitor)
  if (decision.action === 'hold') return null
  if (decision.action === 'redirect') return <Navigate to={decision.to} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthStateProvider>
      <HashRouter>
        <RouteGate>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/catalogue"
              element={
                <Shell>
                  <Catalogue />
                </Shell>
              }
            />
            <Route
              path="/curriculum/:slug"
              element={
                <Shell>
                  <Curriculum />
                </Shell>
              }
            />
            <Route
              path="/curriculum/:slug/tutor"
              element={
                <Shell>
                  <Tutor />
                </Shell>
              }
            />
            <Route
              path="/keys"
              element={
                <Shell>
                  <Keys />
                </Shell>
              }
            />
            <Route
              path="*"
              element={
                <Shell>
                  <NotFound />
                </Shell>
              }
            />
          </Routes>
        </RouteGate>
      </HashRouter>
    </AuthStateProvider>
  )
}
