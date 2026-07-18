// Neon Auth (Stack) client — headless wiring for the P1.2 sign-in round-trip.
//
// The SDK is used without StackProvider/StackHandler on purpose: the SPA is
// hash-routed on a Pages subpath, so the prebuilt handler routes would sit
// awkwardly across the fragment boundary. The headless flow is unaffected:
// signInWithOAuth() redirects out with the current URL as the return point
// (validated against the project's trusted domains), the provider bounces
// back with ?code=… in the query (before the hash, invisible to HashRouter),
// and completeOAuthCallback() exchanges it on mount.
//
// Configuration is build-time env — both values are public-by-design client
// identifiers (architecture v2 §5: no credentials in the bundle; RLS is the
// gate). When either is unset the app runs signed-out with auth UI hidden:
//   VITE_STACK_PROJECT_ID              — Neon Auth project id
//   VITE_STACK_PUBLISHABLE_CLIENT_KEY  — Neon Auth publishable client key

import { StackClientApp } from '@stackframe/js'

const projectId: string | undefined = import.meta.env.VITE_STACK_PROJECT_ID
const publishableClientKey: string | undefined = import.meta.env
  .VITE_STACK_PUBLISHABLE_CLIENT_KEY

export const authConfigured = Boolean(projectId && publishableClientKey)

export interface AuthUser {
  displayName: string | null
  email: string | null
}

let app: StackClientApp<true, string> | null = null

function stackApp(): StackClientApp<true, string> {
  if (!app) {
    app = new StackClientApp({
      projectId: projectId!,
      publishableClientKey: publishableClientKey!,
      tokenStore: 'cookie',
    })
  }
  return app
}

// One-shot: StrictMode remounts effects, but the code exchange must run once.
let callbackOnce: Promise<boolean> | null = null

/** Complete a pending OAuth redirect, if this load carries one. */
export function completeOAuthCallback(): Promise<boolean> {
  if (!authConfigured || !new URLSearchParams(window.location.search).has('code')) {
    return Promise.resolve(false)
  }
  callbackOnce ??= stackApp().callOAuthCallback()
  return callbackOnce
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!authConfigured) return null
  const user = await stackApp().getUser()
  if (!user) return null
  return { displayName: user.displayName, email: user.primaryEmail }
}

/** The Neon Auth session JWT for the Data API, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  if (!authConfigured) return null
  const user = await stackApp().getUser()
  if (!user) return null
  const { accessToken } = await user.getAuthJson()
  return accessToken
}

export async function signIn(provider: 'google' | 'github'): Promise<void> {
  await stackApp().signInWithOAuth(provider)
}

export async function signOut(): Promise<void> {
  const user = await stackApp().getUser()
  await user?.signOut()
}
