// Session state shared between the route gate and the header controls (B7),
// extended (T-073) with the trainee-provisioning answer.
//
// Before the landing existed, AuthControls owned the whole round-trip
// privately. Routing now needs the same answer — signed in, signed out, or
// still resolving — so the OAuth-callback completion + user fetch runs once
// here and everyone reads the result from context. Once a user is known we
// also resolve their trainee status once via the no-arg provision RPC: it
// auto-links a pre-provisioned trainee (Eben + the alpha/beta cohort) and
// otherwise reports needs_profile without writing, which the route gate turns
// into a funnel to /profile.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { provisionOrLinkTrainee } from '@/lib/api'
import { completeOAuthCallback, getCurrentUser, type AuthUser } from '@/lib/auth'
import type { ProvisionState, Visitor } from '@/lib/routing'

interface AuthState {
  user: AuthUser | null
  /** False until the OAuth callback (if any) and the user fetch settle. */
  ready: boolean
  visitor: Visitor
  /** Trainee-provisioning status for a signed-in user; 'unknown' while resolving. */
  provision: ProvisionState
  setUser: (user: AuthUser | null) => void
  setProvision: (provision: ProvisionState) => void
}

const AuthStateContext = createContext<AuthState | null>(null)

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)
  const [provision, setProvision] = useState<ProvisionState>('unknown')

  useEffect(() => {
    let cancelled = false
    completeOAuthCallback()
      .then(getCurrentUser)
      .then((resolved) => {
        if (cancelled) return
        setUser(resolved)
        setReady(true)
        if (!resolved) return // signed out: provision is never consulted
        // Post-auth resolve. On failure, fall to needs-profile rather than
        // strand the user on the tutor's anchorless empty state — the form
        // re-calls the RPC, which returns exists/linked and proceeds if they
        // were in fact already provisioned. Self-correcting.
        provisionOrLinkTrainee()
          .then((result) => {
            if (!cancelled) {
              setProvision(result.status === 'needs_profile' ? 'needs-profile' : 'provisioned')
            }
          })
          .catch(() => {
            if (!cancelled) setProvision('needs-profile')
          })
      })
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      visitor: ready ? (user ? 'signed-in' : 'signed-out') : 'unknown',
      provision,
      setUser,
      setProvision,
    }),
    [user, ready, provision],
  )
  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>
}

export function useAuthState(): AuthState {
  const state = useContext(AuthStateContext)
  if (!state) throw new Error('useAuthState requires an AuthStateProvider ancestor')
  return state
}
