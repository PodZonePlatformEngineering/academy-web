// In-browser query embedding (B-12, T-043): transformers.js all-MiniLM-L6-v2.
//
// This closes the gap the Qdrant pivot opened — queries must be embedded in
// the SAME space as the stored curriculum_point vectors (Qdrant server-side
// inference, 384-dim cosine). The recall gate proved parity for exactly this
// configuration (academy-admin vectors/RECALL-GATE-2026-07-18.md): q8
// quantized, mean-pooled, L2-normalised. Change any of those and the gate
// numbers no longer cover you.
//
// The model (~25 MB quantized) is fetched lazily on first tutor use and
// cached by transformers.js in the browser Cache API, so the download is
// one-time per device. The library itself is dynamically imported so the
// main bundle doesn't carry it.

export const EMBED_MODEL_ID = 'Xenova/all-MiniLM-L6-v2'
export const EMBED_DIM = 384

// Minimal slice of the transformers.js pipeline surface we use.
type Extractor = (
  text: string,
  opts: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>

export interface EmbedProgress {
  status: string
  file?: string
  progress?: number
}

let extractorPromise: Promise<Extractor> | null = null

/**
 * Load (or reuse) the embedding pipeline. Safe to call eagerly — repeated
 * calls share one download/instance; a failed load resets so retry works.
 */
export function loadEmbedder(onProgress?: (p: EmbedProgress) => void): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      const extractor = await pipeline('feature-extraction', EMBED_MODEL_ID, {
        dtype: 'q8',
        progress_callback: onProgress as ((data: unknown) => void) | undefined,
      })
      return extractor as unknown as Extractor
    })()
    extractorPromise.catch(() => {
      extractorPromise = null
    })
  }
  return extractorPromise
}

/** Embed one query into the 384-dim MiniLM cosine space. */
export async function embedQuery(text: string): Promise<number[]> {
  const extractor = await loadEmbedder()
  const out = await extractor(text, { pooling: 'mean', normalize: true })
  const vec = Array.from(out.data)
  if (vec.length !== EMBED_DIM) {
    throw new Error(`Embedder returned ${vec.length} dims, expected ${EMBED_DIM}.`)
  }
  return vec
}
