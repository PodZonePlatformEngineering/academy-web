// Tutor plane configuration — build-time env, public-by-design (architecture
// v2 §5: the bundle carries no credentials; the trainee's device-local key
// is the gate).
//
//   VITE_TUTOR_MODEL  — the single model config seam. Default: claude-sonnet-5
//                       — current Sonnet, near-Opus quality on the reasoning
//                       work a Socratic tutor does, at ~30% of Opus per-token
//                       price. The trainee pays for inference (D-2), so the
//                       default leans cost-conscious without dropping to the
//                       cheapest tier; operators can override per deployment.
//
// The tutor is "configured" (env-gating pattern from api.ts/auth.ts) when the
// data plane and the auth plane have endpoints. Retrieval rides the data
// plane since B-12 (rag_search under RLS; in-browser embedding) — there is no
// separate retrieval endpoint any more.

import { demoMode } from '@/lib/api'
import { authConfigured } from '@/lib/auth'

export const TUTOR_MODEL: string = import.meta.env.VITE_TUTOR_MODEL || 'claude-sonnet-5'

export const tutorConfigured = !demoMode && authConfigured
