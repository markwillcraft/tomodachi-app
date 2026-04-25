"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCheck, Inbox } from "lucide-react"
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
import { Button } from "@/components/ui/button"

// Full-history client island for /notifications. Hydrates from the
// Server Component's initial fetch, then handles mark-read / mark-all
// mutations in place. We intentionally don't poll here — the bell in
// the topbar already does that, and a user actively viewing this page
// can pull-to-refresh / re-navigate if they want fresh rows.
export function NotificationsClient({
  initial,
}: {
  initial: NotificationListing
}) {
  const router = useRouter()
  const [data, setData] = useState<NotificationListing>(initial)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Refresh "Xm ago" labels every minute while the page is open.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const handleClick = useCallback(
    async (row: NotificationRow, href: string) => {
      if (!row.readAt) {
        setData((prev) => ({
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
          notifications: prev.notifications.map((n) =>
            n.id === row.id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        }))
        try {
          await apiFetch(`/api/notifications/${row.id}/read`, {
            method: "POST",
          })
        } catch (e) {
          setError(apiErrorMessage(e, "Failed to mark read"))
        }
      }
      router.push(href)
    },
    [router],
  )

  const handleMarkAll = useCallback(async () => {
    if (data.unreadCount === 0) return
    const previous = data
    setData((prev) => ({
      ...prev,
      unreadCount: 0,
      notifications: prev.notifications.map((n) =>
        n.readAt ? n : { ...n, readAt: new Date().toISOString() },
      ),
    }))
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" })
    } catch (e) {
      setData(previous)
      setError(apiErrorMessage(e, "Failed to mark all read"))
    }
  }, [data])

  if (data.notifications.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <Inbox
          aria-hidden
          className="mx-auto mb-4 size-10 text-muted-foreground"
          strokeWidth={1.5}
        />
        <p className="text-base font-medium">No notifications yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Finish a quiz, complete a Dojo lesson, or claim a daily quest to
          see entries here.
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to dashboard →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.unreadCount > 0
            ? `${data.unreadCount} unread`
            : "All caught up"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={handleMarkAll}
          disabled={data.unreadCount === 0}
        >
          <CheckCheck className="size-3.5" />
          Mark all read
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}

      <ul className="divide-y rounded-2xl border bg-card">
        {data.notifications.map((row) => (
          <HistoryRow key={row.id} row={row} now={now} onClick={handleClick} />
        ))}
      </ul>
    </div>
  )
}

function HistoryRow({
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
          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60",
          unread && "bg-primary/5",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset text-lg",
            TONE_CLASSES[fmt.tone],
          )}
        >
          {fmt.glyph}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
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
          <p className="text-sm text-muted-foreground">{fmt.body}</p>
          <p className="text-[11px] text-muted-foreground/70">
            {formatTimeAgo(row.createdAt, now)}
          </p>
        </div>
      </button>
    </li>
  )
}
