"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react"
import { apiFetch, apiErrorMessage } from "@/lib/api-client"
import { cn, formatTimeAgo } from "@/lib/utils"
import {
  formatNotification,
  TONE_CLASSES,
} from "@/lib/notify-format"
import type {
  NotificationKind,
  NotificationPage,
  NotificationPayload,
  NotificationRow,
} from "@/lib/notify"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Full-history client island for /notifications. Hydrates from the
// Server Component's paginated fetch and:
//   - Renders the page as a table on desktop, stacked cards on
//     mobile (a real <table> is unreadable on phone widths).
//   - Handles mark-read / mark-all mutations with optimistic local
//     state, then `router.refresh()` to re-sync with the server.
//   - Renders pagination controls as plain `<Link>`s so each page
//     is a fresh server render — no client-side data fetching, no
//     state to keep in sync, and the URL is always the source of
//     truth (linkable, refreshable, back-button-safe).
export function NotificationsClient({
  initial,
}: {
  initial: NotificationPage
}) {
  const router = useRouter()
  const [data, setData] = useState<NotificationPage>(initial)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Server is the source of truth. When the user navigates to a
  // different page, `initial` changes and we re-sync local state so
  // optimistic mark-read updates don't bleed across page boundaries.
  useEffect(() => {
    setData(initial)
  }, [initial])

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
      // Re-pull the current page from the server so any rows from
      // OTHER pages also show as read on the next navigation.
      router.refresh()
    } catch (e) {
      setData(previous)
      setError(apiErrorMessage(e, "Failed to mark all read"))
    }
  }, [data, router])

  if (data.total === 0) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
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

      {/* Desktop: real table. Hidden on phones because a 4-column
          layout is unreadable below ~640px. */}
      <div className="hidden overflow-hidden rounded-2xl border bg-card sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[60px] pl-4"></TableHead>
              <TableHead className="w-[200px]">Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-[140px] pr-4 text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.notifications.map((row) => (
              <DesktopRow
                key={row.id}
                row={row}
                now={now}
                onClick={handleClick}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards. Same data, layout collapsed to
          single column so each row reads cleanly on a phone. */}
      <ul className="divide-y rounded-2xl border bg-card sm:hidden">
        {data.notifications.map((row) => (
          <MobileRow
            key={row.id}
            row={row}
            now={now}
            onClick={handleClick}
          />
        ))}
      </ul>

      <PaginationFooter page={data} />
    </div>
  )
}

// ---------- Pagination ----------

function PaginationFooter({ page }: { page: NotificationPage }) {
  // Window of rows shown on this page. Always 1-indexed inclusive,
  // e.g. "Showing 11 to 20 of 247".
  const start = (page.page - 1) * page.perPage + 1
  const end = Math.min(page.page * page.perPage, page.total)

  const prevHref = useMemo(
    () => (page.page > 1 ? hrefForPage(page.page - 1) : null),
    [page.page],
  )
  const nextHref = useMemo(
    () =>
      page.page < page.totalPages ? hrefForPage(page.page + 1) : null,
    [page.page, page.totalPages],
  )

  // Single-page case: still show the row count for context but skip
  // the prev/next buttons since they have nothing to do.
  if (page.totalPages <= 1) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-card/60 px-4 py-3 text-xs text-muted-foreground">
        <span>
          {page.total === 1
            ? "1 notification"
            : `${page.total.toLocaleString()} notifications`}
        </span>
      </div>
    )
  }

  return (
    <nav
      aria-label="Notification history pagination"
      className="flex flex-col items-center justify-between gap-3 rounded-xl border bg-card/60 px-4 py-3 text-xs text-muted-foreground sm:flex-row"
    >
      <div className="text-center sm:text-left">
        Showing{" "}
        <span className="font-medium text-foreground tabular-nums">
          {start.toLocaleString()}
        </span>
        –
        <span className="font-medium text-foreground tabular-nums">
          {end.toLocaleString()}
        </span>{" "}
        of{" "}
        <span className="font-medium text-foreground tabular-nums">
          {page.total.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <PageLink
          href={prevHref}
          ariaLabel="Previous page"
          disabled={prevHref === null}
        >
          <ChevronLeft className="size-3.5" />
          Prev
        </PageLink>
        <span className="px-1 tabular-nums">
          Page {page.page} of {page.totalPages}
        </span>
        <PageLink
          href={nextHref}
          ariaLabel="Next page"
          disabled={nextHref === null}
        >
          Next
          <ChevronRight className="size-3.5" />
        </PageLink>
      </div>
    </nav>
  )
}

function PageLink({
  href,
  ariaLabel,
  disabled,
  children,
}: {
  href: string | null
  ariaLabel: string
  disabled: boolean
  children: React.ReactNode
}) {
  const className = cn(
    "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
    disabled
      ? "pointer-events-none opacity-40"
      : "hover:bg-accent hover:text-foreground",
  )
  if (disabled || href === null) {
    return (
      <span aria-disabled className={className}>
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={className}
      prefetch={false}
    >
      {children}
    </Link>
  )
}

function hrefForPage(page: number): string {
  // Page 1 omits the query param so the canonical URL stays clean.
  return page <= 1 ? "/notifications" : `/notifications?page=${page}`
}

// ---------- Rows ----------

function DesktopRow({
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
    <TableRow
      onClick={() => onClick(row, fmt.href)}
      className={cn(
        "cursor-pointer transition-colors",
        unread && "bg-primary/5 hover:bg-primary/10",
      )}
    >
      <TableCell className="pl-4">
        <span
          aria-hidden
          className={cn(
            "flex size-9 items-center justify-center rounded-lg ring-1 ring-inset text-base",
            TONE_CLASSES[fmt.tone],
          )}
        >
          {fmt.glyph}
        </span>
      </TableCell>
      <TableCell>
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
              title="Unread"
            />
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        <span className="line-clamp-2">{fmt.body}</span>
      </TableCell>
      <TableCell className="pr-4 text-right text-xs text-muted-foreground tabular-nums">
        {formatTimeAgo(row.createdAt, now)}
      </TableCell>
    </TableRow>
  )
}

function MobileRow({
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
