import { HashRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppNav from '@/components/AppNav'
import { ConversationCacheProvider } from '@/components/ConversationCacheProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { recordCurriculumUsed } from '@/lib/activeCurriculum'
import { demoMode } from '@/lib/api'
import { authConfigured, signIn, signOut } from '@/lib/auth'
import { AuthStateProvider, useAuthState } from '@/lib/auth-state'
import { routeDecision } from '@/lib/routing'
import Catalogue from '@/pages/Catalogue'
import Curriculum from '@/pages/Curriculum'
import Home from '@/pages/Home'
import Landing from '@/pages/Landing'
import ProfileManagement from '@/pages/ProfileManagement'
import Scoreboard from '@/pages/Scoreboard'
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

// Shell v2 (B8): header keeps the brand lockup, the demo/MVP badges, and
// sign-out; the old header text links become the persistent icon nav —
// AppNav as a left rail on desktop and a bottom bar on mobile (the extra
// bottom padding keeps the bar off the page's tail).
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-heading text-lg font-semibold">
            PodZone Academy
          </Link>
          <div className="flex items-center gap-2">
            {demoMode && <Badge variant="outline">demo data — backend not connected</Badge>}
            <Badge variant="secondary">MVP</Badge>
            <AuthControls />
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-5xl items-start gap-2 px-4">
        <AppNav variant="rail" />
        <main className="min-w-0 flex-1 py-8 pb-24 md:pb-8">{children}</main>
      </div>
      <AppNav variant="bar" />
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

// The front-door rule (B7, extended by B8), applied once above the route
// table — the decision itself is pure and lives (with its tests) in
// lib/routing.ts.
function RouteGate({ children }: { children: React.ReactNode }) {
  const { visitor, provision } = useAuthState()
  const { pathname } = useLocation()
  const decision = routeDecision(pathname, visitor, provision)
  if (decision.action === 'hold') return null
  if (decision.action === 'redirect') {
    // The legacy tutor deep link carries its curriculum — record it as
    // last-used before landing on /tutor so the redirect opens the same
    // curriculum. Idempotent, so StrictMode's double render is harmless.
    if (decision.recordCurriculum) recordCurriculumUsed(decision.recordCurriculum)
    return <Navigate to={decision.to} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <AuthStateProvider>
      <ConversationCacheProvider>
        <HashRouter>
          <RouteGate>
          {/* Legacy paths (/catalogue, /curriculum/:slug[/tutor], /keys) have
              no Route entries — RouteGate rewrites them before matching. */}
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/tutor"
              element={
                <Shell>
                  <Tutor />
                </Shell>
              }
            />
            <Route
              path="/library"
              element={
                <Shell>
                  <Catalogue />
                </Shell>
              }
            />
            <Route
              path="/library/:slug"
              element={
                <Shell>
                  <Curriculum />
                </Shell>
              }
            />
            <Route
              path="/scoreboard"
              element={
                <Shell>
                  <Scoreboard />
                </Shell>
              }
            />
            <Route
              path="/home"
              element={
                <Shell>
                  <Home />
                </Shell>
              }
            />
            <Route
              path="/profile"
              element={
                <Shell>
                  <ProfileManagement />
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
      </ConversationCacheProvider>
    </AuthStateProvider>
  )
}
