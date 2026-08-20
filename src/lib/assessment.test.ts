// Regression test for academy-gui#19 / ACP-403: a 401 (auth/JWKS failure)
// must surface as a real Error with the server's own message, not collapse
// into the same "Not entitled" message as a genuine 403 denial.

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({ getAccessToken: vi.fn().mockResolvedValue('tok') }))
vi.mock('@/lib/api', () => ({ demoMode: false, post: vi.fn() }))

describe('assessmentPost status handling', () => {
  const originalFetch = global.fetch

  // ASSESSMENT_API_URL is read from import.meta.env at module-eval time, so
  // the env var must be stubbed BEFORE the module is imported — a fresh
  // dynamic import per test, after resetModules + stubEnv.
  async function importAssessment() {
    vi.resetModules()
    vi.stubEnv('VITE_ASSESSMENT_API_URL', 'https://assessment.example')
    return import('@/lib/assessment')
  }

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('throws AssessmentDenied on 403 (genuine entitlement denial)', async () => {
    const { AssessmentDenied, fetchAssessmentQuestions } = await importAssessment()
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'not entitled' }),
    }) as unknown as typeof fetch

    await expect(fetchAssessmentQuestions('curr', 'mod', 'assess')).rejects.toBeInstanceOf(
      AssessmentDenied,
    )
  })

  it('surfaces a 401 as a real Error carrying the server message, not AssessmentDenied', async () => {
    const { AssessmentDenied, fetchAssessmentQuestions } = await importAssessment()
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'token verification failed: JWS Protected Header is invalid' }),
    }) as unknown as typeof fetch

    let caught: unknown
    try {
      await fetchAssessmentQuestions('curr', 'mod', 'assess')
    } catch (e) {
      caught = e
    }
    expect(caught).not.toBeInstanceOf(AssessmentDenied)
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe('token verification failed: JWS Protected Header is invalid')
  })

  it('falls back to a status-coded message when the 401 body has no error field', async () => {
    const { fetchAssessmentQuestions } = await importAssessment()
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => {
        throw new Error('not json')
      },
    }) as unknown as typeof fetch

    await expect(fetchAssessmentQuestions('curr', 'mod', 'assess')).rejects.toThrow(
      /Failed to retrieve questions \(401 on \/api\/assessment\/questions\)/,
    )
  })
})
