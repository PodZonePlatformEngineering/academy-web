// Device-local trainee credentials (architecture v2 §3.2-A/B, D-2/D-4).
//
// Two BYO keys power the tutor: the trainee's own Anthropic API key (their
// key, their device, their spend — never transmitted to platform services,
// never in Neon) and their issued per-trainee Qdrant Database API key
// (read-only, scoped to the -content collections of entitled curricula; the
// key IS the retrieval entitlement, enforced by Qdrant server-side).
//
// Both live in browser localStorage only. Clearing them here is the complete
// removal — no platform copy exists. Validation is a live probe with the key
// itself: a minimal countable Messages call for Anthropic, a scoped
// server-side-inference query for Qdrant.

import Anthropic from '@anthropic-ai/sdk'
import { EMBED_MODEL, QDRANT_URL, TUTOR_MODEL } from '@/lib/tutorConfig'

const ANTHROPIC_KEY = 'academy.anthropic_key'
const QDRANT_KEY = 'academy.qdrant_key'

export type KeyKind = 'anthropic' | 'qdrant'

const storageKey = (kind: KeyKind) => (kind === 'anthropic' ? ANTHROPIC_KEY : QDRANT_KEY)

export function getKey(kind: KeyKind): string | null {
  return localStorage.getItem(storageKey(kind))
}

export function setKey(kind: KeyKind, value: string): void {
  localStorage.setItem(storageKey(kind), value.trim())
}

export function clearKey(kind: KeyKind): void {
  localStorage.removeItem(storageKey(kind))
}

export function haveBothKeys(): boolean {
  return Boolean(getKey('anthropic') && getKey('qdrant'))
}

/** Mask for display: first 7 + last 4 chars, never the middle. */
export function maskKey(value: string): string {
  if (value.length <= 14) return '••••'
  return `${value.slice(0, 7)}…${value.slice(-4)}`
}

export interface ValidationResult {
  ok: boolean
  detail: string
}

/**
 * Validate an Anthropic key with a minimal countable call: a 1-output-token
 * Messages request against the tutor model. It spends a fraction of a cent of
 * the trainee's own budget — that spend appearing on their console is the
 * point (proves the key is live and billable, D-2).
 */
export async function validateAnthropicKey(key: string): Promise<ValidationResult> {
  const client = new Anthropic({
    apiKey: key,
    // The D-2 CORS opt-in: sets anthropic-dangerous-direct-browser-access.
    // Safe here by design — the key is the trainee's own, entered on their
    // own device; there is no shared credential to protect.
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
  })
  try {
    const res = await client.messages.create({
      model: TUTOR_MODEL,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    })
    return { ok: true, detail: `Key OK — validated with a 1-token call to ${res.model}.` }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, detail: 'Anthropic rejected the key (authentication failed).' }
    }
    if (e instanceof Anthropic.PermissionDeniedError) {
      return { ok: false, detail: 'Key authenticated but lacks permission for the Messages API.' }
    }
    if (e instanceof Anthropic.APIError) {
      return { ok: false, detail: `Anthropic API error ${e.status ?? ''}: ${e.message}` }
    }
    return { ok: false, detail: `Could not reach the Anthropic API: ${String(e)}` }
  }
}

/**
 * Validate a trainee Qdrant key with a scoped probe: the same server-side
 * inference query the tutor runs, limit 1, against an entitled -content
 * collection. A 401/403 means the key is bad or not scoped to that
 * collection — which is exactly the D-4 entitlement boundary doing its job.
 */
export async function validateQdrantKey(
  key: string,
  entitledCollection: string,
): Promise<ValidationResult> {
  if (!QDRANT_URL) return { ok: false, detail: 'Retrieval endpoint not configured (VITE_QDRANT_URL).' }
  try {
    const res = await fetch(`${QDRANT_URL}/collections/${entitledCollection}/points/query`, {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: { text: 'validation probe', model: EMBED_MODEL },
        limit: 1,
        with_payload: false,
      }),
    })
    if (res.ok) {
      return { ok: true, detail: `Key OK — scoped query against ${entitledCollection} succeeded.` }
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        detail: `Qdrant refused the key for ${entitledCollection} (HTTP ${res.status}) — wrong key, revoked, or not scoped to this curriculum.`,
      }
    }
    return { ok: false, detail: `Qdrant returned HTTP ${res.status} probing ${entitledCollection}.` }
  } catch (e) {
    return { ok: false, detail: `Could not reach the retrieval endpoint: ${String(e)}` }
  }
}
