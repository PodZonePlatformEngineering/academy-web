// Neon Auth (Stack) client — headless wiring for the P1.2 sign-in round-trip.
//
// The SDK is used without StackProvider/StackHandler on purpose: the SPA is
// hash-routed on a Pages subpath, so the prebuilt handler routes would sit
// awkwardly across the fragment boundary. The return point must be configured
// explicitly — the SDK defaults urls.oauthCallback to {origin}/handler/
// oauth-callback (the StackHandler route), which does not exist here and 404s
// on Pages. We point it at the app root (Vite BASE_URL: /academy-web/ in the
// Pages build, / in dev); the provider bounces back with ?code=… in the query
// (before the hash, invisible to HashRouter), and completeOAuthCallback()
// exchanges it on mount.
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
  /** Provider profile image (B8: the Home nav icon); null when none. */
  profileImageUrl: string | null
}

let app: StackClientApp<true, string> | null = null

function stackApp(): StackClientApp<true, string> {
  if (!app) {
    app = new StackClientApp({
      projectId: projectId!,
      publishableClientKey: publishableClientKey!,
      tokenStore: 'cookie',
      urls: {
        // Must be RELATIVE — the SDK asserts it (HexclaveAssertionError otherwise,
        // which silently kills every sign-in click). BASE_URL is /academy-web/ on
        // Pages, / in dev; the SDK resolves it against the current origin.
        oauthCallback: import.meta.env.BASE_URL,
        // Post-auth redirect targets and the error page default to origin-root
        // /handler paths that don't exist on a Pages subpath deployment — after
        // a successful code exchange the SDK navigates to afterSignIn (observed
        // 404 at the origin root). Point everything at the app root.
        home: import.meta.env.BASE_URL,
        afterSignIn: import.meta.env.BASE_URL,
        afterSignUp: import.meta.env.BASE_URL,
        afterSignOut: import.meta.env.BASE_URL,
        error: import.meta.env.BASE_URL,
      },
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
  return {
    displayName: user.displayName,
    email: user.primaryEmail,
    profileImageUrl: user.profileImageUrl,
  }
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
