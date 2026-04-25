// =====================================================================
// Notification client bus
// ---------------------------------------------------------------------
// Tiny pub/sub the bell + toast stack share. Two channels:
//
//   1. `subscribeToasts(fn)` — listeners get fired with a single
//      `NotificationRow` whenever a freshly created notification is
//      announced (typically by `apiFetch` after spotting a
//      `newNotifications` field on a server response).
//   2. `subscribeRefresh(fn)` — listeners get fired with no args when
//      a "the bell should refresh now" signal is emitted, so the bell
//      doesn't have to wait up to 60s for its next poll to surface the
//      new unread count.
//
// `dispatchNewNotifications(rows)` is the one-call helper the rest of
// the app uses: it fans rows to the toast channel AND emits a single
// refresh signal so the bell catches up in the same tick.
//
// No DOM dependency, no React. Safe to import from any client module.
// `import type` from `notify.ts` keeps prisma out of the client bundle.
// =====================================================================

import type { NotificationRow } from "./notify"

type ToastListener = (row: NotificationRow) => void
type RefreshListener = () => void

const toastListeners = new Set<ToastListener>()
const refreshListeners = new Set<RefreshListener>()

export function subscribeToasts(fn: ToastListener): () => void {
  toastListeners.add(fn)
  return () => {
    toastListeners.delete(fn)
  }
}

export function emitToast(row: NotificationRow): void {
  for (const fn of toastListeners) {
    try {
      fn(row)
    } catch (err) {
      console.error("[notification-bus] toast listener threw:", err)
    }
  }
}

export function subscribeRefresh(fn: RefreshListener): () => void {
  refreshListeners.add(fn)
  return () => {
    refreshListeners.delete(fn)
  }
}

export function emitRefresh(): void {
  for (const fn of refreshListeners) {
    try {
      fn()
    } catch (err) {
      console.error("[notification-bus] refresh listener threw:", err)
    }
  }
}

/**
 * Fan freshly created notifications out to the toast channel and ping
 * the bell to refresh its unread count. Safe to call with an empty
 * array — it's a no-op in that case.
 */
export function dispatchNewNotifications(
  rows: readonly NotificationRow[] | null | undefined,
): void {
  if (!rows || rows.length === 0) return
  for (const row of rows) emitToast(row)
  emitRefresh()
}

/**
 * Type guard for use inside `apiFetch` and any other layer that wants
 * to opportunistically fish a `newNotifications` field out of an
 * untyped response body. Validates the shape just enough to be safe;
 * malformed entries are simply skipped.
 */
export function extractNewNotifications(
  body: unknown,
): NotificationRow[] | null {
  if (typeof body !== "object" || body === null) return null
  if (!("newNotifications" in body)) return null
  const raw = (body as { newNotifications: unknown }).newNotifications
  if (!Array.isArray(raw)) return null
  const out: NotificationRow[] = []
  for (const r of raw) {
    if (!isNotificationRow(r)) continue
    out.push(r)
  }
  return out.length > 0 ? out : null
}

function isNotificationRow(v: unknown): v is NotificationRow {
  if (typeof v !== "object" || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === "number" &&
    typeof o.kind === "string" &&
    typeof o.payload === "object" &&
    o.payload !== null &&
    typeof o.createdAt === "string" &&
    (o.readAt === null || typeof o.readAt === "string")
  )
}
