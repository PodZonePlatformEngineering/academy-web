// Port of academy-admin/assessment/serving.py's Qdrant primitive
// (PROJ-011/T-134) — a direct points retrieve-by-id / scroll-by-filter
// call, never semantic/RAG search. Same cluster, same collection naming
// (`academy-{curriculum_slug}-keys`), same admin key requirement as the
// Python original.
export const CLUSTER_URL =
  'https://2dd1f0b8-5cf1-4caf-bc96-2b4811251f4c.eu-west-2-0.aws.cloud.qdrant.io'

export class QdrantError extends Error {}

export async function qdrantCall(
  apiKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  const res = await fetch(CLUSTER_URL + path, {
    method,
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new QdrantError(`Qdrant ${path} -> HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export interface QdrantPoint {
  id: string
  payload: Record<string, unknown>
}

export async function scrollFilter(
  apiKey: string,
  coll: string,
  must: Array<Record<string, unknown>>,
): Promise<QdrantPoint[]> {
  const points: QdrantPoint[] = []
  let offset: unknown = null
  for (;;) {
    const body: Record<string, unknown> = {
      limit: 100,
      with_payload: true,
      with_vector: false,
      filter: { must },
    }
    if (offset !== null) body.offset = offset
    const result = (await qdrantCall(apiKey, 'POST', `/collections/${coll}/points/scroll`, body))
      .result
    points.push(...result.points)
    offset = result.next_page_offset ?? null
    if (offset === null) return points
  }
}
