import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            PodZone Academy
          </Link>
          <Badge variant="secondary">MVP</Badge>
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
        <CardTitle>Academy shell deployed</CardTitle>
        <CardDescription>
          B1 scaffold — Vite + React + Tailwind v4 + shadcn/ui, served from GitHub Pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Catalogue and module browser arrive with the auth build (P1.2 / P1.3).
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
    </HashRouter>
  )
}
