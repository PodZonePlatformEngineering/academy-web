// Session state shared between the route gate and the header controls (B7).
//
// Before the landing existed, AuthControls owned the whole round-trip
// privately. Routing now needs the same answer — signed in, signed out, or
// still resolving — so the OAuth-callback completion + user fetch runs once
// here and everyone reads the result from context.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { completeOAuthCallback, getCurrentUser, type AuthUser } from '@/lib/auth'
import type { Visitor } from '@/lib/routing'

interface AuthState {
  user: AuthUser | null
  /** False until the OAuth callback (if any) and the user fetch settle. */
  ready: boolean
  visitor: Visitor
  setUser: (user: AuthUser | null) => void
}

const AuthStateContext = createContext<AuthState | null>(null)

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    completeOAuthCallback()
      .then(getCurrentUser)
      .then(setUser)
      .finally(() => setReady(true))
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      visitor: ready ? (user ? 'signed-in' : 'signed-out') : 'unknown',
      setUser,
    }),
    [user, ready],
  )
  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>
}

export function useAuthState(): AuthState {
  const state = useContext(AuthStateContext)
  if (!state) throw new Error('useAuthState requires an AuthStateProvider ancestor')
  return state
}
