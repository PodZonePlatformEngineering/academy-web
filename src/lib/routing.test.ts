import { describe, expect, it } from 'vitest'
import { isGated, routeDecision } from '@/lib/routing'

describe('isGated', () => {
  it('gates the key vault and the tutor', () => {
    expect(isGated('/keys')).toBe(true)
    expect(isGated('/curriculum/prompt-eng/tutor')).toBe(true)
  })

  it('leaves browse surfaces open', () => {
    expect(isGated('/')).toBe(false)
    expect(isGated('/catalogue')).toBe(false)
    expect(isGated('/curriculum/prompt-eng')).toBe(false)
    expect(isGated('/keys/extra')).toBe(false)
  })
})

describe('routeDecision — the home route', () => {
  it('lands signed-out visitors on the landing', () => {
    expect(routeDecision('/', 'signed-out')).toEqual({ action: 'render' })
  })

  it('sends signed-in visitors to the catalogue (landing skipped)', () => {
    expect(routeDecision('/', 'signed-in')).toEqual({
      action: 'redirect',
      to: '/catalogue',
    })
  })

  it('holds until the session resolves — no landing flash for signed-in', () => {
    expect(routeDecision('/', 'unknown')).toEqual({ action: 'hold' })
  })
})

describe('routeDecision — gated deep links', () => {
  it.each(['/keys', '/curriculum/prompt-eng/tutor'])(
    'signed-out %s falls back to the landing',
    (path) => {
      expect(routeDecision(path, 'signed-out')).toEqual({ action: 'redirect', to: '/' })
    },
  )

  it.each(['/keys', '/curriculum/prompt-eng/tutor'])(
    'signed-in %s renders as before',
    (path) => {
      expect(routeDecision(path, 'signed-in')).toEqual({ action: 'render' })
    },
  )

  it('holds gated routes while the session resolves', () => {
    expect(routeDecision('/keys', 'unknown')).toEqual({ action: 'hold' })
  })
})

describe('routeDecision — everything else is unaffected', () => {
  it.each<[string]>([['/catalogue'], ['/curriculum/prompt-eng'], ['/nope']])(
    '%s renders for any visitor state',
    (path) => {
      expect(routeDecision(path, 'unknown')).toEqual({ action: 'render' })
      expect(routeDecision(path, 'signed-out')).toEqual({ action: 'render' })
      expect(routeDecision(path, 'signed-in')).toEqual({ action: 'render' })
    },
  )
})
