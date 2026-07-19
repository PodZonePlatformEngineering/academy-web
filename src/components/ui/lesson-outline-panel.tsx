import * as React from "react"
import { Circle, CircleCheck, CircleDot } from "lucide-react"

import { cn } from "@/lib/utils"

// Right-rail outline from the telegram kit's LessonPanel (B6), trimmed to our
// product: title + progress bar + module outline, all read from existing
// curriculum/progress data. The kit's cohort box and lesson cover are out
// (no cohort surface at MVP); progress here is self-attested — pair the
// footer slot with the app's self-attested badge.

const stateIcon = {
  complete: CircleCheck,
  in_progress: CircleDot,
  not_started: Circle,
} as const

interface LessonOutlineItem {
  id: string | number
  label: string
  state?: "not_started" | "in_progress" | "complete"
  /** Trailing detail — "3/6" sections complete. */
  meta?: string
}

interface LessonOutlinePanelProps extends React.HTMLAttributes<HTMLElement> {
  /** Header eyebrow — what this rail shows. */
  eyebrow?: string
  title: string
  /** Detail line under the title — tier, module count. */
  subtitle?: string
  /** 0–100 renders the progress bar; omit to hide it. */
  progressPct?: number
  progressLabel?: string
  items: LessonOutlineItem[]
  itemsLabel?: string
  /** Slot under the outline — the self-attested badge lives here. */
  footer?: React.ReactNode
}

function LessonOutlinePanel({
  className,
  eyebrow = "Current curriculum",
  title,
  subtitle,
  progressPct,
  progressLabel = "Progress",
  items,
  itemsLabel = "Modules",
  footer,
  ...props
}: LessonOutlinePanelProps) {
  return (
    <aside
      data-slot="lesson-outline-panel"
      className={cn(
        "flex flex-col rounded-(--r-lg) border bg-card text-card-foreground",
        className
      )}
      {...props}
    >
      <div className="border-b px-4 py-3">
        <p className="micro text-muted-foreground">{eyebrow}</p>
      </div>
      <div className="flex-1 p-4">
        <p className="font-heading text-lg leading-[1.2] font-semibold text-balance">
          {title}
        </p>
        {subtitle && (
          <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
        )}
        {progressPct !== undefined && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-xs font-semibold">{progressLabel}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.round(progressPct)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-(--dur-panel)"
                style={{
                  width: `${Math.min(100, Math.max(0, progressPct))}%`,
                }}
              />
            </div>
          </div>
        )}
        {items.length > 0 && (
          <div className="mt-5">
            <p className="micro mb-2 text-muted-foreground">{itemsLabel}</p>
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const state = item.state ?? "not_started"
                const Icon = stateIcon[state]
                return (
                  <li
                    key={item.id}
                    data-state={state}
                    className="flex items-start gap-2.5 py-1.5"
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "mt-px size-4 shrink-0",
                        state === "complete"
                          ? "text-success"
                          : state === "in_progress"
                            ? "text-primary"
                            : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 text-[13px]",
                        state === "complete" &&
                          "text-muted-foreground line-through"
                      )}
                    >
                      {item.label}
                    </span>
                    {item.meta && (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {item.meta}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
      {footer != null && <div className="border-t px-4 py-3">{footer}</div>}
    </aside>
  )
}

export { LessonOutlinePanel }
export type { LessonOutlineItem, LessonOutlinePanelProps }
