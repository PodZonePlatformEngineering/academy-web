// Front-door routing rule, v3 (T-073 self-service onboarding; v2 = B8 nav/IA
// rework, T-047).
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
//   - A signed-in visitor with no trainee profile yet is funnelled to
//     /profile (the self-service intake form) before the tutor or "/" — a
//     trainee anchor is what those surfaces need. The provisioning answer is
//     resolved once, post-auth, by the no-arg provision_or_link_trainee RPC
//     (which auto-links a pre-provisioned trainee like Eben, or reports
//     needs_profile without writing). While it is still resolving, the same
//     surfaces hold rather than flash the tutor and then bounce to /profile.
//   - /profile itself needs a session but not a profile: signed-out → landing,
//     resolving → hold, signed-in → render (form for needs-profile, view for
//     the already-provisioned).
//   - While the session is still resolving, "/" and gated routes hold
//     (render nothing) rather than flash the wrong surface at a signed-in
//     visitor; unaffected routes (library browse) never wait.
//
// Auth-unconfigured builds have no signed-in state by construction, so they
// serve the landing and keep gated routes shut — the demo shell still browses
// the library anonymously.

export type Visitor = 'unknown' | 'signed-out' | 'signed-in'

// Whether a signed-in visitor has a trainee profile yet. 'unknown' = the
// post-auth resolve RPC is still in flight; only consulted while signed-in.
export type ProvisionState = 'unknown' | 'needs-profile' | 'provisioned'

/** The self-service intake / profile route. */
export const PROFILE_ROUTE = '/profile'

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

export function routeDecision(
  pathname: string,
  visitor: Visitor,
  provision: ProvisionState = 'provisioned',
): RouteDecision {
  const legacy = legacyRedirect(pathname)
  if (legacy) return { action: 'redirect', ...legacy }

  // A signed-in visitor whose profile is still resolving must not flash a
  // trainee-anchored surface; once resolved, an unprovisioned one is funnelled
  // to the intake form. Returns null when the visitor may proceed as-is.
  const profileGate = (): RouteDecision | null => {
    if (visitor !== 'signed-in') return null
    if (provision === 'unknown') return { action: 'hold' }
    if (provision === 'needs-profile') return { action: 'redirect', to: PROFILE_ROUTE }
    return null
  }

  if (pathname === PROFILE_ROUTE) {
    if (visitor === 'unknown') return { action: 'hold' }
    if (visitor === 'signed-out') return { action: 'redirect', to: '/' }
    return { action: 'render' } // signed-in: intake form or profile view
  }

  if (pathname === '/') {
    if (visitor === 'unknown') return { action: 'hold' }
    if (visitor === 'signed-in') return profileGate() ?? { action: 'redirect', to: '/tutor' }
    return { action: 'render' } // the landing
  }

  if (isGated(pathname)) {
    if (visitor === 'unknown') return { action: 'hold' }
    if (visitor === 'signed-out') return { action: 'redirect', to: '/' }
    const gated = profileGate()
    if (gated) return gated
  }

  return { action: 'render' }
}
