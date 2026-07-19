# PodZone Academy — build conventions

React components from the live academy SPA (`academy-web`). No provider or wrapper is
required: every component renders standalone. Load `styles.css` (it carries the tokens,
the Inter Variable font, and all component CSS); dark mode = add the `dark` class to any
ancestor element.

## Styling idiom — Tailwind v4, compiled closure

This DS styles with Tailwind utility classes, but the shipped stylesheet contains ONLY
the utilities compiled from the app and its previews — an arbitrary utility name will
NOT resolve. For your own layout glue:

1. **Prefer component props/variants** (they carry the design language — see each
   component's docs).
2. **These verified utility families resolve** (semantic shadcn palette): `bg-primary`,
   `text-primary-foreground`, `bg-secondary`, `bg-muted`, `text-muted-foreground`,
   `bg-card`, `text-card-foreground`, `bg-destructive`, `border-border`; radii
   `rounded-md`/`rounded-lg`; spacing `gap-2`/`gap-3`/`gap-4`; type `text-xs`/`text-sm`,
   `font-medium`; layout `flex-wrap`.
3. **For anything else use inline `style={{}}` or the CSS variables directly**:
   `--background`, `--foreground`, `--primary`, `--muted`, `--card`, `--border`,
   `--radius`, `--font-sans` — e.g. `style={{ background: 'var(--muted)' }}`. Never
   invent utility class names.

## Component vocabulary

- **Primitives**: `Button` (6 variants, 6 sizes), `Badge` (5 variants), `Card` +
  `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`/`CardAction`.
- **Gamification (Trophy kit)**: `PointsBadge` (XP counter), `StreakBadge`,
  `StreakCalendar` (month view; week view is time-anchored — avoid in static designs),
  `StreakCard` (full streak module), `AchievementBadge`/`AchievementGrid`
  (earned = `achievedAt` set; locked = `achievedAt: null`; in-progress = `progress`
  0–1), `GamificationStrip` (compact XP/streak/level summary — pass `summary`, see its
  docs for the shape).
- Progress and gamification numbers are **self-attested** in this product — pair them
  with a `<Badge variant="secondary">self-attested</Badge>` where the app does.

## Where the truth lives

Read `styles.css` and its imports before styling; each component's `.prompt.md` and
`.d.ts` carry its exact API (the prop types were hand-verified against the app source).

## Idiomatic snippet

```jsx
const { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Button } = window.AcademyWeb
<Card style={{ maxWidth: 380 }}>
  <CardHeader>
    <CardTitle>Prompt Engineering</CardTitle>
    <CardDescription>Nine modules from fundamentals to agentic workflows.</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm">Module 3 · Programming with AI APIs — 6 sections.</p>
  </CardContent>
  <CardFooter className="flex-wrap gap-3">
    <Badge variant="secondary">Enrolled</Badge>
    <Button size="sm">Continue</Button>
  </CardFooter>
</Card>
```
