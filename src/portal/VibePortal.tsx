// VibeCreations landing page (PROJ-011/ACP-218) — the portal build's
// content when VITE_THEME=vibe pins this deployment. A fork of Portal.tsx
// rather than a conditional inside it: the PodZone Academy portal is a
// destination launcher (Training/Admin/Library), while VibeCreations is a
// standalone product marketing page with its own audience, copy and
// section structure. Sharing a component would mean threading two
// unrelated content trees through one set of conditionals for no reuse
// benefit — main.tsx picks between the two at the entry point instead.
//
// Content and structure are taken directly from the fetched Claude Design
// artifact (team-lead/briefs/reference/acp218-vibecreations-landing-design.html
// in the planning repo) — copy is verbatim, section order matches. Visual
// treatment is re-expressed through this app's own token/component layer
// (Button, Card, the vibe.css brand vars) rather than the artifact's
// standalone "Industry" design-system CSS, so it inherits dark mode and
// stays consistent with the rest of the white-label mechanism.

import {
  ArrowRight,
  Blocks,
  Compass,
  Layers,
  Rocket,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const NAV_LINKS = [
  { href: '#curriculum', label: 'Curriculum' },
  { href: '#how', label: 'How it works' },
  { href: '#who', label: "Who it's for" },
]

function BrandMark() {
  return (
    <span className="relative flex size-7 shrink-0 items-center justify-center border border-(--ink-900)">
      <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-primary" />
      <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-primary" />
    </span>
  )
}

function Nav() {
  return (
    <nav className="mx-auto flex max-w-6xl items-center gap-8 border-b px-6 py-5">
      <div className="flex items-center gap-2.5">
        <BrandMark />
        <span className="font-heading text-[17px] font-semibold tracking-[-0.01em]">
          VIBE CREATIONS
        </span>
      </div>
      <div className="flex flex-1 gap-6">
        {NAV_LINKS.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className="text-sm text-(--ink-700) opacity-75 hover:text-primary hover:opacity-100"
          >
            {label}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2.5">
        <Button variant="ghost" size="sm" asChild>
          <a href="#">Sign in</a>
        </Button>
        <Button size="sm" asChild>
          <a href="#">Start building</a>
        </Button>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-18 md:grid-cols-2">
      <div>
        <span className="micro inline-flex items-center border px-2.5 py-1 text-(--ink-700)">
          A PodZone Academy studio
        </span>
        <h1 className="mt-5 font-heading text-5xl leading-[1.05] font-semibold tracking-[-0.02em] text-balance">
          Ship AI systems.
          <br />
          Never read a <span className="text-primary">line of code.</span>
        </h1>
        <p className="mt-4 max-w-[520px] text-[17px] leading-relaxed text-(--ink-700)">
          Vibe Creations teaches the people who design, prompt, and wire up AI systems —
          not the ones who debug them. If you can describe how something should work,
          this curriculum gets it running.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <a href="#">
              Start building <ArrowRight />
            </a>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <a href="#how">See how it works</a>
          </Button>
        </div>
        <p className="mt-4 text-xs text-(--ink-400)">
          No prerequisite in programming. A working system by the end of week one.
        </p>
      </div>
      <div className="relative aspect-4/3 border border-(--ink-900)/20 bg-(--cream-100)">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-xs text-(--ink-400)"
          style={{
            backgroundImage:
              'linear-gradient(var(--ink-900) 1px, transparent 1px), linear-gradient(90deg, var(--ink-900) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundPosition: 'center',
            opacity: 0.06,
          }}
        />
        <span className="relative z-10 flex h-full items-center justify-center px-8 text-center text-sm text-(--ink-400)">
          System diagram
        </span>
      </div>
    </section>
  )
}

const WHO_FOR = [
  'You can describe a workflow clearly but have never opened a terminal',
  'You want to automate something at work without waiting on engineering',
  "You're comfortable directing AI tools, not writing for-loops",
]

const WHO_NOT_FOR = [
  'You already write and ship code — try our engineering track instead',
  "You're looking to learn programming fundamentals",
  'You want a certificate, not a working system',
]

function WhoItsFor() {
  return (
    <section id="who" className="mx-auto max-w-6xl px-6 py-16">
      <p className="micro text-primary">Who this is for</p>
      <h2 className="mt-2 max-w-[640px] font-heading text-3xl font-semibold tracking-[-0.01em] text-balance">
        Built for people who think in systems, not syntax
      </h2>
      <p className="mt-3 max-w-[560px] leading-relaxed text-(--ink-700)">
        Product managers, ops leads, founders, analysts — anyone who understands what a
        system should do and wants to build it with AI instead of a dev queue.
      </p>
      <div className="mt-8 grid gap-px overflow-hidden border bg-border md:grid-cols-2">
        <Card className="gap-3 rounded-none border-0 bg-background p-7">
          <p className="micro text-primary">You're in the right place if</p>
          <ul className="list-disc space-y-1.5 pl-[18px] text-sm leading-relaxed text-(--ink-700)">
            {WHO_FOR.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card className="gap-3 rounded-none border-0 bg-background p-7">
          <p className="micro text-primary">This isn't for you if</p>
          <ul className="list-disc space-y-1.5 pl-[18px] text-sm leading-relaxed text-(--ink-700)">
            {WHO_NOT_FOR.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  )
}

const STEPS = [
  {
    no: '01',
    icon: Compass,
    title: 'Frame the system',
    body: 'Turn a vague goal into inputs, outputs, and the decisions in between.',
  },
  {
    no: '02',
    icon: Layers,
    title: 'Prompt the logic',
    body: 'Write the instructions that make an AI model do the reasoning, reliably.',
  },
  {
    no: '03',
    icon: Wrench,
    title: 'Wire the tools',
    body: 'Connect the model to real data and real actions, no-code and low-code.',
  },
  {
    no: '04',
    icon: Rocket,
    title: 'Ship and watch it run',
    body: "Put it in front of real use, and learn to read whether it's working.",
  },
]

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-16">
      <p className="micro text-primary">How it works</p>
      <h2 className="mt-2 max-w-[640px] font-heading text-3xl font-semibold tracking-[-0.01em] text-balance">
        Four steps from idea to running system
      </h2>
      <p className="mt-3 max-w-[560px] leading-relaxed text-(--ink-700)">
        Each lesson ends with something live, not a quiz score.
      </p>
      <div className="mt-8 grid gap-px overflow-hidden border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ no, icon: Icon, title, body }) => (
          <Card key={no} className="gap-2 rounded-none border-0 bg-background p-6">
            <div className="flex items-center justify-between">
              <span className="font-heading text-sm text-primary">{no}</span>
              <Icon className="size-4 text-(--ink-400)" />
            </div>
            <p className="font-heading text-base font-semibold">{title}</p>
            <p className="text-[13px] leading-relaxed text-(--ink-600)">{body}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

const TRACKS = [
  {
    tag: 'Track 1',
    title: 'Automate your own work',
    body: 'Replace a recurring manual task with an AI-run workflow.',
  },
  {
    tag: 'Track 2',
    title: 'Build an internal tool',
    body: 'Give a team a system they can use without asking engineering for changes.',
  },
  {
    tag: 'Track 3',
    title: 'Ship a customer-facing product',
    body: 'Take a system from prototype to something real users touch.',
  },
]

function Curriculum() {
  return (
    <section id="curriculum" className="mx-auto max-w-6xl px-6 py-16">
      <p className="micro text-primary">Curriculum</p>
      <h2 className="mt-2 max-w-[640px] font-heading text-3xl font-semibold tracking-[-0.01em] text-balance">
        Three tracks, each ending in a shipped system
      </h2>
      <div className="mt-8 grid gap-px overflow-hidden border bg-border md:grid-cols-3">
        {TRACKS.map(({ tag, title, body }) => (
          <Card key={tag} className="gap-2.5 rounded-none border-0 bg-background p-6">
            <span className="micro inline-flex w-fit items-center bg-(--clay-50) px-2.5 py-1 text-primary">
              {tag}
            </span>
            <p className="font-heading text-base font-semibold">{title}</p>
            <p className="text-[13px] leading-relaxed text-(--ink-600)">{body}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function ClosingCta() {
  return (
    <section className="bg-(--ink-900) px-6 py-14 text-(--cream-50)">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
        <h2 className="max-w-[520px] font-heading text-[28px] leading-tight font-semibold">
          Your first working system is a few lessons away.
        </h2>
        <Button size="lg" className="bg-(--cream-50) text-(--ink-900) hover:bg-(--cream-100)" asChild>
          <a href="#">
            Start building <ArrowRight />
          </a>
        </Button>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t px-6 py-7">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-(--ink-600)">
        <span className="flex items-center gap-1.5">
          <Blocks className="size-3.5" />
          Vibe Creations — a PodZone Academy studio
        </span>
        <a href="https://vibecreations.net" className="hover:text-primary">
          vibecreations.net
        </a>
      </div>
    </footer>
  )
}

export default function VibePortal() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <WhoItsFor />
      <HowItWorks />
      <Curriculum />
      <ClosingCta />
      <Footer />
    </div>
  )
}
