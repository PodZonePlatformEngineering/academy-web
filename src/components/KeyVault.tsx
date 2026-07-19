// Device-local credentials panel (T-040 Task 1, architecture v2 §3.2-B).
// Entry, live validation, clear/replace for the trainee's BYO Anthropic key —
// the only trainee key since B-12 (retrieval rides the session under RLS).
// B8 moved this panel from the retired /keys page into Home's Config section;
// behaviour is unchanged.

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  clearKey,
  getKey,
  maskKey,
  setKey,
  validateAnthropicKey,
  type KeyKind,
  type ValidationResult,
} from '@/lib/keys'
import { tutorConfigured } from '@/lib/tutorConfig'

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
          <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
            <code className="text-sm">{maskKey(stored)}</code>
            <Button variant="outline" size="sm" onClick={clear}>
              Clear from this device
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="password"
            className="h-9 w-full rounded-lg border bg-white px-3 text-sm shadow-(--shadow-inset) transition-colors outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
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

export default function KeyVault() {
  if (!tutorConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tutor key</CardTitle>
          <CardDescription>
            The tutor is not configured in this deployment (backend or auth missing) — key
            entry is disabled.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Your key, your device, your spend. The key is stored only in this browser — it is
        never sent to the academy platform and never stored in our database. Clearing it
        here removes it completely. Course-content retrieval needs no key: it runs on
        your signed-in session and covers exactly the curricula you are entitled to.
      </p>
      <KeyPanel
        kind="anthropic"
        title="Anthropic API key"
        custody="Your own Anthropic key pays for tutor inference (D-2). Validation makes one 1-token call — a fraction of a cent of your own spend. The key travels directly from this browser to Anthropic only."
        placeholder="sk-ant-…"
        validate={validateAnthropicKey}
      />
    </div>
  )
}
