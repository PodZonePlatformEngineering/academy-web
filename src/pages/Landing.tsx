// Signed-out front door (design wave B7, T-046) — adapted from the design's
// landing surface: nav lockup, display-type hero, feature blocks, dark
// how-band, white-label proof, closing CTA into the existing Neon Auth
// sign-in. The prototype pitched Telegram-native delivery; per D-14 that copy
// does not ship — everything below describes the product as it is today: a
// browser academy with RLS-gated curricula, a BYO-key tutor, and
// self-attested progress. Styling stays on the token layer (semantic vars +
// brand ramps), so `?theme=quest` re-themes this page like any other.
//
// In-page anchors are scrollIntoView calls, not href="#…" — the fragment
// belongs to HashRouter here.

import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Flame,
  KeyRound,
  Palette,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatBubble } from '@/components/ui/chat-bubble'
import { LessonCard } from '@/components/ui/lesson-card'
import { authConfigured, signIn } from '@/lib/auth'
import grainUrl from '@/assets/grain.svg'
import markUrl from '@/assets/podzone-cloud-mark.png'
import questCoatOfArmsUrl from '@/assets/quest-coat-of-arms.svg'
import questMascotUrl from '@/assets/quest-mascot.svg'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

/** The cloud mark on its white tile — the PNG ships a white ground, so the
 *  ring frames it as a deliberate app-icon chip on any surface. */
function BrandMark({ className }: { className: string }) {
  return (
    <img
      src={markUrl}
      alt=""
      className={`shrink-0 bg-white ring-1 ring-border ${className}`}
    />
  )
}

function Nav() {
  return (
    <nav className="mx-auto flex max-w-6xl items-center gap-7 px-6 py-4">
      <div className="flex items-center gap-2.5">
        <BrandMark className="size-8 rounded-lg" />
        <div>
          <p className="font-heading text-[17px] leading-tight font-bold">PodZone Academy</p>
          <p className="micro text-[9px] tracking-[0.14em] text-primary">
            Powered by PodZone.Cloud
          </p>
        </div>
      </div>
      <div className="hidden flex-1 gap-5 md:flex">
        {(
          [
            ['why', 'Why this works'],
            ['how', 'How it works'],
            ['whitelabel', 'For teams'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollTo(id)}
            className="cursor-pointer text-sm font-semibold text-(--ink-700) hover:text-primary"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2.5 md:ml-0">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/catalogue">Browse the catalogue</Link>
        </Button>
        {authConfigured && (
          <Button size="sm" className="px-4" onClick={() => scrollTo('signin')}>
            Sign in
          </Button>
        )}
      </div>
    </nav>
  )
}

/** The hero art: the tutor mid-conversation in a browser frame — the product
 *  itself, built from the B6 conversation components, standing in for the
 *  prototype's phone mock. */
function HeroVignette() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="overflow-hidden rounded-(--r-xl) border bg-background shadow-(--shadow-pop)">
        <div className="flex items-center gap-1.5 border-b bg-secondary px-4 py-3">
          <span className="size-2.5 rounded-full bg-(--clay-300)" />
          <span className="size-2.5 rounded-full bg-(--honey-300)" />
          <span className="size-2.5 rounded-full bg-(--sage-500)/60" />
          <span className="ml-2 min-w-0 flex-1 truncate rounded-full bg-background px-3 py-1 text-[11px] text-muted-foreground">
            academy — AI tutor · Prompt Engineering
          </span>
        </div>
        <div className="flex flex-col gap-2.5 p-4">
          <ChatBubble role="tutor">
            Morning. Module 03 unlocked overnight — six sections, mostly diagrams.
          </ChatBubble>
          <LessonCard
            className="max-w-[85%] self-start"
            eyebrow="Module 03 · Prompt Engineering"
            title="Programming with AI APIs"
            meta="6 sections · marks are self-attested"
          />
          <ChatBubble role="user">what does idempotency buy me again?</ChatBubble>
          <ChatBubble role="tutor" streaming>
            Retries without regret. Your own course notes put it best —
          </ChatBubble>
        </div>
      </div>
      <div className="absolute top-8 -right-3 hidden items-center gap-2 rounded-(--r-lg) border bg-background px-3.5 py-2.5 text-sm font-semibold text-(--sage-500) shadow-(--shadow-pop) sm:flex">
        <ShieldCheck className="size-4.5" /> RLS on every row
      </div>
      <div className="absolute bottom-14 -left-4 hidden items-center gap-2 rounded-(--r-lg) border bg-background px-3.5 py-2.5 text-sm font-semibold text-primary shadow-(--shadow-pop) sm:flex">
        <KeyRound className="size-4.5" /> Runs on your key
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pt-10 pb-20 lg:grid-cols-[1.05fr_1fr]">
      <div>
        <span className="micro inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-primary">
          <Sparkles className="size-3.5" /> A browser academy. Not another LMS.
        </span>
        <h1 className="mt-4 font-heading text-5xl font-semibold tracking-[-0.025em] text-balance sm:text-6xl sm:leading-[1.02]">
          Training that <em className="text-primary italic">actually</em> reaches your team.
        </h1>
        <p className="mt-4 max-w-[540px] text-lg leading-relaxed text-(--ink-700)">
          PodZone Academy is a browser tab that pulls its weight: your curricula behind
          row-level security, an AI tutor that runs on your own key and has read the
          whole syllabus, and streaks your team will pretend not to care about.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          {authConfigured ? (
            <Button className="px-4" onClick={() => signIn('google')}>
              Sign in with Google <ArrowRight />
            </Button>
          ) : (
            <Button className="px-4" asChild>
              <Link to="/catalogue">
                Browse the catalogue <ArrowRight />
              </Link>
            </Button>
          )}
          <Button variant="ghost" className="px-4" onClick={() => scrollTo('how')}>
            See how it works →
          </Button>
        </div>
        <div className="mt-9 flex flex-wrap gap-6">
          {(
            [
              ['0', 'secrets in the browser bundle'],
              ['100%', 'row-level security on reads'],
              ['∞', 'tutor questions, on your key'],
            ] as const
          ).map(([num, label]) => (
            <div key={label} className="max-w-36 text-[13px] text-(--ink-600)">
              <span className="block font-heading text-[28px] leading-none font-bold text-foreground">
                {num}
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>
      <HeroVignette />
    </section>
  )
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Curricula behind RLS',
    body:
      'Everyone sees exactly the curricula they are entitled to — enforced as rows ' +
      'in Postgres, not as promises in a config file.',
  },
  {
    icon: KeyRound,
    title: 'A tutor on your own key',
    body:
      'Ask "what’s idempotency again?" and get an answer rooted in your own ' +
      'course. The tutor calls Anthropic straight from your browser, on your key.',
  },
  {
    icon: Flame,
    title: 'Progress that sticks',
    body:
      'XP, levels, streaks, achievements — computed server-side from self-attested ' +
      'marks. A motivational layer, not a credential.',
  },
  {
    icon: Palette,
    title: 'White-label to the bone',
    body:
      'One theme file re-brands the whole academy — palette, type, radii, mascot. ' +
      'This very page changes outfits too.',
  },
] as const

function Features() {
  return (
    <section id="why" className="mx-auto max-w-6xl scroll-mt-6 px-6 py-16">
      <p className="micro text-primary">Why this works</p>
      <h2 className="mt-2 max-w-[800px] font-heading text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
        Your LMS doesn&rsquo;t have a problem. Your <em className="text-primary italic">open rate</em> does.
      </h2>
      <p className="mt-3 max-w-[640px] leading-relaxed text-(--ink-600)">
        If training lives in a heavyweight portal, half the team forgets the password by
        week two. This one is a single browser tab: sign in, your curricula are already
        there, and the tutor has read all of it.
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-(--r-xl) border bg-card p-7">
            <div className="mb-4 flex size-14 items-center justify-center rounded-(--r-lg) bg-(--clay-50) text-primary">
              <Icon className="size-6" />
            </div>
            <h3 className="font-heading text-xl font-semibold">{title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-(--ink-600)">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const HOW_STEPS = [
  {
    n: '01',
    title: 'Sign in',
    body: 'Google or GitHub, through Neon Auth. No new password to forget by week two.',
  },
  {
    n: '02',
    title: 'Open your curriculum',
    body:
      'Row-level security shows the curricula you are entitled to — modules, ' +
      'sections, labs. Nothing else.',
  },
  {
    n: '03',
    title: 'Bring your tutor key',
    body:
      'Paste your own Anthropic key. The tutor calls it straight from your ' +
      'browser — it never crosses our servers.',
  },
  {
    n: '04',
    title: 'Mark it, keep the streak',
    body:
      'Self-attested completion marks feed XP, streaks, and achievements. An ' +
      'honesty system, working as intended.',
  },
] as const

function HowBand() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-6 px-6 py-4">
      <div className="relative overflow-hidden rounded-(--r-xl) bg-(--ink-900) p-8 text-(--cream-50) sm:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-12 mix-blend-overlay"
          style={{ backgroundImage: `url(${grainUrl})`, backgroundSize: '320px' }}
        />
        <h2 className="relative max-w-[720px] font-heading text-3xl font-semibold tracking-[-0.02em] text-balance text-(--cream-50) sm:text-4xl">
          From sign-in to first section in about a minute.
        </h2>
        <div className="relative mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_STEPS.map(({ n, title, body }) => (
            <div key={n} className="rounded-(--r-lg) border border-(--cream-50)/18 p-6">
              <p className="font-mono text-[11px] font-bold text-(--ember-500)">{n}</p>
              <h4 className="mt-1.5 font-heading text-lg font-semibold">{title}</h4>
              <p className="mt-2 text-sm leading-normal text-(--ink-200)">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhiteLabel() {
  // The quest card depicts the OTHER brand, so its colours are deliberately
  // literal (the Quest ramp), not tokens — exactly like the prototype's card.
  // The link is the live proof: a full reload with ?theme=quest re-themes
  // everything on this page that IS on the token layer.
  const questHref = `${import.meta.env.BASE_URL}?theme=quest#/`
  return (
    <section id="whitelabel" className="mx-auto max-w-6xl scroll-mt-6 px-6 py-16">
      <p className="micro text-primary">White-labelled</p>
      <h2 className="mt-2 max-w-[800px] font-heading text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
        Your brand. Your tone. Even your mascot.
      </h2>
      <p className="mt-3 max-w-[640px] leading-relaxed text-(--ink-600)">
        Every installation re-themes from one token file — palette, type, radii,
        voice. Academy ships as <em>your</em> product, not ours.
      </p>
      <div className="mt-9 grid gap-5 sm:grid-cols-2">
        <div className="flex aspect-[4/3] flex-col rounded-(--r-xl) border bg-background p-7 shadow-(--shadow-pop)">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-xl font-semibold">PodZone Academy</h3>
              <p className="micro mt-1 text-primary">Default · warm + dry</p>
            </div>
            <BrandMark className="size-10 rounded-lg" />
          </div>
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
            &ldquo;Welcome back, explorer! Today we&rsquo;re climbing into the Volcano
            Maths Quest.&rdquo;
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
    <section id="signin" className="scroll-mt-6 px-6 py-20 text-center">
      <h2 className="mx-auto max-w-[700px] font-heading text-4xl font-semibold tracking-[-0.02em] text-balance sm:text-5xl">
        Your first section is a sign-in away.
      </h2>
      <p className="mx-auto mt-4 max-w-[560px] text-lg leading-relaxed text-(--ink-600)">
        Google or GitHub — row-level security finds your curricula, and the streak
        starts counting today.
      </p>
      <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-3">
        {authConfigured ? (
          <>
            <Button size="lg" className="px-5 text-[15px]" onClick={() => signIn('google')}>
              Sign in with Google <ArrowRight />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="px-5 text-[15px]"
              onClick={() => signIn('github')}
            >
              Sign in with GitHub
            </Button>
          </>
        ) : (
          <Button size="lg" className="px-5 text-[15px]" asChild>
            <Link to="/catalogue">
              Browse the catalogue <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t bg-card px-6 py-9">
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

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Features />
      <HowBand />
      <WhiteLabel />
      <ClosingCta />
      <Footer />
    </div>
  )
}
