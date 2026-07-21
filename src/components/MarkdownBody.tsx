// Shared renderer for `content.body` / `module_readme` markdown source
// (T-023/T-043 curriculum ingest). Used by both the Tutor overlay
// (ModuleSection) and the library's inline expand view (Section) so the two
// twins stay on one fix (T-051).
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
