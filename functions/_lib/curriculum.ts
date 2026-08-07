// PROJ-011/T-239: resolves a module_id to the identifiers assessment
// serving/grading/entitlement actually need, now that curriculum.slug no
// longer 1:1-identifies content. PROJ-011/T-227 merged 5 source curricula
// (prompt-engineering/code-ai/applied-ai/finops/governance) onto one
// `academy-ai` curriculum row, leaving the 5 source rows in place but
// module-less/point-less (academy-admin's qdrant_to_pgvector.py
// MERGED_SLUGS). `curriculum_point.provenance->>'repo'` (populated from the
// incoming Qdrant payload on every ingest, so always correct) is the only
// surviving per-source identity, and `curriculum_point.curriculum_id` is
// already the correct post-merge id — this is the same lookup
// qdrant_to_pgvector.py's census()/load_curriculum() use.
//
// assessment/check_understanding/answer_key points never land in
// curriculum_point (they're excluded — see curriculum_point_type_check),
// so this resolves via whatever other point shares the same module_code;
// module_code is unique per curriculum (curriculum_point_module_idx), so
// any match is unambiguous.
import type { PoolClient } from '@neondatabase/serverless'

export class ModuleNotFound extends Error {}

export interface ModuleCurriculum {
  curriculumId: number
  // The slug the real Qdrant collections (`academy-<slug>-keys`,
  // `academy-<slug>-content`) are still named after — the pre-merge
  // per-repo slug, never `academy-ai` (those collections were never
  // renamed/merged by T-227).
  qdrantSlug: string
}

export async function resolveModule(client: PoolClient, moduleId: string): Promise<ModuleCurriculum> {
  const { rows } = await client.query(
    `SELECT curriculum_id, provenance->>'repo' AS repo
     FROM curriculum_point WHERE module_code = $1 LIMIT 1`,
    [moduleId],
  )
  if (rows.length === 0) {
    throw new ModuleNotFound(`no curriculum_point found for module ${moduleId}`)
  }
  const repo = rows[0].repo as string | null
  if (!repo || !repo.startsWith('academy-')) {
    throw new ModuleNotFound(`module ${moduleId} has no valid provenance.repo (got ${JSON.stringify(repo)})`)
  }
  return { curriculumId: Number(rows[0].curriculum_id), qdrantSlug: repo.slice('academy-'.length) }
}
