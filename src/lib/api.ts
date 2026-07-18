// Data access for the academy SPA — Neon Data API (PostgREST) over the
// serving views from academy-admin migration 011 (catalogue, module_browser)
// and the RLS-gated content table.
//
// Configuration is build-time env (no secrets — the Data API URL and the
// auth publishable key are public-by-design; RLS is the gate):
//   VITE_DATA_API_URL  — Data API base URL for the podzone-training branch.
// When unset the client serves labelled demo fixtures so the deployed shell
// demonstrates the UI without a backend (architecture v2 §5: the bundle must
// never carry credentials or curriculum content — fixtures are placeholder
// copy only).

export interface CatalogueRow {
  id: number
  slug: string
  title: string
  tier: string | null
  version: string | null
  description: string | null
  access: boolean
}

export interface ModuleRow {
  id: number
  curriculum_id: number
  code: string | null
  slug: string
  title: string
  ordinal: number
  section_count: number
}

export interface ContentRow {
  module_code: string
  section_id: string | null
  body: string
}

import { getAccessToken } from '@/lib/auth'

const DATA_API_URL: string | undefined = import.meta.env.VITE_DATA_API_URL

export const demoMode = !DATA_API_URL

async function get<T>(pathAndQuery: string): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`${DATA_API_URL}${pathAndQuery}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    throw new Error(`Data API ${res.status} on ${pathAndQuery}`)
  }
  return res.json() as Promise<T>
}

// --- Demo fixtures (shape-identical to the 011 views; placeholder copy) ----

const demoCatalogue: CatalogueRow[] = [
  {
    id: 1,
    slug: 'prompt-engineering',
    title: 'Prompt Engineering',
    tier: 'paid',
    version: null,
    description: 'Prompting foundations to advanced context engineering.',
    access: true,
  },
  {
    id: 2,
    slug: 'code-ai',
    title: 'Code AI',
    tier: 'free',
    version: null,
    description: 'AI-assisted software development: tooling, workflow, judgement.',
    access: false,
  },
]

const demoModules: ModuleRow[] = [
  {
    id: 1,
    curriculum_id: 1,
    code: 'T039',
    slug: 'module-t039-acceptance',
    title: 'T-039 Acceptance Module',
    ordinal: 999,
    section_count: 1,
  },
]

const demoContent: ContentRow[] = [
  {
    module_code: 'T039',
    section_id: '00-acceptance',
    body:
      '# Demo section\n\nThis is placeholder demo copy rendered because the SPA is not yet\nconnected to the Neon Data API. Real sections are served from the\nRLS-gated content table once P1.2 wiring lands.',
  },
]

// --- Queries ---------------------------------------------------------------

export async function fetchCatalogue(): Promise<CatalogueRow[]> {
  if (demoMode) return demoCatalogue
  return get<CatalogueRow[]>('/catalogue?order=title')
}

export async function fetchModules(curriculumId: number): Promise<ModuleRow[]> {
  if (demoMode) return demoModules.filter((m) => m.curriculum_id === curriculumId)
  return get<ModuleRow[]>(`/module_browser?curriculum_id=eq.${curriculumId}&order=ordinal`)
}

export async function fetchContent(
  curriculumId: number,
  moduleCode: string,
): Promise<ContentRow[]> {
  if (demoMode) return demoContent.filter((c) => c.module_code === moduleCode)
  return get<ContentRow[]>(
    `/content?curriculum_id=eq.${curriculumId}&module_code=eq.${encodeURIComponent(moduleCode)}` +
      '&select=module_code,section_id,body&order=section_id',
  )
}
