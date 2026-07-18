import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { demoMode } from '@/lib/api'
import Catalogue from '@/pages/Catalogue'
import Curriculum from '@/pages/Curriculum'

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
          </div>
          <div className="flex items-center gap-2">
            {demoMode && <Badge variant="outline">demo data — backend not connected</Badge>}
            <Badge variant="secondary">MVP</Badge>
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
        Sign-in (Neon Auth) arrives with the P1.2 wiring.
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
    </HashRouter>
  )
}
