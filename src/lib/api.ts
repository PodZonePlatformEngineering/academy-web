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
  description: string | null
}

export interface ContentRow {
  module_code: string
  section_id: string | null
  body: string
}

import { getAccessToken } from '@/lib/auth'

const DATA_API_URL: string | undefined = import.meta.env.VITE_DATA_API_URL

export const demoMode = !DATA_API_URL

export async function get<T>(pathAndQuery: string): Promise<T> {
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

// PostgREST write / RPC. Inserts return the created row(s) via
// Prefer: return=representation; /rpc/ functions return their result directly.
export async function post<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`${DATA_API_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Data API ${res.status} on ${path}`)
  }
  return res.json() as Promise<T>
}

// PostgREST partial update (RLS decides which rows the filter may touch).
async function patch(pathAndQuery: string, body: unknown): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(`${DATA_API_URL}${pathAndQuery}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Data API ${res.status} on ${pathAndQuery}`)
  }
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
    description: 'A short demo module used to prove the acceptance path end to end.',
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

// --- Tutor preamble (U-6 RPC, migration 015) -------------------------------

export interface PreambleData {
  trainee: { id: number; display_name: string; email: string | null }
  active_curriculum: {
    id: number
    slug: string
    title: string
    description: string | null
    entitled: boolean
  } | null
  enrolments: unknown[]
  progress: unknown[]
  generated_at: string
}

/** Assembled student-context preamble under RLS; null when anchorless/demo. */
export async function fetchTutorPreamble(curriculumId: number): Promise<PreambleData | null> {
  if (demoMode) return null
  return post<PreambleData | null>('/rpc/tutor_preamble', { p_curriculum_id: curriculumId })
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

// --- Progress capture + gamification (T-042, admin migration 018) ----------
//
// The write path is the mark_progress RPC only — the 009 engine triggers turn
// the progress write into XP/streak/achievements server-side; the client
// never computes or writes gamification rows (D-6). Everything read here is
// RLS-gated to the caller's own rows.

export interface SectionRow {
  curriculum_id: number
  module_code: string
  kind: 'section' | 'lab'
  section_id: string | null
  anchor_point_id: string
  title: string
  point_count: number
}

export interface ProgressRow {
  id: number
  enrolment_id: number
  module_id: number
  state: 'not_started' | 'in_progress' | 'complete'
  point_id: string | null
}

export interface LevelRef {
  level: number
  name: string
  xp_threshold: number
}

export interface AwardRow {
  code: string
  awarded_at: string
  title: string
  icon: string | null
}

export interface StreakState {
  learner_id: number
  current_len: number
  longest_len: number
  last_active_date: string | null
}

export interface GamificationSummary {
  learner: { id: number; display_name: string | null; timezone: string }
  total_xp: number
  level: LevelRef | null
  next_level: LevelRef | null
  streak: StreakState | null
  awards: AwardRow[]
}

export interface MarkResult {
  state: 'in_progress' | 'complete'
  point_id: string
  module_complete: boolean
  summary: GamificationSummary | null
}

export interface AchievementRow {
  code: string
  title: string
  description: string | null
  icon: string | null
  criteria_kind: string
  params: Record<string, unknown>
}

export interface ActivityDayRow {
  learner_id: number
  day: string
  events: number
  points: number
}

const demoSections: SectionRow[] = [
  {
    curriculum_id: 1,
    module_code: 'T039',
    kind: 'section',
    section_id: '00',
    anchor_point_id: '00000000-0000-0000-0000-000000000000',
    title: 'Demo Section',
    point_count: 1,
  },
]

const demoSummary: GamificationSummary = {
  learner: { id: 0, display_name: 'Demo Learner', timezone: 'UTC' },
  total_xp: 125,
  level: { level: 2, name: 'Apprentice', xp_threshold: 100 },
  next_level: { level: 3, name: 'Practitioner', xp_threshold: 300 },
  streak: { learner_id: 0, current_len: 2, longest_len: 2, last_active_date: null },
  awards: [
    { code: 'first_xp', awarded_at: '2026-01-01T00:00:00Z', title: 'First Steps', icon: 'sparkles' },
  ],
}

export async function fetchSections(curriculumId: number): Promise<SectionRow[]> {
  if (demoMode) return demoSections
  return get<SectionRow[]>(
    `/section_browser?curriculum_id=eq.${curriculumId}&order=module_code,kind,section_id`,
  )
}

export interface EnrolmentRow {
  id: number
  curriculum_id: number
  enrolled_at: string
}

/** All of the caller's active enrolments (RLS: own rows only). */
export async function fetchEnrolments(): Promise<EnrolmentRow[]> {
  if (demoMode) return []
  return get<EnrolmentRow[]>(
    '/enrolment?status=eq.active&select=id,curriculum_id,enrolled_at&order=enrolled_at.desc',
  )
}

/** The caller's active enrolment for a curriculum (RLS: own rows only). */
export async function fetchEnrolmentId(curriculumId: number): Promise<number | null> {
  if (demoMode) return null
  const rows = await get<{ id: number }[]>(
    `/enrolment?curriculum_id=eq.${curriculumId}&status=eq.active&select=id`,
  )
  return rows[0]?.id ?? null
}

export async function fetchProgress(enrolmentId: number): Promise<ProgressRow[]> {
  if (demoMode) return []
  return get<ProgressRow[]>(
    `/progress?enrolment_id=eq.${enrolmentId}&select=id,enrolment_id,module_id,state,point_id`,
  )
}

/** Self-attested completion mark; the server enforces monotone transitions. */
export async function markProgress(
  curriculumId: number,
  moduleCode: string,
  pointId: string,
  state: 'in_progress' | 'complete' = 'complete',
): Promise<MarkResult> {
  return post<MarkResult>('/rpc/mark_progress', {
    p_curriculum_id: curriculumId,
    p_module_code: moduleCode,
    p_point_id: pointId,
    p_state: state,
  })
}

/** Live engine state under RLS; null when signed out / anchorless / demo. */
export async function fetchGamification(): Promise<GamificationSummary | null> {
  if (demoMode) return demoSummary
  try {
    return await post<GamificationSummary | null>('/rpc/gamification_summary', {})
  } catch {
    return null // signed-out callers get a 401 — render nothing rather than an error
  }
}

export async function fetchAchievements(): Promise<AchievementRow[]> {
  if (demoMode) return []
  return get<AchievementRow[]>(
    '/achievement?select=code,title,description,icon,criteria_kind,params&order=code',
  )
}

export async function fetchActivityDays(): Promise<ActivityDayRow[]> {
  if (demoMode) return []
  return get<ActivityDayRow[]>('/activity_day?order=day')
}

/** learner.timezone drives the streak day boundary (009); RLS self-gates. */
export async function updateTimezone(traineeId: number, timezone: string): Promise<void> {
  if (demoMode) return
  await patch(`/trainee?id=eq.${traineeId}`, { timezone })
}

// --- Training-repo self-service (T-077, admin migration 029) ----------------
//
// The git_repo state machine is the contract with the code-only mint+transfer
// backend (academy-gui, task 3). The frontend owns ONLY the `requested`
// transition — via the self-scoped request_training_repo RPC; the backend owns
// building → created → transfer_pending → ready / failed. The gate and the
// GitHub handle come from the Stack SDK client-side (auth.getGithubConnection),
// never the DB — only the flag + handle are stored here.

export type RepoStatus =
  | 'requested'
  | 'building'
  | 'created'
  | 'transfer_pending'
  | 'ready'
  | 'failed'

export interface RepoState {
  github_login: string | null
  repo_url: string | null
  repo_status: RepoStatus | null
  repo_requested_at: string | null
  repo_updated_at: string | null
}

/** The caller's own git_repo state (RLS self-gates); null signed out / demo. */
export async function fetchRepoState(): Promise<RepoState | null> {
  if (demoMode) return null
  try {
    const rows = await get<RepoState[]>(
      '/trainee?select=github_login,repo_url,repo_status,repo_requested_at,repo_updated_at',
    )
    return rows[0] ?? null
  } catch {
    // signed-out / anchorless callers get a 401 — render the control's default
    return null
  }
}

/**
 * Set the caller's own git_repo state to `requested` and store the captured
 * GitHub handle. Self-scoped SECURITY DEFINER RPC (029): acts only for the
 * caller's auth.user_id(), writes only the request, and only from a resting
 * state — so a second click while a build is in flight is refused server-side.
 * Returns the fresh git_repo row.
 */
export async function requestTrainingRepo(
  githubLogin: string,
  githubAccountId: string | null,
): Promise<RepoState> {
  return post<RepoState>('/rpc/request_training_repo', {
    p_github_login: githubLogin,
    p_github_account_id: githubAccountId,
  })
}

// --- Self-service onboarding (T-073, admin migration 027) ------------------
//
// One SECURITY DEFINER RPC covers both linking a pre-provisioned trainee to a
// fresh Neon Auth sign-in and creating a brand-new self-service trainee. It
// acts only for the caller's own auth.user_id() (read from the JWT, never a
// parameter), so the no-arg call is a safe post-auth resolve: it auto-links a
// matching unlinked trainee (Eben + the alpha/beta cohort) and otherwise
// reports needs_profile without writing. Called with profile args it creates
// the trainee, grants full entitlement, and enrols them on the chosen start
// programme.

export type ProvisionStatus = 'exists' | 'linked' | 'created' | 'needs_profile'

export interface ProvisionedTrainee {
  id: number
  display_name: string
  email: string | null
  neon_auth_user_id: string | null
  intake_profile: Record<string, unknown> | null
}

export interface ProvisionResult {
  status: ProvisionStatus
  trainee: ProvisionedTrainee | null
}

export interface IntakeProfile {
  background?: string
  goals?: string
  [k: string]: unknown
}

export interface ProvisionArgs {
  displayName?: string | null
  startCurriculumId?: number | null
  intakeProfile?: IntakeProfile | null
}

/**
 * Resolve or create the caller's trainee. No-arg = post-auth resolve
 * (link-or-report, no write on the needs_profile path); with args = form
 * submit (create). In demo / auth-unconfigured builds there is no backend, so
 * the caller is reported as already provisioned rather than trapped pre-tutor.
 */
export async function provisionOrLinkTrainee(args: ProvisionArgs = {}): Promise<ProvisionResult> {
  if (demoMode) return { status: 'exists', trainee: null }
  return post<ProvisionResult>('/rpc/provision_or_link_trainee', {
    p_display_name: args.displayName ?? null,
    p_start_curriculum_id: args.startCurriculumId ?? null,
    p_intake_profile: args.intakeProfile ?? null,
  })
}
