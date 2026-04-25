"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { apiFetch, apiErrorMessage } from "@/lib/api-client"
import { cn, formatTimeAgo } from "@/lib/utils"
import {
  formatNotification,
  TONE_CLASSES,
} from "@/lib/notify-format"
import type {
  NotificationKind,
  NotificationListing,
  NotificationPayload,
  NotificationRow,
} from "@/lib/notify"
import { subscribeRefresh } from "@/lib/notification-bus"
import { Button } from "@/components/ui/button"

const POLL_MS = 60_000

// Topbar bell + dropdown panel for in-app notifications. Polls
// `/api/notifications` every 60s (and re-polls immediately on window
// focus) so the unread badge stays roughly accurate without a realtime
// channel. Click a row to mark it read and navigate; click "Mark all"
// to clear the badge in one call.
export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationListing | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Centralise the fetch so initial load, focus refresh, polling, and
  // post-mark refresh all share one path.
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null)
      const res = await apiFetch<NotificationListing>(
        "/api/notifications?limit=10",
        { signal },
      )
      setData(res)
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return
      setError(apiErrorMessage(e, "Failed to load notifications"))
    }
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    void refresh(ctrl.signal).finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [refresh])

  // Bus-driven refresh: any time the toast pipeline announces a new
  // notification, immediately re-pull so the unread badge and dropdown
  // stay in sync without waiting for the next 60s poll.
  useEffect(() => {
    return subscribeRefresh(() => {
      void refresh()
    })
  }, [refresh])

  // Poll while mounted; pause when the tab is hidden so a backgrounded
  // app doesn't burn the rate-limit bucket.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (timer) return
      timer = setInterval(() => {
        if (document.visibilityState === "visible") void refresh()
      }, POLL_MS)
    }
    const stop = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh()
        start()
      } else {
        stop()
      }
    }
    const onFocus = () => void refresh()

    start()
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      stop()
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [refresh])

  // Tick `now` once a minute so "5m ago" labels age while the dropdown
  // is open. Cheap (one set/min); only runs while open.
  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [open])

  // Close on click-outside.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const unread = data?.unreadCount ?? 0

  const handleRowClick = useCallback(
    async (row: NotificationRow, href: string) => {
      setOpen(false)
      // Optimistic mark-read so the badge ticks down instantly even
      // before the server round trip resolves.
      if (!row.readAt) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                unreadCount: Math.max(0, prev.unreadCount - 1),
                notifications: prev.notifications.map((n) =>
                  n.id === row.id
                    ? { ...n, readAt: new Date().toISOString() }
                    : n,
                ),
              }
            : prev,
        )
        try {
          await apiFetch(`/api/notifications/${row.id}/read`, {
            method: "POST",
          })
        } catch {
          // Roll back the optimistic update on failure by re-fetching.
          void refresh()
        }
      }
      router.push(href)
    },
    [refresh, router],
  )

  const handleMarkAll = useCallback(async () => {
    if (!data || data.unreadCount === 0) return
    setData({
      ...data,
      unreadCount: 0,
      notifications: data.notifications.map((n) =>
        n.readAt ? n : { ...n, readAt: new Date().toISOString() },
      ),
    })
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" })
    } catch {
      void refresh()
    }
  }, [data, refresh])

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative size-9 p-0"
        aria-label={
          unread > 0 ? `Notifications (${unread} unread)` : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-5" strokeWidth={1.75} />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow ring-2 ring-background tabular-nums"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl sm:w-[380px]"
        >
          <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300 tabular-nums">
                  {unread} new
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={handleMarkAll}
              disabled={!data || data.unreadCount === 0}
              title="Mark all read"
            >
              <CheckCheck className="size-3.5" />
              Mark all
            </Button>
          </header>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && !data && (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </div>
            )}

            {!loading && error && (
              <div className="px-4 py-6 text-sm text-rose-600 dark:text-rose-300">
                {error}
              </div>
            )}

            {!loading && !error && data && data.notifications.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet. Finish a quiz or unlock an achievement
                to see one here.
              </div>
            )}

            {data && data.notifications.length > 0 && (
              <ul className="divide-y">
                {data.notifications.map((row) => (
                  <BellRow
                    key={row.id}
                    row={row}
                    now={now}
                    onClick={handleRowClick}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="border-t bg-muted/30">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          </footer>
        </div>
      )}
    </div>
  )
}

function BellRow({
  row,
  now,
  onClick,
}: {
  row: NotificationRow
  now: number
  onClick: (row: NotificationRow, href: string) => void
}) {
  const fmt = formatNotification(
    row.kind as NotificationKind,
    row.payload as NotificationPayload,
  )
  const unread = !row.readAt
  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(row, fmt.href)}
        className={cn(
          "group flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/60",
          unread && "bg-primary/5",
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
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "truncate text-sm",
                unread ? "font-semibold" : "font-medium",
              )}
            >
              {fmt.title}
            </span>
            {unread && (
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-primary"
              />
            )}
          </div>
          <p className="line-clamp-2 text-[12px] text-muted-foreground">
            {fmt.body}
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            {formatTimeAgo(row.createdAt, now)}
          </p>
        </div>
      </button>
    </li>
  )
}
