// Retrieval plane (D-1/D-4, CC-087): server-side inference search on the
// ACTIVE curriculum's -content collection, authenticated with the trainee's
// device-local Qdrant key.
//
// The browser sends RAW query text as Document{text, model}; Qdrant embeds
// with the pinned in-cluster model and searches — no client embedding, no
// middle tier. Scope: the client chooses the collection for the active
// curriculum (CC-087); the key enforces it server-side — a cross-curriculum
// collection name is refused by Qdrant itself, which is the D-4 point.
// (The point-schema `tracks` filter is not applied: enrolments don't carry a
// track in schema v1, so there is nothing to filter on yet.)

import { getKey } from '@/lib/keys'
import { contentCollection, EMBED_MODEL, QDRANT_URL } from '@/lib/tutorConfig'

export interface RetrievedPoint {
  score: number
  type: string | null
  module_id: string | null
  section_id: string | null
  title: string | null
  text: string
}

interface QdrantScoredPoint {
  score: number
  payload?: Record<string, unknown> | null
}

export const RETRIEVAL_LIMIT = 5

/** Search the active curriculum's -content collection with the trainee key. */
export async function retrieve(slug: string, queryText: string): Promise<RetrievedPoint[]> {
  const key = getKey('qdrant')
  if (!QDRANT_URL || !key) {
    throw new Error('Retrieval not configured — enter your retrieval key under "Your keys".')
  }
  const collection = contentCollection(slug)
  const res = await fetch(`${QDRANT_URL}/collections/${collection}/points/query`, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: { text: queryText, model: EMBED_MODEL },
      limit: RETRIEVAL_LIMIT,
      with_payload: true,
    }),
  })
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Retrieval refused for ${collection} (HTTP ${res.status}) — your key is not scoped to this curriculum.`,
    )
  }
  if (!res.ok) {
    throw new Error(`Retrieval failed on ${collection} (HTTP ${res.status}).`)
  }
  const body = (await res.json()) as { result?: { points?: QdrantScoredPoint[] } }
  return (body.result?.points ?? []).map((p) => {
    const pl = p.payload ?? {}
    return {
      score: p.score,
      type: typeof pl.type === 'string' ? pl.type : null,
      module_id: typeof pl.module_id === 'string' ? pl.module_id : null,
      section_id: typeof pl.section_id === 'string' ? pl.section_id : null,
      title: typeof pl.title === 'string' ? pl.title : null,
      text: typeof pl.text === 'string' ? pl.text : '',
    }
  })
}
