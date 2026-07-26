// Prebuilt Stack sign-in (T-082) — a single "Sign in" button (App.tsx topbar,
// Landing's hero + closing CTA) now navigates here instead of triggering a
// hard-coded google/github OAuth call. The method list (Google, GitHub,
// Microsoft, passkey, email/password, magic link) comes entirely from the
// Neon Auth ("Hexclave") project's own dashboard config via @stackframe/react's
// prebuilt <SignIn/> — that is the point of this change, so it is never
// hard-coded here.
//
// This uses the ONE shared StackClientApp from src/lib/auth.ts (T-084) — the
// same @stackframe/react instance the headless helpers run against, passed to
// StackProvider here. It must NOT build its own: two instances disagree about
// the session after an OAuth round-trip, which is exactly the seam T-084 closed
// (see auth.ts's module note; academy-web#34).
//
// No custom `theme` is passed to StackTheme: its default theme already tracks
// this app's light/dark state on its own (it watches <html>'s class attribute
// for a "dark" token, which is exactly the idiom darkMode.ts/applyDark toggles
// in the portal — the main app itself doesn't have a dark toggle today, so it
// stays on the light default). Hand-mapping our CSS-variable tokens instead
// would need literal colours anyway (Stack parses them with the `color`
// package, not the browser), i.e. a second, driftable copy of the palette —
// exactly what this task's shared-config note warns against for auth, and the
// same principle applies here.

import { Link } from 'react-router-dom'
import { SignIn as PrebuiltSignIn, StackProvider, StackTheme } from '@stackframe/react'
import { authConfigured, stackApp } from '@/lib/auth'

const app = authConfigured ? stackApp() : null

export default function SignIn() {
  if (!app) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <p className="text-muted-foreground">Sign-in is not configured for this deployment.</p>
      </div>
    )
  }
  return (
    <StackProvider app={app}>
      <StackTheme>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
          <Link to="/" className="font-heading text-lg font-semibold text-foreground">
            PodZone Academy
          </Link>
          <PrebuiltSignIn />
        </div>
      </StackTheme>
    </StackProvider>
  )
}
