// Minimal Better Auth sign-in form (ACP-428) — the 'better-auth' counterpart
// to @stackframe/react's prebuilt <SignIn/> (no such prebuilt exists for
// Better Auth's client SDK). Imports src/lib/betterAuth.ts ONLY via a dynamic
// `import()` inside the submit handler, not at module top: this component is
// statically imported by src/pages/SignIn.tsx even in 'stack' builds (the
// branch just never renders it), so a top-level import here would still pull
// @neondatabase/neon-js into the Stack-Auth deployments' SignIn chunk.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export default function BetterAuthSignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { betterAuthSignIn } = await import('@/lib/betterAuth')
      const result = await betterAuthSignIn(email, password)
      if (!result.ok) {
        setError(result.error ?? 'Sign-in failed')
        return
      }
      window.location.href = import.meta.env.BASE_URL
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-card p-6"
    >
      <h1 className="font-heading text-xl font-semibold text-foreground">Sign in</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <label className="flex flex-col gap-1 text-sm text-foreground">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-border bg-background px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-foreground">
        Password
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-border bg-background px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/sign-up" className="underline">
          Sign up
        </Link>
      </p>
    </form>
  )
}
