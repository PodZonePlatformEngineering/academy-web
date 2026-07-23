// Home "training repo" card (T-077, subsumes T-062) — the opt-in, GitHub-gated
// self-service control for requesting a CLI training repository.
//
// Gate (design §7.1 / Q-1): shown only when a GitHub account is connected
// (resolved client-side via the Stack SDK — the DB never carries the provider,
// §3.1) OR when a git_repo state already exists. Hidden entirely for a
// Google-only user with no repo; they can still connect GitHub via Stack.
//
// The frontend owns ONLY the `requested` transition (the request_training_repo
// RPC, self-scoped in migration 029). The building → … → ready / failed states
// are backend-driven (academy-gui, task 3, not yet built): they render here in
// full but are not exercisable end-to-end until that backend advances them.

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  demoMode,
  fetchRepoState,
  requestTrainingRepo,
  type RepoState,
} from '@/lib/api'
import { getGithubConnection, type GithubConnection } from '@/lib/auth'
import { repoView, type RepoTone } from '@/lib/repoState'

const TONE_VARIANT: Record<RepoTone, 'secondary' | 'default' | 'success' | 'destructive'> = {
  pending: 'secondary',
  progress: 'secondary',
  action: 'default',
  ready: 'success',
  error: 'destructive',
}

export default function TrainingRepoCard() {
  const [loading, setLoading] = useState(true)
  const [github, setGithub] = useState<GithubConnection>({
    connected: false,
    login: null,
    accountId: null,
  })
  const [repo, setRepo] = useState<RepoState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    // The repo surface needs the Data API + Stack; a fixtures-only build can't
    // persist a request, so the card stays hidden there.
    if (demoMode) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([getGithubConnection(), fetchRepoState()])
      .then(([gh, state]) => {
        setGithub(gh)
        setRepo(state)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const view = repoView(repo)
  const hasState = Boolean(repo?.repo_status)

  // Gate: nothing to show for a non-GitHub user with no repo (and never in a
  // demo build). Also stay silent while resolving, to avoid a flash.
  if (demoMode || loading) return null
  if (!github.connected && !hasState) return null

  const canRequest = view.canRequest
  // A request must carry the handle the backend transfers to; if GitHub is
  // connected but we couldn't read the username (token/scopes), block the
  // request with a clear reason rather than sending an empty handle.
  const handleMissing = canRequest && github.connected && !github.login

  const onRequest = () => {
    if (!github.login) return
    setBusy(true)
    setError(null)
    requestTrainingRepo(github.login, github.accountId)
      .then((next) => setRepo(next))
      .catch(() => setError('Could not submit your request just now — please try again.'))
      .finally(() => setBusy(false))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{view.headline}</CardTitle>
          <div className="flex items-center gap-2">
            {view.badge && <Badge variant={TONE_VARIANT[view.tone]}>{view.badge}</Badge>}
            {github.connected && (
              <Badge variant="outline">
                GitHub{github.login ? ` · @${github.login}` : ' connected'}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>{view.detail}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {view.showRepoUrl && repo?.repo_url && (
          <p className="text-sm">
            <a
              href={repo.repo_url}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-4"
            >
              {repo.repo_url}
            </a>
          </p>
        )}

        {view.showTransferHint && (
          <p className="text-xs text-muted-foreground">
            GitHub will not move a repository without your consent, so you have to accept the
            transfer. Look for the request in your GitHub notifications
            {repo?.repo_url ? ' or on the repository page above' : ''}.
          </p>
        )}

        {canRequest && (
          <div className="space-y-2">
            <Button size="sm" onClick={onRequest} disabled={busy || handleMissing}>
              {busy ? 'Requesting…' : view.requestLabel}
            </Button>
            {handleMissing && (
              <p className="text-xs text-muted-foreground">
                We couldn't read your GitHub username. Reconnect your GitHub account and try
                again.
              </p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
