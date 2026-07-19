import * as React from "react"
import { LoaderCircle, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Bottom input from the telegram kit (B6), minus the kit's "ask AI" toggle —
// this composer always talks to the tutor. Enter sends, Shift+Enter breaks a
// line; the send affordance spins while the reply streams.
interface ChatComposerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: string
  onValueChange: (value: string) => void
  onSend: () => void
  /** Sending is blocked (context still loading) even with text present. */
  disabled?: boolean
  /** A reply is streaming — typing stays open, the affordance goes busy. */
  busy?: boolean
  placeholder?: string
  /** Muted caption above the field — keyboard hint or scope note. */
  hint?: React.ReactNode
}

function ChatComposer({
  className,
  value,
  onValueChange,
  onSend,
  disabled = false,
  busy = false,
  placeholder,
  hint,
  ...props
}: ChatComposerProps) {
  const canSend = !disabled && !busy && value.trim().length > 0
  return (
    <div
      data-slot="chat-composer"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      {hint != null && (
        <div className="px-2 text-[11px] text-muted-foreground">{hint}</div>
      )}
      <div className="flex items-end gap-2 rounded-(--r-lg) border bg-white p-2 shadow-(--shadow-inset) transition-colors focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15">
        <textarea
          rows={1}
          className="max-h-32 min-h-9 w-full flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-[1.45] outline-none placeholder:text-muted-foreground field-sizing-content"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              if (canSend) onSend()
            }
          }}
        />
        <Button
          size="icon"
          className="rounded-(--r-md)"
          aria-label="Send"
          disabled={!canSend}
          onClick={onSend}
        >
          {busy ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <Send aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  )
}

export { ChatComposer }
export type { ChatComposerProps }
