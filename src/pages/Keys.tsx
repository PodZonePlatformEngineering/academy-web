// Device-local credentials panel (T-040 Task 1, architecture v2 §3.2-B).
// Entry, live validation, clear/replace for the trainee's two BYO keys.

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { fetchCatalogue, type CatalogueRow } from '@/lib/api'
import {
  clearKey,
  getKey,
  maskKey,
  setKey,
  validateAnthropicKey,
  validateQdrantKey,
  type KeyKind,
  type ValidationResult,
} from '@/lib/keys'
import { contentCollection, tutorConfigured } from '@/lib/tutorConfig'

interface KeyPanelProps {
  kind: KeyKind
  title: string
  custody: string
  placeholder: string
  validate: (key: string) => Promise<ValidationResult>
}

function KeyPanel({ kind, title, custody, placeholder, validate }: KeyPanelProps) {
  const [stored, setStored] = useState<string | null>(() => getKey(kind))
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)

  const saveAndValidate = async () => {
    const value = draft.trim()
    if (!value) return
    setBusy(true)
    setResult(null)
    const res = await validate(value)
    setResult(res)
    if (res.ok) {
      setKey(kind, value)
      setStored(value)
      setDraft('')
    }
    setBusy(false)
  }

  const clear = () => {
    clearKey(kind)
    setStored(null)
    setResult(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {stored ? (
            <Badge variant="secondary">stored on this device</Badge>
          ) : (
            <Badge variant="outline">not set</Badge>
          )}
        </div>
        {/* §3.2-B custody labelling — the trainee must see whose key and whose spend this is. */}
        <CardDescription>{custody}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {stored && (
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
            <code className="text-sm">{maskKey(stored)}</code>
            <Button variant="outline" size="sm" onClick={clear}>
              Clear from this device
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="password"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            placeholder={stored ? `Replace: ${placeholder}` : placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
          />
          <Button size="sm" onClick={saveAndValidate} disabled={busy || !draft.trim()}>
            {busy ? 'Validating…' : 'Validate & save'}
          </Button>
        </div>
        {result && (
          <p className={`text-sm ${result.ok ? 'text-muted-foreground' : 'text-destructive'}`}>
            {result.detail}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function Keys() {
  const [entitled, setEntitled] = useState<CatalogueRow | null>(null)
  const [catalogueError, setCatalogueError] = useState<string | null>(null)

  useEffect(() => {
    // The Qdrant probe needs a collection the key should be scoped to —
    // first entitled curriculum from the catalogue (RLS-derived access flag).
    fetchCatalogue().then(
      (rows) => setEntitled(rows.find((c) => c.access) ?? null),
      (e: Error) => setCatalogueError(e.message),
    )
  }, [])

  if (!tutorConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tutor keys</CardTitle>
          <CardDescription>
            The tutor is not configured in this deployment (backend, auth, or retrieval
            endpoint missing) — key entry is disabled.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Your keys</h1>
        <p className="text-sm text-muted-foreground">
          Your key, your device, your spend. Both keys are stored only in this browser —
          they are never sent to the academy platform and never stored in our database.
          Clearing a key here removes it completely.
        </p>
      </div>
      <KeyPanel
        kind="anthropic"
        title="Anthropic API key"
        custody="Your own Anthropic key pays for tutor inference (D-2). Validation makes one 1-token call — a fraction of a cent of your own spend. The key travels directly from this browser to Anthropic only."
        placeholder="sk-ant-…"
        validate={validateAnthropicKey}
      />
      <KeyPanel
        kind="qdrant"
        title="Course-content retrieval key"
        custody="Your issued read-only retrieval key, delivered at enrolment. It is scoped to exactly the course collections you are entitled to — the key itself is the entitlement. The key travels directly from this browser to the retrieval cluster only."
        placeholder="paste the key from your enrolment delivery"
        validate={(key) => {
          if (!entitled) {
            return Promise.resolve({
              ok: false,
              detail: catalogueError
                ? `Cannot probe — catalogue unavailable (${catalogueError}).`
                : 'Cannot probe — no entitled curriculum found for your account (sign in first).',
            })
          }
          return validateQdrantKey(key, contentCollection(entitled.slug))
        }}
      />
    </div>
  )
}
