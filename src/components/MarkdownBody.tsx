// Shared renderer for `content.body` / `module_readme` markdown source
// (T-023/T-043 curriculum ingest). Used by both the Tutor overlay and the
// library's inline expand view via ContentBlock (T-051, folded further in
// T-138 item 6) so the two callers stay on one fix.
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// The curriculum markdown carries repo-relative links from the git-repo ingest
// — e.g. `[01](01-how-llms-work.md)` — that made sense in the source tree but
// resolve against the GitHub-Pages base URL in the SPA and 404 (#22). Only
// absolute http(s) URLs are safe to navigate to; everything else (bare `.md`
// files, other relative paths, `#anchors`, non-http schemes) has no clean
// in-app route, so we render its text inertly rather than as a broken anchor.
export function isExternalHttpLink(href: string | undefined): href is string {
  return !!href && /^https?:\/\//i.test(href)
}

// PROJ-011/T-138 item 3: academy-web's stack (react-markdown@10 + remark-gfm)
// has no mermaid support — GitHub already renders ```mermaid fences natively
// for the git-repo delivery channel (review plan §3.5), so this is purely a
// web-rendering gap. Client-side render via the `mermaid` package, lazily
// imported so the ~500KB parser only loads when a diagram is actually on the
// page.
function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, 'mermaid')
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    import('mermaid').then(({ default: mermaid }) => {
      if (!live) return
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
      })
      return mermaid.render(id, chart).then(({ svg }) => {
        if (live && ref.current) ref.current.innerHTML = svg
      })
    }, (e: Error) => {
      if (live) setError(e.message)
    }).catch((e: Error) => {
      if (live) setError(e.message)
    })
    return () => {
      live = false
    }
  }, [id, chart])

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
        Diagram failed to render: {error}
      </div>
    )
  }
  // PROJ-011/T-209: mermaid's rendered svg carries width="100%" plus a
  // `style="max-width: Npx"` (N = the diagram's natural, legible size). When
  // the content column is narrower than N, width:100% wins and the diagram
  // is squeezed down to column width, shrinking every label past legibility
  // (a wide `flowchart LR` like VC8.05B). Forcing the svg to its intrinsic
  // width (from its viewBox) makes it always render at its natural size —
  // unchanged for diagrams that already fit, and now scrollable via
  // overflow-x-auto instead of squeezed for ones that don't.
  return (
    <div
      ref={ref}
      className="mermaid-diagram not-prose my-2 flex justify-center overflow-x-auto [&>svg]:w-auto"
    />
  )
}

function isMermaidCodeElement(node: unknown): boolean {
  return isValidElement(node) && node.type === Mermaid
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (isValidElement(node)) return extractText((node.props as { children?: ReactNode }).children)
  return ''
}

/**
 * The callout convention (T-207, per t206 §5 item 4/plannerapi's T-273
 * precedent): a blockquote whose first paragraph opens with a bold,
 * colon-terminated label — `> **Note:** rest of text`. Detected structurally
 * off the already-rendered `<p>`/`<strong>` elements react-markdown produces
 * for the blockquote's children, not by re-parsing markdown source.
 */
function splitLabelledBlockquote(
  children: ReactNode,
): { label: string; rest: ReactNode[] } | null {
  const blocks = Children.toArray(children).filter(
    (node) => !(typeof node === 'string' && node.trim() === ''),
  )
  const [firstBlock, ...restBlocks] = blocks
  if (!isValidElement(firstBlock) || firstBlock.type !== 'p') return null

  const paraChildren = Children.toArray(
    (firstBlock.props as { children?: ReactNode }).children,
  )
  const [firstInline, ...restInline] = paraChildren
  if (!isValidElement(firstInline) || firstInline.type !== 'strong') return null

  const rawLabel = extractText((firstInline.props as { children?: ReactNode }).children).trim()
  if (!rawLabel.endsWith(':')) return null
  const label = rawLabel.slice(0, -1).trim()
  if (!label) return null

  const trimmedInline = restInline
    .map((node) => (typeof node === 'string' ? node.replace(/^[:\s]+/, '') : node))
    .filter((node) => node !== '')

  const remainderParagraph =
    trimmedInline.length > 0
      ? cloneElement(firstBlock as ReactElement<{ children?: ReactNode }>, {}, trimmedInline)
      : null

  return { label, rest: remainderParagraph ? [remainderParagraph, ...restBlocks] : restBlocks }
}

const components: Components = {
  a({ href, children }) {
    if (isExternalHttpLink(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      )
    }
    // Neutralise: show the words, drop the 404-bound anchor.
    return <span>{children}</span>
  },
  // Additive: an unlabelled blockquote renders exactly as before. Composes
  // with the code/pre overrides below rather than replacing them — mermaid
  // fences aren't blockquotes, so this override never intercepts them.
  blockquote({ children }) {
    const callout = splitLabelledBlockquote(children)
    if (!callout) {
      return <blockquote>{children}</blockquote>
    }
    return (
      <Card className="not-prose my-4">
        <CardHeader className="pb-2">
          <CardTitle>{callout.label}</CardTitle>
        </CardHeader>
        {callout.rest.length > 0 ? (
          <CardContent className="prose prose-sm prose-app max-w-none">
            {callout.rest}
          </CardContent>
        ) : null}
      </Card>
    )
  },
  code({ className, children }) {
    const language = /language-(\w+)/.exec(className || '')?.[1]
    if (language === 'mermaid') {
      return <Mermaid chart={String(children).replace(/\n$/, '')} />
    }
    return <code className={className}>{children}</code>
  },
  // Unwrap the default <pre> block-code wrapper when its sole child is a
  // rendered diagram, so the diagram isn't nested inside code-block styling.
  pre({ children }) {
    const child = Array.isArray(children) ? children[0] : children
    if (isMermaidCodeElement(child)) return <>{children}</>
    return <pre>{children}</pre>
  },
}

function MarkdownBody({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose prose-sm prose-app max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export { MarkdownBody }
export default MarkdownBody
