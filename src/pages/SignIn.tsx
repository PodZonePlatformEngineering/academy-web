// Prebuilt Stack sign-in (T-082) — a single "Sign in" button (App.tsx topbar,
// Landing's hero + closing CTA) now navigates here instead of triggering a
// hard-coded google/github OAuth call. The method list (Google, GitHub,
// Microsoft, passkey, email/password, magic link) comes entirely from the
// Neon Auth ("Hexclave") project's own dashboard config via @stackframe/react's
// prebuilt <SignIn/> — that is the point of this change, so it is never
// hard-coded here.
//
// The provider shell (StackProvider+StackTheme, the ONE shared StackClientApp
// from src/lib/auth.ts) is shared with SignUp.tsx via AuthPageShell (T-085) —
// see its module note for why a second instance must never be built.

import { SignIn as PrebuiltSignIn } from '@stackframe/react'
import AuthPageShell from '@/components/AuthPageShell'
import BetterAuthSignInForm from '@/components/BetterAuthSignInForm'
import { authProduct } from '@/lib/authProduct'

export default function SignIn() {
  return (
    <AuthPageShell>
      {authProduct() === 'better-auth' ? <BetterAuthSignInForm /> : <PrebuiltSignIn />}
    </AuthPageShell>
  )
}
