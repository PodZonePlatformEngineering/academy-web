// Front-door routing rule, v2 (B8 nav/IA rework, T-047).
//
// One pure decision, applied above the route table:
//   - Legacy paths from the pre-B8 table rewrite first, so every old bookmark
//     keeps working: /catalogue → /library, /curriculum/:slug →
//     /library/:slug, /curriculum/:slug/tutor → /tutor (carrying the slug so
//     the caller can record it as last-used — the tutor then opens on the
//     same curriculum), /keys → /home. The rewrite is visitor-independent;
//     the gate on the target applies on the next pass.
//   - "/" is the landing for signed-out visitors; signed-in ones go to the
//     tutor — the default view of the B8 IA (was the catalogue under B7).
//   - Gated routes — the tutor, the scoreboard, and home, which are
//     meaningless without a session — fall back to the landing when signed
//     out. Library browse (/library, /library/:slug) stays open to anyone,
//     exactly as the catalogue always was.
//   - While the session is still resolving, "/" and gated routes hold
//     (render nothing) rather than flash the wrong surface at a signed-in
//     visitor; unaffected routes never wait.
//
// Auth-unconfigured builds have no signed-in state by construction, so they
// serve the landing and keep gated routes shut — the demo shell still browses
// the library anonymously.

export type Visitor = 'unknown' | 'signed-out' | 'signed-in'

export type RouteDecision =
  | { action: 'render' }
  | { action: 'hold' }
  | { action: 'redirect'; to: string; recordCurriculum?: string }

const GATED_ROUTES = [/^\/tutor$/, /^\/scoreboard$/, /^\/home$/]

/** Routes that require a session to mean anything (BYO key, own-row data). */
export function isGated(pathname: string): boolean {
  return GATED_ROUTES.some((re) => re.test(pathname))
}

/** Pre-B8 paths → their new homes; null when the path is current. */
export function legacyRedirect(
  pathname: string,
): { to: string; recordCurriculum?: string } | null {
  if (pathname === '/catalogue') return { to: '/library' }
  if (pathname === '/keys') return { to: '/home' }
  const tutor = pathname.match(/^\/curriculum\/([^/]+)\/tutor$/)
  if (tutor) return { to: '/tutor', recordCurriculum: tutor[1] }
  const browse = pathname.match(/^\/curriculum\/([^/]+)$/)
  if (browse) return { to: `/library/${browse[1]}` }
  return null
}

export function routeDecision(pathname: string, visitor: Visitor): RouteDecision {
  const legacy = legacyRedirect(pathname)
  if (legacy) return { action: 'redirect', ...legacy }
  if (pathname === '/') {
    if (visitor === 'unknown') return { action: 'hold' }
    if (visitor === 'signed-in') return { action: 'redirect', to: '/tutor' }
    return { action: 'render' } // the landing
  }
  if (isGated(pathname)) {
    if (visitor === 'unknown') return { action: 'hold' }
    if (visitor === 'signed-out') return { action: 'redirect', to: '/' }
  }
  return { action: 'render' }
}
