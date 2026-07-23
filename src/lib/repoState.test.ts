import { describe, expect, it } from 'vitest'
import type { RepoState, RepoStatus } from '@/lib/api'
import { repoView } from '@/lib/repoState'

function state(repo_status: RepoStatus | null, repo_url: string | null = null): RepoState {
  return {
    github_login: 'octocat',
    repo_url,
    repo_status,
    repo_requested_at: null,
    repo_updated_at: null,
  }
}

describe('repoView — the (none) state', () => {
  it('offers the request control for a null repo and a null status', () => {
    for (const repo of [null, state(null)]) {
      const v = repoView(repo)
      expect(v.canRequest).toBe(true)
      expect(v.requestLabel).toBe('Request a training repo')
      expect(v.headline).toBe('Request a training repo')
      expect(v.showTransferHint).toBe(false)
    }
  })
})

describe('repoView — frontend-owned requested transition', () => {
  it('shows "being prepared" and offers no re-request', () => {
    const v = repoView(state('requested'))
    expect(v.tone).toBe('pending')
    expect(v.canRequest).toBe(false)
    expect(v.badge).toBe('Requested')
    expect(v.headline).toMatch(/being prepared/i)
  })
})

describe('repoView — backend-driven states (task 3)', () => {
  it('building/created show progress, no request', () => {
    for (const s of ['building', 'created'] as const) {
      const v = repoView(state(s))
      expect(v.tone).toBe('progress')
      expect(v.canRequest).toBe(false)
    }
  })

  it('transfer_pending surfaces the accept-on-GitHub instruction + repo link', () => {
    const v = repoView(state('transfer_pending', 'https://github.com/octocat/home-training-octocat'))
    expect(v.showTransferHint).toBe(true)
    expect(v.showRepoUrl).toBe(true)
    expect(v.tone).toBe('action')
    expect(v.headline).toMatch(/accept the transfer/i)
    expect(v.canRequest).toBe(false)
  })

  it('ready surfaces the repo URL and offers a new repo (a resting state)', () => {
    const v = repoView(state('ready', 'https://github.com/octocat/home-training-octocat'))
    expect(v.tone).toBe('ready')
    expect(v.showRepoUrl).toBe(true)
    expect(v.canRequest).toBe(true)
    expect(v.requestLabel).toBe('Request a new repo')
  })

  it('failed shows an error and a retry (a resting state)', () => {
    const v = repoView(state('failed'))
    expect(v.tone).toBe('error')
    expect(v.canRequest).toBe(true)
    expect(v.requestLabel).toBe('Try again')
  })
})

describe('repoView — only resting states (none / ready / failed) can re-request', () => {
  const restful: (RepoStatus | null)[] = [null, 'ready', 'failed']
  const busy: RepoStatus[] = ['requested', 'building', 'created', 'transfer_pending']
  it.each(restful)('canRequest is true for the resting state %s', (s) => {
    expect(repoView(state(s)).canRequest).toBe(true)
  })
  it.each(busy)('canRequest is false for the in-flight state %s', (s) => {
    expect(repoView(state(s)).canRequest).toBe(false)
  })
})
