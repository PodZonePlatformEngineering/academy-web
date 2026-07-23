// Home (B8 Task 3) — the trainee's own corner of the academy: who they are
// (Neon Auth identity), their device-local config (the key vault moved from
// the retired /keys page + the theme picker), and short static help. /keys
// redirects here.

import { Link } from 'react-router-dom'
import { Avatar } from '@/components/AppNav'
import KeyVault from '@/components/KeyVault'
import TrainingRepoCard from '@/components/TrainingRepoCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuthState } from '@/lib/auth-state'
import {
  pickedTheme,
  setPickedTheme,
  themeNames,
  themePinned,
  themeQueryOverride,
} from '@/lib/theme'

const themeLabels: Record<string, string> = {
  stock: 'Warm brand (stock)',
  quest: 'Quest Academy',
}

// Device-local theme choice — the third leg of the applyTheme precedence
// (?theme= demo links and VITE_THEME build pins both beat it). A pinned
// build never shows this card at all: white-label stays brand-locked.
function ThemePicker() {
  if (themePinned) return null
  const queryOverride = themeQueryOverride()
  const current = pickedTheme() ?? 'stock'
  const choose = (name: string) => {
    setPickedTheme(name === 'stock' ? null : name)
    // Reload rather than hot-swap: un-theming means removing already-injected
    // theme CSS, which a fresh load does uniformly for both directions — and
    // the choice surviving the reload is the persistence proof.
    window.location.reload()
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Theme</CardTitle>
        <CardDescription>
          How the academy looks on this device. Stored in this browser only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {['stock', ...themeNames].map((name) => (
          <label key={name} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="theme"
              value={name}
              checked={current === name}
              onChange={() => choose(name)}
              className="accent-(--color-primary)"
            />
            {themeLabels[name] ?? name}
          </label>
        ))}
        {queryOverride && (
          <p className="text-xs text-muted-foreground">
            This page was opened with a <code>?theme={queryOverride}</code> demo link, which
            overrides your choice for this visit.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

export default function Home() {
  const { user } = useAuthState()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="text-sm text-muted-foreground">
          Your profile, your device-local configuration, and where to find help.
        </p>
      </div>

      {user && (
        <Card>
          <CardContent className="flex items-center gap-4">
            <Avatar user={user} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.displayName ?? 'Unnamed'}</p>
              {user.email && (
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              )}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/profile">Manage profile</Link>
              </Button>
              <Badge variant="outline">Neon Auth identity</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opt-in, GitHub-gated training-repo self-service (T-077, subsumes
          T-062). Self-gating: renders nothing for a non-GitHub user with no
          repo, or in a demo build. */}
      <TrainingRepoCard />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Config</h2>
        <KeyVault />
        <ThemePicker />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Help</h2>
        <Card>
          <CardContent className="space-y-4">
            <HelpSection title="Getting an Anthropic key">
              The tutor runs on your own Anthropic API key: create one in the Anthropic
              console (console.anthropic.com → API keys) and save it under Config above.
              Inference is billed to your key — validation costs a fraction of a cent, and
              a typical tutoring exchange costs a few cents. Each reply shows its token
              counts so you can see your spend.
            </HelpSection>
            <HelpSection title="How the tutor grounds its answers">
              Your question is matched against the course material of your active
              curriculum — the matching runs in this browser, and retrieval covers exactly
              the curricula you are entitled to. The best-matching passages are handed to
              the model with your student context, and the chips above a reply show which
              passages grounded it.
            </HelpSection>
            <HelpSection title='What "self-attested" means'>
              Completion marks, streaks, XP, and tutor transcripts are recorded from your
              own browser under your own identity — the academy does not verify them. They
              are a motivational layer and a learning record, not a credential.
            </HelpSection>
            <HelpSection title="Where to get help">
              Ask your cohort operator or the PodZone team through your usual channel. If
              the header shows a “demo data” badge, this deployment is not connected to a
              backend — sign-in, the tutor, and progress are disabled there by design.
            </HelpSection>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
