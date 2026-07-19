// Signed-out front door — the B7 routing rule (T-046 Task 2).
//
// One pure decision, applied above the route table:
//   - "/" is the landing for signed-out visitors and the catalogue for
//     signed-in ones (so a sign-in round-trip lands in the catalogue).
//   - Gated routes — the key vault and the tutor, which are meaningless
//     without a session — fall back to the landing when signed out. Every
//     other deep link (catalogue, curriculum browse) renders for anyone,
//     exactly as before B7.
//   - While the session is still resolving, "/" and gated routes hold
//     (render nothing) rather than flash the wrong surface at a signed-in
//     visitor; unaffected routes never wait.
//
// Auth-unconfigured builds have no signed-in state by construction, so they
// serve the landing and keep gated routes shut — the demo shell still browses
// the catalogue anonymously.

export type Visitor = 'unknown' | 'signed-out' | 'signed-in'

export type RouteDecision =
  | { action: 'render' }
  | { action: 'hold' }
  | { action: 'redirect'; to: string }

const GATED_ROUTES = [/^\/keys$/, /^\/curriculum\/[^/]+\/tutor$/]

/** Routes that require a session to mean anything (BYO key, entitlements). */
export function isGated(pathname: string): boolean {
  return GATED_ROUTES.some((re) => re.test(pathname))
}

export function routeDecision(pathname: string, visitor: Visitor): RouteDecision {
  if (pathname === '/') {
    if (visitor === 'unknown') return { action: 'hold' }
    if (visitor === 'signed-in') return { action: 'redirect', to: '/catalogue' }
    return { action: 'render' } // the landing
  }
  if (isGated(pathname)) {
    if (visitor === 'unknown') return { action: 'hold' }
    if (visitor === 'signed-out') return { action: 'redirect', to: '/' }
  }
  return { action: 'render' }
}
