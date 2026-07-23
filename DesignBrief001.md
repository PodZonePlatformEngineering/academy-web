# DesignBrief001 — PodZone Academy landing / portal page

**For:** Claude Design · **Repo:** academy-web · **Drafted by:** Hermes 2026-07-23, for
operator review · **Deploys as:** static `/index.html` at the site root (source lives in
a new `/index` directory; see the technical plan). Design-only brief — the dynamic
behaviours (login state, authorised links) are described so the layout accommodates them;
the wiring is the technical task, not this brief.

## 1. What to design

A **landing / portal page** — the front door for the whole PodZone Academy suite at the
root domain (e.g. `academy.vibecreations.net`). It is **not** the training app itself
(that's the existing academy-web SPA, linked from here). It has **two states**:

- **Signed out** — marketing + a **Sign in** call to action (Google or GitHub, matching
  the app's auth). This is the persuasive surface: what PodZone Academy is and why.
- **Signed in** — a compact **app launcher**: the marketing recedes, and the authorised
  destinations come forward (see §3). A returning user should land here and get straight
  to Training in one click.

## 2. Design system

Use the **academy-web design system** — the same tokens, fonts, and components the SPA
uses (design-sync: `--font-display` Bricolage Grotesque for headings, `--font-body` Plus
Jakarta Sans, `--font-mono` JetBrains Mono; the Button/Badge/Card primitives; the warm
brand palette on the CSS-var layer). It must be **theme-able**: the same white-label
override mechanism the SPA uses (`?theme=` / `VITE_THEME`, a CSS file overriding the brand
vars) should re-skin this page too — the operator is producing a **vibe-coding theme** for
a `vibecreations.net` instance, and this page is part of what that theme re-brands.
Light + dark both supported (the `dark` class idiom).

## 3. The authorised destinations (signed-in state)

Three launch targets. Show/emphasise per authorisation (a user only sees what they're
entitled to reach):

1. **Training** — **the most prominent** (largest card / primary position). The core
   product: the AI-tutored, gamified RAG training experience (the academy-web SPA).
2. **Academy Admin** — for administrators only: manage trainees, curricula, cohorts,
   repos (the forthcoming academy-gui app). Secondary prominence; hidden for
   non-admins.
3. **Library** — a **new offering, placeholder for now**: design a card/slot for it with
   a "coming soon" treatment. It should look like a first-class peer of the other two,
   just not yet active.

Each destination card carries a **short plain-language explanation** (a sentence or two —
the copy is in §4/§5) so a newcomer understands what each is before clicking.

## 4. Marketing narrative (signed-out hero + sections)

Ground everything in real PodZone capability and the portfolio it can grow into. The
one-line positioning:

> **PodZone Academy — a general-purpose, gamified RAG suite. Built for training, useful
> well beyond it.**

Sub-narrative: a retrieval-augmented platform where knowledge is grounded, progress is
gamified (XP, levels, streaks, achievements), and the same engine that teaches a curriculum
can power product support, internal knowledge, or a white-labelled offering.

### Two ways to deliver

- **Git delivery — for builders and vibe-coders.** Work directly in your own repo with an
  AI tutor beside you. Ships with a best-practice `AGENTS.md` tuned for fast, high-quality
  delivery; **harness-level telemetry** for observability and governance; and an
  **integrated planning platform** for orchestrating work at scale.
- **Web delivery — for content creators and non-technical users.** A browser, no setup.
  **Bring your own key** (academy-web) today; a **corporate-API-key** option is coming
  (a thin React front end on a shared academy-api backend), with **PayPal pay-as-you-go**
  for individuals.

### Two AI roles — a Teacher and an Examiner

The tutor is **two distinct roles**, not one — a differentiator worth foregrounding:

- **The Teacher** — explains and draws out understanding, framed to *your* profile and
  *your* past conversations (it retrieves your own history as extra context, not just the
  courseware). It spells things out and only moves on when you're genuinely comfortable —
  patient, adaptive, Socratic.
- **The Examiner** — the one that **certifies**. It tests your understanding in the
  material's proper terminology, **open-book** (you can consult the courseware or outside
  sources while answering — it's checking understanding, not recall), and it's what
  **awards your gamification** — the XP, levels, and achievements are *attested*, not
  self-claimed.
- **Fair by design** — disagree with an assessment? **Attestation disputes go to
  arbitration** — a cohort-gamified, human-in-the-loop review — and what arbitration
  learns feeds back to **improve and grow the curricula** over time.

### RAG solutions — individual, corporate, white-label

- **Individual training** — a self-directed learner on any curriculum.
- **Cohort / class training** — managed curricula with **cohort-level gamification**;
  ideal for school- and organisation-scale programmes. (Cohort arbitration of attestation
  disputes lives here — peers + human review keep certification honest.)
- **Company product sales & support** — the same grounded-retrieval engine turned outward:
  product knowledge, sales enablement, support.

## 5. Copy the design should place (concise, editable)

- **Hero headline:** *A gamified RAG suite. Built for training — useful well beyond it.*
- **Hero sub:** *Grounded answers, real progress, and a tutor that knows your material.
  Sign in to start, or explore what PodZone Academy can do.*
- **Training card:** *Your AI tutor, your curriculum, your pace — grounded in real course
  material, with XP, streaks and levels that track genuine progress.*
- **Two-roles blurb (for the "Teacher and Examiner" section):** *A Teacher that adapts to
  you and never rushes — and an Examiner that certifies what you've actually understood.
  Rewards are earned and attested, disputes are arbitrated, and every arbitration makes
  the courseware better.*
- **Academy Admin card:** *Provision trainees, manage curricula and cohorts, and issue
  training repos — the operator console.* (admin-only)
- **Library card:** *A grounded knowledge library. Coming soon.*
- Section headers for §4's three blocks: **"Two ways to deliver"**, **"Solutions that
  scale"**, plus a closing sign-in CTA.

## 6. Constraints / notes for the design

- **Self-contained static output** — this becomes a root `/index.html`; keep it buildable
  as a standalone page (the design's HTML/CSS is adapted into `/index` — no dependency on
  the SPA's router).
- The **login control and the authorised-link visibility are dynamic** (driven by the
  Neon Auth session at runtime) — design both states, and design the launcher cards so
  individual ones can be shown/hidden without the layout breaking (e.g. a responsive grid
  that reflows from 1 to 3 cards).
- Keep it **light** — a fast front door, not a heavy app shell.
- Don't design the training app itself, the admin app, or the library — only the
  **portal** that links to them.

## 7. Deliverable

Claude Design produces the landing page (HTML + CSS on the academy DS, both states, theme-
aware). Hermes/Hephaestus then adapt it into `/index/index.html` and wire the auth +
links per the technical plan (`podzoneTeam/.../landing-portal-technical-plan.md`).
