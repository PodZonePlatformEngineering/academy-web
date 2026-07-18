// Tutor plane configuration — build-time env, public-by-design (architecture
// v2 §5: the bundle carries no credentials; the trainee's device-local keys
// are the gates).
//
//   VITE_QDRANT_URL   — cloud Qdrant cluster endpoint (retrieval plane, D-1).
//   VITE_TUTOR_MODEL  — the single model config seam. Default: claude-sonnet-5
//                       — current Sonnet, near-Opus quality on the reasoning
//                       work a Socratic tutor does, at ~30% of Opus per-token
//                       price. The trainee pays for inference (D-2), so the
//                       default leans cost-conscious without dropping to the
//                       cheapest tier; operators can override per deployment.
//
// The tutor is "configured" (env-gating pattern from api.ts/auth.ts) when the
// data plane, the auth plane, and the retrieval plane all have endpoints.

import { demoMode } from '@/lib/api'
import { authConfigured } from '@/lib/auth'

export const QDRANT_URL: string | undefined = import.meta.env.VITE_QDRANT_URL

export const TUTOR_MODEL: string = import.meta.env.VITE_TUTOR_MODEL || 'claude-sonnet-5'

// Pinned by the ingest config (curriculum-point-schema §1) — query and upsert
// must name the same in-Qdrant model or the vectors don't align.
export const EMBED_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

/** Per-curriculum retrieval collection (D-4: collection = entitlement boundary). */
export function contentCollection(slug: string): string {
  return `academy-${slug}-content`
}

export const tutorConfigured = Boolean(QDRANT_URL) && !demoMode && authConfigured
