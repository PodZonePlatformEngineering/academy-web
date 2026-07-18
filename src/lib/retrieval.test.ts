// Offline test for the B-12 retrieval leg: the rag_search wire contract.
// Embedder and Data API are mocked — what must not drift is the RPC path and
// body shape academy-admin migration 017 expects.

import { beforeEach, describe, expect, it, vi } from 'vitest'

const postMock = vi.fn<(path: string, body: unknown) => Promise<unknown>>(async () => [])
const embedMock = vi.fn<(text: string) => Promise<number[]>>(async () =>
  Array<number>(384).fill(0.1),
)

vi.mock('@/lib/api', () => ({ post: (path: string, body: unknown) => postMock(path, body) }))
vi.mock('@/lib/embed', () => ({ embedQuery: (text: string) => embedMock(text) }))

import { retrieve, RETRIEVAL_LIMIT } from '@/lib/retrieval'

describe('retrieve (rag_search RPC wire shape)', () => {
  beforeEach(() => {
    postMock.mockClear()
    embedMock.mockClear()
  })

  it('embeds the question and POSTs /rpc/rag_search with the 017 arg names', async () => {
    await retrieve(5, 'what is a context window?')
    expect(embedMock).toHaveBeenCalledWith('what is a context window?')
    expect(postMock).toHaveBeenCalledTimes(1)
    const [path, rawBody] = postMock.mock.calls[0]
    const body = rawBody as Record<string, unknown>
    expect(path).toBe('/rpc/rag_search')
    expect(body.p_curriculum_id).toBe(5)
    expect(body.p_limit).toBe(RETRIEVAL_LIMIT)
    expect(Array.isArray(body.p_embedding)).toBe(true)
    expect((body.p_embedding as number[]).length).toBe(384)
  })

  it('carries no collection name and no retrieval credential', async () => {
    await retrieve(5, 'anything')
    const body = postMock.mock.calls[0][1] as Record<string, unknown>
    expect(JSON.stringify(body)).not.toContain('collection')
    expect(Object.keys(body).sort()).toEqual(['p_curriculum_id', 'p_embedding', 'p_limit'])
  })
})
