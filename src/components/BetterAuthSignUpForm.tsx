// Minimal Better Auth sign-up form (ACP-428) — see BetterAuthSignInForm.tsx's
// module comment for why src/lib/betterAuth.ts is imported dynamically here
// rather than at module top.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export default function BetterAuthSignUpForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { betterAuthSignUp } = await import('@/lib/betterAuth')
      const result = await betterAuthSignUp(name.trim() || email.split('@')[0], email, password)
      if (!result.ok) {
        setError(result.error ?? 'Sign-up failed')
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
      <h1 className="font-heading text-xl font-semibold text-foreground">Sign up</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <label className="flex flex-col gap-1 text-sm text-foreground">
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-border bg-background px-3 py-2"
        />
      </label>
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
          minLength={8}
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
        {submitting ? 'Signing up…' : 'Sign up'}
      </button>
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
