import { LessonCard } from 'academy-web'

export const Full = () => (
  <LessonCard
    style={{ maxWidth: 340 }}
    eyebrow="Module 03"
    title="Programming with AI APIs"
    meta="6 sections · ~45 min"
    actionLabel="Start lesson →"
  />
)

export const RetrievalChips = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 420 }}>
    <LessonCard variant="chip" eyebrow="M03/02" title="Streaming responses" meta="82%" />
    <LessonCard variant="chip" eyebrow="M03/04" title="Token counting and cost" meta="74%" />
    <LessonCard variant="chip" title="Course overview" meta="61%" />
  </div>
)

export const Plain = () => (
  <LessonCard
    style={{ maxWidth: 340 }}
    eyebrow="Module 07"
    title="Evaluations"
    meta="4 sections"
  />
)
