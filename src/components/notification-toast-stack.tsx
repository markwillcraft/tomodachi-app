"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { apiFetch } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import {
  formatNotification,
  TONE_CLASSES,
} from "@/lib/notify-format"
import type {
  NotificationKind,
  NotificationPayload,
  NotificationRow,
} from "@/lib/notify"
import { subscribeToasts } from "@/lib/notification-bus"

// =====================================================================
// Notification toast stack
// ---------------------------------------------------------------------
// Floating column under the topbar (anchored top-right on desktop, top
// of the safe-area on mobile). Subscribes to the notification bus and
// renders one card per fresh notification, each auto-dismissing after
// a short window. Click a card to mark the notification read AND
// navigate to its canonical href — same behaviour as the bell row, so
// the toast really is "the bell entry, surfaced immediately".
//
// We deliberately mount this near the top of the viewport (right under
// the bell) rather than the bottom: the spatial association of "a
// thing slid out of the bell" makes the link between the transient
// toast and the persistent log entry obvious. The welcome toast lives
// at the bottom-right corner, so the two never collide.
//
// Behavior notes:
// - Visible cap is 5 — older entries are dropped from the visible
//   stack to avoid covering the screen during a quest cascade. They
//   are still in the bell.
// - Auto-dismiss after 6s. Hover/focus pauses the timer so a user
//   reading a long row isn't yanked out from under them.
// - Click X to dismiss without marking read. Click body to mark read
//   (idempotent; bell will catch up via its refresh subscription) and
//   navigate. Backed by the same `apiFetch` paths as the bell.
// =====================================================================

const VISIBLE_CAP = 5
const DISMISS_MS = 6_000
const EXIT_ANIM_MS = 250

type ToastEntry = {
  // Stable react key. Uses a synthetic id so we can have multiple
  // visible cards even if a future emitter sends the same notification
  // twice — bell dedup is handled server-side.
  key: string
  row: NotificationRow
  phase: "entering" | "visible" | "leaving"
}

export function NotificationToastStack() {
  const router = useRouter()
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())
  const pausedRef = useRef<Set<string>>(new Set())

  // Schedule (or reschedule) a toast's auto-dismissal.
  const scheduleDismiss = useCallback((key: string) => {
    const existing = timersRef.current.get(key)
    if (existing) window.clearTimeout(existing)
    const id = window.setTimeout(() => {
      dismiss(key)
    }, DISMISS_MS)
    timersRef.current.set(key, id)
  }, [])

  const dismiss = useCallback((key: string) => {
    const existing = timersRef.current.get(key)
    if (existing) {
      window.clearTimeout(existing)
      timersRef.current.delete(key)
    }
    setToasts((prev) =>
      prev.map((t) => (t.key === key ? { ...t, phase: "leaving" } : t)),
    )
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.key !== key))
    }, EXIT_ANIM_MS)
  }, [])

  // Subscribe to the bus. Each emit prepends a fresh entry, kicks off
  // the enter-animation on the next frame, then arms the auto-dismiss.
  useEffect(() => {
    const unsub = subscribeToasts((row) => {
      const key = `${row.id}:${Date.now()}`
      setToasts((prev) => {
        const next: ToastEntry[] = [
          { key, row, phase: "entering" },
          ...prev,
        ]
        // Cap visible. Anything beyond the cap is removed from state
        // (their timers, if any, are cleaned up in the effect below).
        if (next.length > VISIBLE_CAP) {
          for (const overflow of next.slice(VISIBLE_CAP)) {
            const t = timersRef.current.get(overflow.key)
            if (t) {
              window.clearTimeout(t)
              timersRef.current.delete(overflow.key)
            }
          }
          return next.slice(0, VISIBLE_CAP)
        }
        return next
      })

      requestAnimationFrame(() => {
        setToasts((prev) =>
          prev.map((t) => (t.key === key ? { ...t, phase: "visible" } : t)),
        )
      })

      scheduleDismiss(key)
    })

    return () => {
      unsub()
      for (const id of timersRef.current.values()) window.clearTimeout(id)
      timersRef.current.clear()
    }
  }, [scheduleDismiss])

  const handleHoverStart = useCallback((key: string) => {
    pausedRef.current.add(key)
    const id = timersRef.current.get(key)
    if (id) {
      window.clearTimeout(id)
      timersRef.current.delete(key)
    }
  }, [])

  const handleHoverEnd = useCallback(
    (key: string) => {
      pausedRef.current.delete(key)
      scheduleDismiss(key)
    },
    [scheduleDismiss],
  )

  const handleClick = useCallback(
    async (entry: ToastEntry, href: string) => {
      // Optimistically remove the toast as the user navigates so the
      // animation doesn't fight the route change.
      dismiss(entry.key)
      try {
        // Idempotent on the server; safe to fire even if the bell
        // already marked it (e.g. user opened the dropdown first).
        await apiFetch(`/api/notifications/${entry.row.id}/read`, {
          method: "POST",
        })
      } catch {
        // Toast UX is best-effort; failures here aren't worth
        // bothering the user since the row is still readable in the
        // bell history.
      }
      router.push(href)
    },
    [dismiss, router],
  )

  if (toasts.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Recent notifications"
      // Top-right under the topbar. Pinned just below the 64px topbar
      // height with a small gap so a stack of cards never tucks behind
      // the bell. On phones we leave a 12px inset and use the full
      // width minus margins so the card body still reads cleanly.
      className={cn(
        "pointer-events-none fixed z-40 flex flex-col gap-2",
        "left-3 right-3 top-[76px]",
        "sm:left-auto sm:right-4 sm:top-[72px] sm:w-[360px]",
      )}
    >
      {toasts.map((t) => (
        <ToastCard
          key={t.key}
          entry={t}
          onClose={() => dismiss(t.key)}
          onHoverStart={() => handleHoverStart(t.key)}
          onHoverEnd={() => handleHoverEnd(t.key)}
          onClick={(href) => void handleClick(t, href)}
        />
      ))}
    </div>
  )
}

function ToastCard({
  entry,
  onClose,
  onHoverStart,
  onHoverEnd,
  onClick,
}: {
  entry: ToastEntry
  onClose: () => void
  onHoverStart: () => void
  onHoverEnd: () => void
  onClick: (href: string) => void
}) {
  const fmt = formatNotification(
    entry.row.kind as NotificationKind,
    entry.row.payload as NotificationPayload,
  )

  // Slide-in from the right (or down on mobile) + fade. Once visible,
  // we sit at translate-0 / opacity-1; on leaving we slide up (mobile)
  // or right (desktop) + fade.
  const offScreen =
    entry.phase === "entering" || entry.phase === "leaving"
  const offClass =
    entry.phase === "leaving"
      ? "-translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      : "-translate-y-3 opacity-0 sm:translate-y-0 sm:translate-x-4"

  return (
    <div
      className={cn(
        "pointer-events-auto relative transition-all duration-200 ease-out",
        offScreen ? offClass : "translate-x-0 translate-y-0 opacity-100",
      )}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocusCapture={onHoverStart}
      onBlurCapture={onHoverEnd}
    >
      <button
        type="button"
        onClick={() => onClick(fmt.href)}
        className={cn(
          "group relative flex w-full items-start gap-3 overflow-hidden rounded-xl border bg-popover/95 p-3 pl-4 pr-9 text-left shadow-xl backdrop-blur",
          "transition-colors hover:bg-accent/60",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset text-base",
            TONE_CLASSES[fmt.tone],
          )}
        >
          {fmt.glyph}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-semibold">{fmt.title}</p>
          <p className="line-clamp-2 text-[12px] text-muted-foreground">
            {fmt.body}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
