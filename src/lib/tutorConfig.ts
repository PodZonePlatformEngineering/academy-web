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
//   VITE_TUTOR_MAX_TOKENS — output-budget cap (thinking + visible together).
//                       Default 8192. The old 2048 cap truncated 25% of live
//                       answers: on Sonnet 5 adaptive thinking is ON by default
//                       and shares this budget (measured 2026-07-30 — a 2048
//                       cap was fully consumed by thinking, 0 visible tokens).
//                       8192 with effort:medium finished every measured turn.
//                       The trainee pays for inference (D-2), so operators can
//                       tune it per deployment, matching VITE_TUTOR_MODEL.
//
//   VITE_TUTOR_THINKING_EFFORT — output_config.effort that bounds adaptive
//                       thinking spend. Default 'medium'. Unbounded adaptive
//                       thinking will consume the whole max_tokens budget on a
//                       demanding question; effort:medium keeps it in check.
//
// The tutor is "configured" (env-gating pattern from api.ts/auth.ts) when the
// data plane and the auth plane have endpoints. Retrieval rides the data
// plane since B-12 (rag_search under RLS; in-browser embedding) — there is no
// separate retrieval endpoint any more.

import { demoMode } from '@/lib/api'
import { authConfigured } from '@/lib/auth'

export const TUTOR_MODEL: string = import.meta.env.VITE_TUTOR_MODEL || 'claude-sonnet-5'

// Output budget (thinking + visible together). See the header note: the old
// 2048 cap was fully consumed by adaptive thinking on Sonnet 5, leaving 0
// visible tokens on demanding turns. 8192 clears both with headroom; operators
// tune per deployment because the trainee pays for inference (D-2).
export const TUTOR_MAX_TOKENS: number = Number(import.meta.env.VITE_TUTOR_MAX_TOKENS) || 8192

// Bounds adaptive-thinking spend so a single hard question can't drain the whole
// max_tokens budget. Sonnet 5 effort ladder: low | medium | high | xhigh | max.
export const TUTOR_THINKING_EFFORT: string =
  import.meta.env.VITE_TUTOR_THINKING_EFFORT || 'medium'

export const tutorConfigured = !demoMode && authConfigured
