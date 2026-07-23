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

// --- GitHub connected account (T-077) --------------------------------------
//
// "Is GitHub connected? + what handle" is answered ONLY here, client-side via
// the Stack SDK — the DB never carries it (the login provider is empty in
// neon_auth.users_sync.raw_json.oauth_providers even for OAuth logins; design
// §3.1 / Q-1). This is the gate for the Home "request a training repo" control
// and the source of the handle the request stores.

/** A GitHub identity connected to the signed-in Stack user (§3.1). */
export interface GithubConnection {
  /** A GitHub account is linked to this identity — the Home gate. */
  connected: boolean
  /** The GitHub username, when resolvable via the account token; else null. */
  login: string | null
  /** The stable GitHub numeric account id, when available. */
  accountId: string | null
}

const NO_GITHUB: GithubConnection = { connected: false, login: null, accountId: null }

/**
 * Resolve the signed-in user's GitHub connected account via the Stack SDK
 * (`getConnectedAccount('github')`, §3.1 / Q-1).
 *
 * Kept OFF getCurrentUser()/the auth-resolve path deliberately: it costs up to
 * two extra network round-trips (Stack account → a GitHub /user call for the
 * handle) that only Home needs, so folding it into the universal identity fetch
 * would delay every page's first render. Home calls it on mount instead. Always
 * resolves — never throws: a missing account, a revoked token, or a GitHub
 * hiccup degrades to connected:false / login:null rather than breaking Home.
 */
export async function getGithubConnection(): Promise<GithubConnection> {
  if (!authConfigured) return NO_GITHUB
  try {
    const user = await stackApp().getUser()
    if (!user) return NO_GITHUB
    // Primary: a connected GitHub account (the design's named API).
    const conn = await user.getConnectedAccount('github', { or: 'return-null' })
    if (conn) {
      const accountId = conn.providerAccountId ?? null
      let login: string | null = null
      try {
        const { accessToken } = await conn.getAccessToken()
        login = await githubLoginFromToken(accessToken)
      } catch {
        // token/scopes not available — still connected, handle stays unknown
      }
      return { connected: true, login, accountId }
    }
    // Fallback: a GitHub provider linked for sign-in only (some Stack configs
    // don't surface sign-in providers as connected accounts). Establishes the
    // gate; the handle stays unknown until a token is grantable.
    try {
      const providers = await user.listOAuthProviders()
      const gh = providers.find((p) => p.type === 'github' || p.id === 'github')
      if (gh) return { connected: true, login: null, accountId: gh.accountId ?? null }
    } catch {
      // ignore — fall through to not-connected
    }
    return NO_GITHUB
  } catch {
    return NO_GITHUB
  }
}

/** The GitHub username for an OAuth access token, via the public /user endpoint. */
async function githubLoginFromToken(accessToken: string): Promise<string | null> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (!res.ok) return null
  const body = (await res.json()) as { login?: string }
  return body.login ?? null
}

// --- Admin authorization (T-080 portal) ------------------------------------
//
// The portal's Academy Admin launch card renders only for administrators. The
// authorization is the shared Stack project-level `admin` permission — the same
// grant the forthcoming academy-gui admin app (T-077 task 3) gates on, not a
// demo toggle. `hasPermission(id)` (no scope arg) is a project permission on the
// current user. It degrades to false on any error or when the permission isn't
// configured yet, so the card simply stays hidden until an admin grant exists —
// the correct forward-looking default (the Admin destination isn't deployed).

/** Whether the signed-in user holds the shared `admin` project permission. */
export async function isAdmin(): Promise<boolean> {
  if (!authConfigured) return false
  try {
    const user = await stackApp().getUser()
    if (!user) return false
    return await user.hasPermission('admin')
  } catch {
    return false
  }
}

export async function signIn(provider: 'google' | 'github'): Promise<void> {
  await stackApp().signInWithOAuth(provider)
}

export async function signOut(): Promise<void> {
  const user = await stackApp().getUser()
  await user?.signOut()
}
