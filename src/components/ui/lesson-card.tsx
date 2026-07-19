import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { BookOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// In-stream lesson surface from the telegram kit, adapted as the tutor's
// retrieval-context card (B6): `card` is the kit's module/title/duration form,
// `chip` the compact row the Tutor stream uses when an answer cites
// curriculum passages.
const lessonCardVariants = cva("border bg-card text-card-foreground", {
  variants: {
    variant: {
      card: "rounded-(--r-lg) p-4",
      chip: "inline-flex max-w-full items-center gap-2 rounded-(--r-md) px-3 py-1.5",
    },
  },
  defaultVariants: {
    variant: "card",
  },
})

interface LessonCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof lessonCardVariants> {
  /** Micro locator line — "Module 03 · §2". */
  eyebrow?: string
  title: string
  /** Detail line — duration, section count, or retrieval relevance. */
  meta?: string
  /** Card-form CTA; omit for a plain card. Ignored by `chip`. */
  actionLabel?: string
  onAction?: () => void
}

function LessonCard({
  className,
  variant = "card",
  eyebrow,
  title,
  meta,
  actionLabel,
  onAction,
  ...props
}: LessonCardProps) {
  if (variant === "chip") {
    return (
      <div
        data-slot="lesson-card"
        data-variant="chip"
        className={cn(lessonCardVariants({ variant }), className)}
        {...props}
      >
        <BookOpen aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
        {eyebrow && <span className="micro shrink-0 text-primary">{eyebrow}</span>}
        <span className="min-w-0 truncate text-[13px] font-medium">{title}</span>
        {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
      </div>
    )
  }
  return (
    <div
      data-slot="lesson-card"
      data-variant="card"
      className={cn(lessonCardVariants({ variant }), className)}
      {...props}
    >
      {eyebrow && <p className="micro text-primary">{eyebrow}</p>}
      <p className="mt-1 font-heading text-lg leading-[1.2] font-semibold text-balance">{title}</p>
      {meta && <p className="mt-1 text-[13px] text-muted-foreground">{meta}</p>}
      {actionLabel && (
        <Button size="sm" className="mt-3" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export { LessonCard, lessonCardVariants }
export type { LessonCardProps }
