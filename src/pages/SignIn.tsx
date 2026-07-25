// Prebuilt Stack sign-in (T-082) — a single "Sign in" button (App.tsx topbar,
// Landing's hero + closing CTA) now navigates here instead of triggering a
// hard-coded google/github OAuth call. The method list (Google, GitHub,
// Microsoft, passkey, email/password, magic link) comes entirely from the
// Neon Auth ("Hexclave") project's own dashboard config via @stackframe/react's
// prebuilt <SignIn/> — that is the point of this change, so it is never
// hard-coded here.
//
// This needs its own StackClientApp instance — @stackframe/react's own class,
// built from the SAME stackConfig src/lib/auth.ts's headless app uses (not a
// forked copy: see that module's note on why oauthCallback/home/afterSignIn/
// afterSignUp/afterSignOut/error must stay BASE_URL-relative, which is what
// keeps the GH-Pages subpath instance working while root instances just work).
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
import { SignIn as PrebuiltSignIn, StackClientApp, StackProvider, StackTheme } from '@stackframe/react'
import { authConfigured, stackConfig } from '@/lib/auth'

const app = authConfigured ? new StackClientApp(stackConfig) : null

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
