// Device-local trainee credentials (architecture v2 §3.2-A/B, D-2).
//
// One BYO key powers the tutor since B-12: the trainee's own Anthropic API
// key (their key, their device, their spend — never transmitted to platform
// services, never in Neon). Course-content retrieval needs no trainee key any
// more — it rides the signed-in session under RLS (rag_search).
//
// The key lives in browser localStorage only. Clearing it here is the
// complete removal — no platform copy exists. Validation is a live probe
// with the key itself: a minimal countable Messages call.

import Anthropic from '@anthropic-ai/sdk'
import { TUTOR_MODEL } from '@/lib/tutorConfig'

const ANTHROPIC_KEY = 'academy.anthropic_key'

// B-12 sweep: the retired trainee Qdrant key must not linger on devices that
// stored one under T-040 — it is dead (D-4 is no longer a trainee concern).
// (Guarded: offline tests import this module outside a browser.)
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('academy.qdrant_key')
}

export type KeyKind = 'anthropic'

const storageKey = (_kind: KeyKind) => ANTHROPIC_KEY

export function getKey(kind: KeyKind): string | null {
  return localStorage.getItem(storageKey(kind))
}

export function setKey(kind: KeyKind, value: string): void {
  localStorage.setItem(storageKey(kind), value.trim())
}

export function clearKey(kind: KeyKind): void {
  localStorage.removeItem(storageKey(kind))
}

export function haveTutorKey(): boolean {
  return Boolean(getKey('anthropic'))
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
