import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Conversation bubble from the design's telegram kit (B6): the trainee speaks
// clay from the right, the tutor answers on honey from the left — the
// straightened corner points at the speaker — and system pings sit centred as
// muted pills. Supersedes the inline bubble treatment B5 seeded in Tutor.
const chatBubbleVariants = cva(
  "px-3.5 py-2.5 text-sm leading-[1.45] whitespace-pre-wrap",
  {
    variants: {
      role: {
        user: "rounded-[var(--r-lg)_var(--r-lg)_4px_var(--r-lg)] bg-primary text-primary-foreground",
        tutor:
          "rounded-[var(--r-lg)_var(--r-lg)_var(--r-lg)_4px] border border-(--honey-300) bg-accent text-accent-foreground",
        system: "rounded-full bg-secondary px-3.5 py-1.5 text-xs text-muted-foreground",
      },
    },
    defaultVariants: {
      role: "tutor",
    },
  }
)

const bubbleAlignment = {
  user: "items-end self-end",
  tutor: "items-start self-start",
  system: "items-center self-center",
} as const

interface ChatBubbleProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "role">,
    VariantProps<typeof chatBubbleVariants> {
  /** Voice of the bubble; `system` renders as a centred ping. */
  role?: "user" | "tutor" | "system"
  /** Reply still arriving — a live caret pulses after the text. */
  streaming?: boolean
  /** Slot under the bubble: time, or the model/token meta line. */
  timestamp?: React.ReactNode
}

function ChatBubble({
  className,
  role = "tutor",
  streaming = false,
  timestamp,
  children,
  ...props
}: ChatBubbleProps) {
  return (
    <div
      data-slot="chat-bubble"
      data-role={role}
      aria-busy={streaming || undefined}
      className={cn("flex max-w-[78%] flex-col", bubbleAlignment[role], className)}
      {...props}
    >
      <div className={cn(chatBubbleVariants({ role }))}>
        {children}
        {streaming && (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current align-[-2px]"
          />
        )}
      </div>
      {timestamp != null && (
        <div className="px-2.5 pt-1 text-[11px] text-muted-foreground">{timestamp}</div>
      )}
    </div>
  )
}

export { ChatBubble, chatBubbleVariants }
export type { ChatBubbleProps }
