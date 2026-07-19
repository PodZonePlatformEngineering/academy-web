// Icon nav (B8 Task 2) — the persistent IA for a signed-in trainee:
// Library (bookshelf) · Tutor (owl) · Scoreboard (target) · Home (your
// avatar). The Shell renders it twice — left rail on desktop, bottom bar on
// mobile — and CSS shows exactly one. Signed out (or while the session
// resolves) only the open surface, the library, shows: the gated icons would
// just bounce back to the landing.

import { Library, Target } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { AuthUser } from '@/lib/auth'
import { useAuthState } from '@/lib/auth-state'
import { cn } from '@/lib/utils'

// Lucide has no owl, so the tutor's icon is adapted from the operator's quest
// mascot (assets/quest-mascot.svg): the egg body, the two big round eyes
// under arched brows, and the small triangular beak, redrawn single-colour in
// lucide's stroke conventions so the brand token layer colours it like its
// neighbours.
function OwlIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.5c3.9 0 6.5 3.7 6.5 8.5s-2.6 8.5-6.5 8.5S5.5 16.8 5.5 12 8.1 3.5 12 3.5Z" />
      <path d="M7.1 6.9c1.4-1 2.9-1.2 4.1-.6" />
      <path d="M16.9 6.9c-1.4-1-2.9-1.2-4.1-.6" />
      <circle cx="9.3" cy="10.6" r="1.9" />
      <circle cx="14.7" cy="10.6" r="1.9" />
      <path d="M12 14l-1.1 1.7h2.2Z" />
    </svg>
  )
}

// The signed-in user themself: the Neon Auth profile image when the provider
// supplies one, else initials in a circle. Doubles as the Home nav icon (sm)
// and the Home page's profile portrait (lg).
export function Avatar({ user, size = 'sm' }: { user: AuthUser; size?: 'sm' | 'lg' }) {
  if (user.profileImageUrl) {
    return (
      <img
        src={user.profileImageUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={cn(
          'rounded-full border object-cover',
          size === 'sm' ? 'size-6' : 'size-14',
        )}
      />
    )
  }
  const initials =
    (user.displayName ?? user.email ?? '')
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/15 font-bold text-primary',
        size === 'sm' ? 'size-6 text-[0.6rem]' : 'size-14 text-lg',
      )}
    >
      {initials}
    </span>
  )
}

export default function AppNav({ variant }: { variant: 'rail' | 'bar' }) {
  const { user, visitor } = useAuthState()

  const items: { to: string; label: string; icon: React.ReactNode }[] = [
    { to: '/library', label: 'Library', icon: <Library className="size-6" /> },
    ...(visitor === 'signed-in' && user
      ? [
          { to: '/tutor', label: 'Tutor', icon: <OwlIcon className="size-6" /> },
          { to: '/scoreboard', label: 'Scoreboard', icon: <Target className="size-6" /> },
          { to: '/home', label: 'Home', icon: <Avatar user={user} /> },
        ]
      : []),
  ]

  return (
    <nav
      aria-label={variant === 'rail' ? 'Primary' : 'Primary (mobile)'}
      className={cn(
        variant === 'rail'
          ? 'sticky top-6 hidden w-20 shrink-0 flex-col items-center gap-1 py-8 md:flex'
          : 'fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t bg-background/95 px-2 py-1.5 backdrop-blur md:hidden',
      )}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'group flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[0.65rem] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-xl transition-colors',
                  isActive ? 'bg-primary/10' : 'group-hover:bg-muted',
                )}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
