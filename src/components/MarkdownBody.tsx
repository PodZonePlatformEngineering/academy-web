// Shared renderer for `content.body` / `module_readme` markdown source
// (T-023/T-043 curriculum ingest). Used by both the Tutor overlay
// (ModuleSection) and the library's inline expand view (Section) so the two
// twins stay on one fix (T-051).
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

function MarkdownBody({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}

export { MarkdownBody }
export default MarkdownBody
