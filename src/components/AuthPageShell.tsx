// Shared StackProvider+StackTheme shell for the prebuilt auth pages
// (SignIn.tsx, SignUp.tsx — T-085). Extracted so both share the exact same
// wrapper instead of two copies drifting apart; built on the ONE shared
// StackClientApp from src/lib/auth.ts (T-084) — never construct a second
// instance here (see auth.ts's module note; academy-web#34's seam).
//
// No custom `theme` is passed to StackTheme: its default theme already
// tracks this app's light/dark state on its own (see SignIn.tsx's prior
// note) — the main app itself doesn't have a dark toggle today, so it stays
// on the light default.

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { StackProvider, StackTheme } from '@stackframe/react'
import { authConfigured, stackApp } from '@/lib/auth'

export default function AuthPageShell({ children }: { children: ReactNode }) {
  if (!authConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <p className="text-muted-foreground">Sign-in is not configured for this deployment.</p>
      </div>
    )
  }
  return (
    <StackProvider app={stackApp()}>
      <StackTheme>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
          <Link to="/" className="font-heading text-lg font-semibold text-foreground">
            PodZone Academy
          </Link>
          {children}
        </div>
      </StackTheme>
    </StackProvider>
  )
}
