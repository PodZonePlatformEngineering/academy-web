import { useEffect, useState } from 'react'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { demoMode } from '@/lib/api'
import {
  authConfigured,
  completeOAuthCallback,
  getCurrentUser,
  signIn,
  signOut,
  type AuthUser,
} from '@/lib/auth'
import { tutorConfigured } from '@/lib/tutorConfig'
import Catalogue from '@/pages/Catalogue'
import Curriculum from '@/pages/Curriculum'
import Keys from '@/pages/Keys'

function AuthControls() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    completeOAuthCallback()
      .then(getCurrentUser)
      .then(setUser)
      .finally(() => setReady(true))
  }, [])

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
            <Link to="/" className="text-lg font-semibold">
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

function Home() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>PodZone Academy</CardTitle>
        <CardDescription>
          Curriculum-based training with an AI tutor — progress-first MVP.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Browse the <Link to="/catalogue" className="underline underline-offset-4">catalogue</Link>.
        Sign in (top right) to see your entitlements and progress under RLS.
      </CardContent>
    </Card>
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

export default function App() {
  return (
    <HashRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/curriculum/:slug" element={<Curriculum />} />
          <Route path="/keys" element={<Keys />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
    </HashRouter>
  )
}
