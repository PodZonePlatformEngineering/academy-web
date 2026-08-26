// Auth-product selector (ACP-428) — same read-once/exported-getter shape as
// src/lib/theme.ts's themePinned/activeTheme(). A build-time env var, not
// inferred from VITE_THEME: theme is a skin, auth product is backend wiring
// (the day a Stack-Auth-backed instance wants the vibe skin, or vice versa,
// conflating the two would silently break).
//
// 'stack' (default, matches today's behaviour with the var unset) or
// 'better-auth' (Neon Managed Better Auth, no prebuilt-UI client SDK — see
// src/lib/betterAuth.ts and src/components/BetterAuthSignInForm.tsx).

export type AuthProduct = 'stack' | 'better-auth'

const value: string | undefined = import.meta.env.VITE_AUTH_PRODUCT

/** The auth backend this build talks to. Unset/unrecognised values are 'stack'. */
export function authProduct(): AuthProduct {
  return value === 'better-auth' ? 'better-auth' : 'stack'
}
