import { describe, expect, it } from 'vitest'
import { isGated, legacyRedirect, routeDecision } from '@/lib/routing'

describe('isGated', () => {
  it('gates the tutor, the scoreboard, and home', () => {
    expect(isGated('/tutor')).toBe(true)
    expect(isGated('/scoreboard')).toBe(true)
    expect(isGated('/home')).toBe(true)
  })

  it('leaves browse surfaces open', () => {
    expect(isGated('/')).toBe(false)
    expect(isGated('/library')).toBe(false)
    expect(isGated('/library/prompt-eng')).toBe(false)
    expect(isGated('/tutor/extra')).toBe(false)
  })
})

describe('routeDecision — the home route', () => {
  it('lands signed-out visitors on the landing', () => {
    expect(routeDecision('/', 'signed-out')).toEqual({ action: 'render' })
  })

  it('sends signed-in visitors to the tutor — the B8 default view (was the catalogue)', () => {
    expect(routeDecision('/', 'signed-in')).toEqual({
      action: 'redirect',
      to: '/tutor',
    })
  })

  it('holds until the session resolves — no landing flash for signed-in', () => {
    expect(routeDecision('/', 'unknown')).toEqual({ action: 'hold' })
  })
})

describe('routeDecision — legacy redirects (every pre-B8 bookmark still lands)', () => {
  it('sends /catalogue to /library', () => {
    expect(legacyRedirect('/catalogue')).toEqual({ to: '/library' })
  })

  it('sends /curriculum/:slug to /library/:slug', () => {
    expect(legacyRedirect('/curriculum/prompt-eng')).toEqual({ to: '/library/prompt-eng' })
  })

  it('sends /curriculum/:slug/tutor to /tutor, carrying the slug to record as last-used', () => {
    expect(legacyRedirect('/curriculum/prompt-eng/tutor')).toEqual({
      to: '/tutor',
      recordCurriculum: 'prompt-eng',
    })
  })

  it('sends /keys to /home', () => {
    expect(legacyRedirect('/keys')).toEqual({ to: '/home' })
  })

  it('leaves current paths alone', () => {
    for (const path of ['/', '/tutor', '/library', '/library/prompt-eng', '/scoreboard', '/home', '/nope']) {
      expect(legacyRedirect(path)).toBeNull()
    }
  })

  it.each<[string, string]>([
    ['/catalogue', '/library'],
    ['/curriculum/prompt-eng', '/library/prompt-eng'],
    ['/keys', '/home'],
  ])('rewrites %s for any visitor state (the gate applies on the target)', (path, to) => {
    expect(routeDecision(path, 'unknown')).toEqual({ action: 'redirect', to })
    expect(routeDecision(path, 'signed-out')).toEqual({ action: 'redirect', to })
    expect(routeDecision(path, 'signed-in')).toEqual({ action: 'redirect', to })
  })

  it('rewrites the legacy tutor deep link with its slug for any visitor state', () => {
    for (const visitor of ['unknown', 'signed-out', 'signed-in'] as const) {
      expect(routeDecision('/curriculum/prompt-eng/tutor', visitor)).toEqual({
        action: 'redirect',
        to: '/tutor',
        recordCurriculum: 'prompt-eng',
      })
    }
  })

  it('still strands a signed-out visitor on the landing via the rewrite target', () => {
    // /keys → /home is visitor-blind; the gate then bounces /home to "/".
    expect(routeDecision('/home', 'signed-out')).toEqual({ action: 'redirect', to: '/' })
  })
})

describe('routeDecision — gated deep links', () => {
  it.each(['/tutor', '/scoreboard', '/home'])(
    'signed-out %s falls back to the landing',
    (path) => {
      expect(routeDecision(path, 'signed-out')).toEqual({ action: 'redirect', to: '/' })
    },
  )

  it.each(['/tutor', '/scoreboard', '/home'])('signed-in %s renders', (path) => {
    expect(routeDecision(path, 'signed-in')).toEqual({ action: 'render' })
  })

  it.each(['/tutor', '/scoreboard', '/home'])(
    'holds %s while the session resolves',
    (path) => {
      expect(routeDecision(path, 'unknown')).toEqual({ action: 'hold' })
    },
  )
})

describe('routeDecision — everything else is unaffected', () => {
  it.each<[string]>([['/library'], ['/library/prompt-eng'], ['/nope']])(
    '%s renders for any visitor state',
    (path) => {
      expect(routeDecision(path, 'unknown')).toEqual({ action: 'render' })
      expect(routeDecision(path, 'signed-out')).toEqual({ action: 'render' })
      expect(routeDecision(path, 'signed-in')).toEqual({ action: 'render' })
    },
  )
})
