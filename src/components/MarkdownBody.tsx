// Shared renderer for `content.body` / `module_readme` markdown source
// (T-023/T-043 curriculum ingest). Used by both the Tutor overlay and the
// library's inline expand view via ContentBlock (T-051, folded further in
// T-138 item 6) so the two callers stay on one fix.
import { isValidElement, useEffect, useId, useRef, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

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
  return <div ref={ref} className="mermaid-diagram not-prose my-2 flex justify-center" />
}

function isMermaidCodeElement(node: unknown): boolean {
  return isValidElement(node) && node.type === Mermaid
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
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export { MarkdownBody }
export default MarkdownBody
