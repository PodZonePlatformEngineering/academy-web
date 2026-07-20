// Per-curriculum conversation cache (T-048 B9 Task 2).
//
// Mounted above the router so a curriculum's re-hydrated thread survives
// in-app navigation: leave /tutor for /library and come back and the thread is
// still there — no refetch, no dropped context. The curriculum switcher reads
// a different curriculum's cached thread (cold-filling it once on first open).
// This is UI memory only; the durable record is the `prompt` rows in Neon.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ChatTurn } from '@/lib/transcripts'

export interface CachedConversation {
  /** The rendered thread, oldest first. */
  turns: ChatTurn[]
  /** The open session new rounds append to, or null until one is opened. */
  sessionId: number | null
  /** Cold-fill has completed for this curriculum — do not refetch. */
  loaded: boolean
  /** "Load earlier" cursor: unloaded older session ids (newest first). */
  olderSessionIds: number[]
  /** "Load earlier" cursor: batch further back from here; null = exhausted. */
  oldestStartedAt: string | null
}

interface ConversationCache {
  conversations: Record<number, CachedConversation>
  /** Stable read for effects/callbacks (does not change identity). */
  getConversation: (curriculumId: number) => CachedConversation | undefined
  setConversation: (curriculumId: number, value: CachedConversation) => void
}

const Ctx = createContext<ConversationCache | null>(null)

export function ConversationCacheProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Record<number, CachedConversation>>({})
  // A ref mirror so getConversation stays stable and always reads the latest
  // (effects keyed on curriculum must not re-run on every appended turn).
  const ref = useRef(conversations)
  ref.current = conversations

  const getConversation = useCallback((id: number) => ref.current[id], [])
  const setConversation = useCallback(
    (id: number, value: CachedConversation) =>
      setConversations((prev) => ({ ...prev, [id]: value })),
    [],
  )

  const value = useMemo(
    () => ({ conversations, getConversation, setConversation }),
    [conversations, getConversation, setConversation],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useConversationCache(): ConversationCache {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useConversationCache used outside ConversationCacheProvider')
  return ctx
}
