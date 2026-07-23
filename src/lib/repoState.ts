// The git_repo state machine → Home copy (T-077, design §7.1). Pure and
// framework-free so the mapping is unit-tested without a DOM.
//
// Split ownership: the frontend sets only `requested`; the backend (academy-gui,
// task 3) owns building → created → transfer_pending → ready / failed. Only the
// gate + request + the `requested` view are exercisable end-to-end today; the
// later states are rendered here in full but stay backend-driven until task 3
// exists (the brief's deferrable tail — implemented, not stubbed).

import type { RepoState, RepoStatus } from '@/lib/api'

export type RepoTone = 'pending' | 'progress' | 'action' | 'ready' | 'error'

export interface RepoView {
  /** The card's lede line. */
  headline: string
  /** One sentence of explanation / instruction. */
  detail: string
  /** Badge tone for the status. */
  tone: RepoTone
  /** Short badge label mirroring the raw status. */
  badge: string
  /** Whether the repo URL (when present) should be surfaced as a link. */
  showRepoUrl: boolean
  /** transfer_pending: show the "accept the transfer on GitHub" instruction. */
  showTransferHint: boolean
  /** A resting state → offer the request control. */
  canRequest: boolean
  /** Label for the request control when canRequest. */
  requestLabel: string
}

const BADGE: Record<RepoStatus, string> = {
  requested: 'Requested',
  building: 'Building',
  created: 'Created',
  transfer_pending: 'Transfer pending',
  ready: 'Ready',
  failed: 'Failed',
}

/**
 * Map a trainee's git_repo state to Home copy. `null` (or a null status) is the
 * (none) state: no repo yet, offer the request control.
 */
export function repoView(repo: RepoState | null): RepoView {
  const status = repo?.repo_status ?? null

  switch (status) {
    case 'requested':
      return {
        headline: 'Your training repo is being prepared',
        detail:
          'We have your request. Your repository is queued to be created and transferred to your GitHub account — this can take a little while.',
        tone: 'pending',
        badge: BADGE.requested,
        showRepoUrl: false,
        showTransferHint: false,
        canRequest: false,
        requestLabel: '',
      }
    case 'building':
      return {
        headline: 'Building your training repo',
        detail: 'Your repository is being created from the training template.',
        tone: 'progress',
        badge: BADGE.building,
        showRepoUrl: false,
        showTransferHint: false,
        canRequest: false,
        requestLabel: '',
      }
    case 'created':
      return {
        headline: 'Your training repo has been created',
        detail:
          'Your repository is ready on our side and a transfer to your GitHub account is being set up.',
        tone: 'progress',
        badge: BADGE.created,
        showRepoUrl: true,
        showTransferHint: false,
        canRequest: false,
        requestLabel: '',
      }
    case 'transfer_pending':
      return {
        headline: 'Accept the transfer request on GitHub',
        detail:
          'We have sent your repository to your GitHub account. Open GitHub (your notifications, or the repository page) and accept the pending transfer to take ownership.',
        tone: 'action',
        badge: BADGE.transfer_pending,
        showRepoUrl: true,
        showTransferHint: true,
        canRequest: false,
        requestLabel: '',
      }
    case 'ready':
      return {
        headline: 'Your training repo is ready',
        detail:
          'Your repository is in your GitHub account. Clone it and follow its README to start the CLI-based training. Need a fresh one? You can request another.',
        tone: 'ready',
        badge: BADGE.ready,
        showRepoUrl: true,
        showTransferHint: false,
        canRequest: true,
        requestLabel: 'Request a new repo',
      }
    case 'failed':
      return {
        headline: "We couldn't prepare your training repo",
        detail:
          'Something went wrong while preparing your repository. You can try again — if it keeps failing, contact your cohort operator.',
        tone: 'error',
        badge: BADGE.failed,
        showRepoUrl: false,
        showTransferHint: false,
        canRequest: true,
        requestLabel: 'Try again',
      }
    default:
      // (none) — no repo requested yet.
      return {
        headline: 'Request a training repo',
        detail:
          'Prefer the command line? Request your own GitHub training repository: a personal repo, seeded from the training template, transferred to your GitHub account, with a CLI tutor that mirrors the web one. The web academy stays available either way.',
        tone: 'pending',
        badge: '',
        showRepoUrl: false,
        showTransferHint: false,
        canRequest: true,
        requestLabel: 'Request a training repo',
      }
  }
}
