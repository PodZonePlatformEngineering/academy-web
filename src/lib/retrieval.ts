// Retrieval plane (B-12, T-043): in-browser embed → rag_search RPC under RLS.
//
// The browser embeds the query with transformers.js (embed.ts — the space the
// recall gate proved) and POSTs /rpc/rag_search via the Data API with the
// session JWT. Entitlement is RLS (academy-admin migrations 016/017): a
// cross-curriculum id or an anchorless session yields zero rows, not an
// error — no trainee retrieval credential exists any more (B-12 retired the
// D-4 key for trainees).

import { post } from '@/lib/api'
import { embedQuery } from '@/lib/embed'

export interface RetrievedPoint {
  score: number
  type: string | null
  module_id: string | null
  section_id: string | null
  title: string | null
  text: string
}

export const RETRIEVAL_LIMIT = 5

/** Search the active curriculum's points under the caller's entitlements. */
export async function retrieve(curriculumId: number, queryText: string): Promise<RetrievedPoint[]> {
  const embedding = await embedQuery(queryText)
  return post<RetrievedPoint[]>('/rpc/rag_search', {
    p_curriculum_id: curriculumId,
    p_embedding: embedding,
    p_limit: RETRIEVAL_LIMIT,
  })
}
