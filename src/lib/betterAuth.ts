// Neon Managed Better Auth client (ACP-428) — the 'better-auth' counterpart to
// src/lib/auth.ts's StackClientApp. Deliberately its own module, dynamically
// imported by auth.ts ONLY when authProduct() === 'better-auth': that keeps
// @neondatabase/neon-js's auth client (and this file) out of the 'stack'
// build's synchronous chunk, so the two Stack-Auth-backed deployments
// (academy-web / -qa) stay byte-for-byte unaffected.
//
// Neon Managed Better Auth has no prebuilt sign-in/sign-up UI (unlike Stack's
// <SignIn/>/<SignUp/>) — src/components/BetterAuthSignInForm.tsx and
// BetterAuthSignUpForm.tsx are a real (minimal) auth UI built on the
// programmatic API methods documented at
// https://neon.com/docs/auth/quick-start/react (signUp.email/signIn.email/
// getSession/signOut) and the JWT plugin's authClient.token() (
// https://neon.com/docs/auth/guides/plugins/jwt) for the Data API bearer
// token — same PostgREST Authorization: Bearer convention api.ts already
// uses for Stack.
import { createAuthClient } from '@neondatabase/neon-js/auth'

const NEON_AUTH_URL: string | undefined = import.meta.env.VITE_NEON_AUTH_URL

export const betterAuthConfigured = Boolean(NEON_AUTH_URL)

// Concrete (non-generic) wrapper so ReturnType below resolves createAuthClient's
// default BetterAuthVanillaAdapterInstance branch instead of the union of every
// adapter createAuthClient's generic supports (TS resolves ReturnType<typeof
// createAuthClient> against the type parameter's constraint, not its default).
function makeClient(url: string) {
  return createAuthClient(url)
}

// Lazy singleton — mirrors auth.ts's stackApp() pattern.
let client: ReturnType<typeof makeClient> | null = null

export function betterAuthClient(): ReturnType<typeof makeClient> {
  if (!client) {
    if (!NEON_AUTH_URL) throw new Error('VITE_NEON_AUTH_URL is not configured')
    client = makeClient(NEON_AUTH_URL)
  }
  return client
}

export interface BetterAuthUser {
  displayName: string | null
  email: string | null
  profileImageUrl: string | null
}

export async function getCurrentBetterAuthUser(): Promise<BetterAuthUser | null> {
  if (!betterAuthConfigured) return null
  const { data } = await betterAuthClient().getSession()
  if (!data?.user) return null
  return {
    displayName: data.user.name ?? null,
    email: data.user.email ?? null,
    profileImageUrl: data.user.image ?? null,
  }
}

/** The Better Auth session JWT for the Data API (15-min TTL, per Neon's JWT plugin). */
export async function getBetterAuthAccessToken(): Promise<string | null> {
  if (!betterAuthConfigured) return null
  const { data } = await betterAuthClient().token()
  return data?.token ?? null
}

export async function betterAuthSignOut(): Promise<void> {
  if (!betterAuthConfigured) return
  await betterAuthClient().signOut()
}

export interface BetterAuthResult {
  ok: boolean
  error: string | null
}

export async function betterAuthSignIn(email: string, password: string): Promise<BetterAuthResult> {
  const { error } = await betterAuthClient().signIn.email({ email, password })
  return { ok: !error, error: error?.message ?? null }
}

export async function betterAuthSignUp(
  name: string,
  email: string,
  password: string,
): Promise<BetterAuthResult> {
  const { error } = await betterAuthClient().signUp.email({ name, email, password })
  return { ok: !error, error: error?.message ?? null }
}
