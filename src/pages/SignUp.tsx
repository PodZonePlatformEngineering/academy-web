// Prebuilt Stack sign-up (T-085, academy-web#36 item 2). The prebuilt
// <SignIn/> page's "Don't have an account? Sign up" link resolves here (see
// stackConfig.urls.signUp in src/lib/auth.ts) instead of the SDK's default
// {origin}/handler/sign-up — a StackHandler route this hash-routed app does
// not host, which previously bounced the visitor back to the apex.
//
// Shares AuthPageShell with SignIn.tsx (the ONE shared StackClientApp,
// T-084) — never build a second instance.

import { SignUp as PrebuiltSignUp } from '@stackframe/react'
import AuthPageShell from '@/components/AuthPageShell'
import BetterAuthSignUpForm from '@/components/BetterAuthSignUpForm'
import { authProduct } from '@/lib/authProduct'

export default function SignUp() {
  return (
    <AuthPageShell>
      {authProduct() === 'better-auth' ? <BetterAuthSignUpForm /> : <PrebuiltSignUp />}
    </AuthPageShell>
  )
}
