// Landing / portal page (PROJ-011/T-080, reworked T-082) — the front door for
// the whole PodZone Academy suite, served at the podzone.academy APEX as its
// own build target (VITE_TARGET=portal, base '/').
//
// T-082 (operator 2026-07-25): the portal logs nobody in. Cross-origin auth
// state never travelled cleanly between the apex and the sibling apps (the
// training app would pick a session up, the admin app would re-prompt), so
// the portal is now fully static — no @stackframe/* import, no auth network
// call on load. Each destination owns its own sign-in: Training and Academy
// Admin both present a single "Sign in" button of their own. Everything here
// is a plain link out. The Academy Admin card is always visible (its "Admin
// only" label is informational, not a gate — academy-gui's own isAdmin()
// check is the real gate now that the apex has no session to consult).
//
// Dark mode is unrelated to auth and stays in scope (operator 2026-07-23):
// the toggle drives the real `.dark` idiom.

import { useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Building2,
  Compass,
  GitBranch,
  Globe,
  GraduationCap,
  Moon,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import grainUrl from '@/assets/grain.svg'
import markUrl from '@/assets/podzone-cloud-mark.png'
import questCoatOfArmsUrl from '@/assets/quest-coat-of-arms.svg'
import questMascotUrl from '@/assets/quest-mascot.svg'
import { applyDark, initialDark } from './darkMode'

/** The launcher destinations — sibling apps on their own branded domains. */
const TRAINING_URL = 'https://www.podzone.academy'
const ADMIN_URL = 'https://admin.podzone.academy'

/** The cloud mark on its white tile — the PNG ships a white ground, so the
 *  ring frames it as a deliberate app-icon chip on any surface (as Landing). */
function BrandMark({ className }: { className: string }) {
  return (
    <img
      src={markUrl}
      alt=""
      className={cn('shrink-0 bg-white ring-1 ring-border', className)}
    />
  )
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      onClick={onToggle}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}

function Nav({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  return (
    <nav className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5">
      <div className="flex items-center gap-2.5">
        <BrandMark className="size-9 rounded-[10px]" />
        <div>
          <p className="font-heading text-[17px] leading-tight font-bold">PodZone Academy</p>
          <p className="micro text-[9px] tracking-[0.14em] text-primary">
            Powered by PodZone.Cloud
          </p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <ThemeToggle dark={dark} onToggle={onToggleDark} />
      </div>
    </nav>
  )
}

/* ------------------------------------------------------------------ *
 * Launcher — the front door itself, always visible                   *
 * ------------------------------------------------------------------ */

function LaunchCard({
  eyebrow,
  title,
  body,
  cta,
  href,
  icon: Icon,
  primary = false,
  disabled = false,
}: {
  eyebrow: string
  title: string
  body: string
  cta: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  primary?: boolean
  disabled?: boolean
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-(--r-lg)',
            primary
              ? 'bg-primary-foreground/15 text-primary-foreground'
              : 'bg-(--clay-50) text-primary',
          )}
        >
          <Icon className="size-5" />
        </span>
        <p
          className={cn(
            'micro',
            primary ? 'text-primary-foreground/90' : 'text-primary',
          )}
        >
          {eyebrow}
        </p>
      </div>
      <h3 className="mt-4 font-heading text-2xl font-semibold">{title}</h3>
      <p
        className={cn(
          'mt-2 flex-1 text-[15px] leading-relaxed',
          primary ? 'text-primary-foreground/85' : 'text-(--ink-600)',
        )}
      >
        {body}
      </p>
      <div className="mt-5">
        {disabled ? (
          <Button variant="secondary" disabled>
            {cta}
          </Button>
        ) : primary ? (
          <Button variant="secondary" className="bg-background text-primary" asChild>
            <a href={href}>
              {cta} <ArrowRight />
            </a>
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <a href={href}>
              {cta} <ArrowRight />
            </a>
          </Button>
        )}
      </div>
    </>
  )
  return (
    <div
      className={cn(
        'flex flex-col rounded-(--r-xl) border p-7',
        primary
          ? 'border-transparent bg-primary text-primary-foreground shadow-(--shadow-pop) sm:col-span-2'
          : 'bg-card shadow-(--shadow-soft)',
        disabled && 'opacity-60',
      )}
    >
      {inner}
    </div>
  )
}

function Launcher() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-10 pb-16">
      <p className="micro text-primary">Start here</p>
      <h1 className="mt-1.5 font-heading text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
        Where do you want to go?
      </h1>
      <p className="mt-3 max-w-[560px] text-lg leading-relaxed text-(--ink-700)">
        Pick a destination — each one handles its own sign-in.
      </p>
      <div className="mt-7 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <LaunchCard
          primary
          icon={GraduationCap}
          eyebrow="Core product"
          title="Training"
          body="Your AI tutor, your curriculum, your pace — grounded in real course material, with XP, streaks and levels that track genuine progress."
          cta="Open Training"
          href={TRAINING_URL}
        />
        <LaunchCard
          icon={ShieldCheck}
          eyebrow="Admin only"
          title="Academy Admin"
          body="Provision trainees, manage curricula and cohorts, and issue training repos — the operator console."
          cta="Open Admin"
          href={ADMIN_URL}
        />
        <LaunchCard
          disabled
          icon={BookOpen}
          eyebrow="Coming soon"
          title="Library"
          body="A grounded knowledge library. Coming soon."
          cta="Coming soon"
        />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * Supporting marketing content — static, no auth involved            *
 * ------------------------------------------------------------------ */

const AI_ROLES = [
  {
    title: 'The Teacher',
    body:
      'Explains and draws out understanding, framed to your profile and your past ' +
      'conversations. Patient, adaptive, Socratic — it only moves on when you’re ' +
      'genuinely comfortable.',
  },
  {
    title: 'The Examiner',
    body:
      'Certifies your understanding, open-book, in the material’s proper terminology. It ' +
      'awards your XP, levels and achievements — attested, not self-claimed.',
  },
] as const

function TwoRoles() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <p className="micro text-primary">Two AI roles</p>
      <h2 className="mt-2 max-w-[640px] font-heading text-3xl font-semibold tracking-[-0.01em] text-balance sm:text-4xl">
        A Teacher that adapts to you. An Examiner that certifies.
      </h2>
      <p className="mt-3 max-w-[640px] leading-relaxed text-(--ink-700)">
        Rewards are earned and attested, disputes are arbitrated, and every arbitration makes
        the courseware better.
      </p>
      <div className="mt-8 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {AI_ROLES.map(({ title, body }) => (
          <Card key={title} className="gap-3 p-7">
            <h3 className="font-heading text-xl font-semibold">{title}</h3>
            <p className="text-[15px] leading-relaxed text-(--ink-600)">{body}</p>
          </Card>
        ))}
      </div>
      <p className="mt-5 max-w-[640px] text-[13px] leading-relaxed text-(--ink-400)">
        Fair by design: disagree with an assessment? Attestation disputes go to arbitration —
        a cohort-gamified, human-in-the-loop review.
      </p>
    </section>
  )
}

const DELIVERY = [
  {
    icon: GitBranch,
    title: 'Git delivery — for builders and vibe-coders',
    body:
      'Work directly in your own repo with an AI tutor beside you. Ships with a ' +
      'best-practice AGENTS.md, harness-level telemetry, and an integrated planning ' +
      'platform.',
  },
  {
    icon: Globe,
    title: 'Web delivery — for content creators',
    body:
      'A browser, no setup. Bring your own key today; a corporate-API-key option is coming, ' +
      'with PayPal pay-as-you-go for individuals.',
  },
] as const

function DeliverBand() {
  return (
    <section className="px-6 py-4">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-(--r-xl) bg-[#2B1D17] p-8 text-(--cream-50) sm:p-12 dark:bg-[#1B120D]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-12 mix-blend-overlay"
          style={{ backgroundImage: `url(${grainUrl})`, backgroundSize: '320px' }}
        />
        <p className="relative micro text-(--honey-300)">Two ways to deliver</p>
        <div className="relative mt-5 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {DELIVERY.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-(--r-lg) border border-(--cream-50)/18 p-6">
              <Icon className="size-5 text-(--honey-300)" />
              <h3 className="mt-3 font-heading text-lg font-semibold text-(--cream-50)">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-(--ink-200)">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const SOLUTIONS = [
  {
    icon: Compass,
    title: 'Individual training',
    body: 'A self-directed learner on any curriculum.',
  },
  {
    icon: Users,
    title: 'Cohort / class training',
    body:
      'Managed curricula with cohort-level gamification, for school- and ' +
      'organisation-scale programmes.',
  },
  {
    icon: Building2,
    title: 'Company product sales & support',
    body:
      'The same grounded-retrieval engine turned outward — product knowledge, sales ' +
      'enablement, support.',
  },
] as const

function Solutions() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <p className="micro text-primary">Solutions that scale</p>
      <div className="mt-4 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        {SOLUTIONS.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="gap-2 p-6">
            <div className="mb-1 flex size-11 items-center justify-center rounded-(--r-lg) bg-(--clay-50) text-primary">
              <Icon className="size-5" />
            </div>
            <h3 className="font-heading text-base font-semibold">{title}</h3>
            <p className="text-[13px] leading-relaxed text-(--ink-600)">{body}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function WhiteLabel() {
  // The Quest card depicts the OTHER brand, so its colours are deliberately
  // literal (the Quest ramp), not tokens — exactly like the Landing precedent.
  // The link is the live proof: a full reload with ?theme=quest re-themes
  // everything on this page that IS on the token layer (main.tsx: applyTheme).
  const questHref = `${import.meta.env.BASE_URL}?theme=quest`
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <p className="micro text-primary">White-labelled</p>
      <h2 className="mt-2 max-w-[800px] font-heading text-3xl font-semibold tracking-[-0.01em] text-balance sm:text-4xl">
        Your brand. Your tone. Even your mascot.
      </h2>
      <div className="mt-8 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <div className="flex aspect-[4/3] flex-col rounded-(--r-xl) border bg-background p-7 shadow-(--shadow-pop)">
          <h3 className="font-heading text-xl font-semibold">PodZone Academy</h3>
          <p className="micro mt-1 text-primary">Default · warm + dry</p>
          <p className="mt-auto max-w-[80%] pt-4 text-[13px] leading-normal text-(--ink-600)">
            &ldquo;Lesson 3 is unlocked. No pressure, but the leaderboard is
            watching.&rdquo;
          </p>
        </div>
        <a
          href={questHref}
          className="relative flex aspect-[4/3] flex-col overflow-hidden rounded-(--r-xl) p-7 text-white shadow-(--shadow-pop)"
          style={{ background: 'linear-gradient(160deg, #2563EB, #1D4FCC)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-xl font-semibold">Quest Academy · Junior</h3>
              <p className="micro mt-1 text-[#FBBF24]">School · adventurous + playful</p>
            </div>
            <img src={questCoatOfArmsUrl} alt="" className="h-14 w-auto" />
          </div>
          <img
            src={questMascotUrl}
            alt=""
            aria-hidden="true"
            className="absolute -right-3 -bottom-5 h-32 w-auto"
          />
          <p className="mt-auto max-w-[62%] pt-4 text-[13px] leading-normal text-white/85">
            &ldquo;Welcome back, explorer! Today we&rsquo;re climbing into the Volcano Maths
            Quest.&rdquo;
          </p>
          <p className="micro mt-3 inline-flex items-center gap-1 text-[#FBBF24]">
            Try it live — ?theme=quest <ArrowRight className="size-3.5" />
          </p>
        </a>
      </div>
    </section>
  )
}

function ClosingCta() {
  return (
    <section className="px-6 py-16 text-center">
      <h2 className="mx-auto max-w-[700px] font-heading text-4xl font-semibold tracking-[-0.02em] text-balance sm:text-5xl">
        Your first section is one click away.
      </h2>
      <p className="mx-auto mt-4 max-w-[560px] text-lg leading-relaxed text-(--ink-600)">
        Row-level security finds your curricula the moment you sign in, and the streak starts
        counting today.
      </p>
      <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" className="px-5" asChild>
          <a href={TRAINING_URL}>
            Open Training <ArrowRight />
          </a>
        </Button>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t bg-card px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-[13px] text-(--ink-600)">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-6 rounded-md" />
          <span>© PodZone.Cloud Platform Engineering · Academy is a PodZone product</span>
        </div>
        <span className="micro text-(--ink-400)">Powered by PodZone.Cloud</span>
      </div>
    </footer>
  )
}

export default function Portal() {
  const [dark, setDark] = useState(initialDark)

  function toggleDark() {
    setDark((d) => {
      const next = !d
      applyDark(next)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav dark={dark} onToggleDark={toggleDark} />
      <Launcher />
      <TwoRoles />
      <DeliverBand />
      <Solutions />
      <WhiteLabel />
      <ClosingCta />
      <Footer />
    </div>
  )
}
