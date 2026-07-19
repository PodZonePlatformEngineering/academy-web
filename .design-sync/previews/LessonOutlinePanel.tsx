import { LessonOutlinePanel, Badge } from 'academy-web'

export const WithProgress = () => (
  <LessonOutlinePanel
    style={{ width: 300 }}
    title="Prompt Engineering"
    subtitle="5 modules"
    progressPct={36}
    items={[
      { id: 1, label: 'Foundations of prompting', state: 'complete', meta: '4/4' },
      { id: 2, label: 'Structured outputs', state: 'complete', meta: '3/3' },
      { id: 3, label: 'Programming with AI APIs', state: 'in_progress', meta: '2/6' },
      { id: 4, label: 'Retrieval and grounding', state: 'not_started', meta: '0/5' },
      { id: 5, label: 'Agentic workflows', state: 'not_started', meta: '0/7' },
    ]}
    footer={<Badge variant="secondary">self-attested</Badge>}
  />
)

export const Minimal = () => (
  <LessonOutlinePanel
    style={{ width: 300 }}
    title="Code AI"
    subtitle="2 modules"
    items={[
      { id: 1, label: 'Tooling and setup' },
      { id: 2, label: 'Working with agents' },
    ]}
  />
)
