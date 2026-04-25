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
//      can re-pull immediately instead of polling on a timer.
//
// `dispatchNewNotifications(rows)` is the one-call helper the rest of
// the app uses: it fans rows to the toast channel AND emits a single
// refresh signal so the bell catches up in the same tick. It also
// posts a cross-tab message so any other open tab refreshes its bell
// — that's how we replace the old 60s poll without losing freshness
// when the user has the app open in two tabs (e.g. doing a quiz in
// tab A while tab B sits on the dashboard).
//
// No DOM dependency in the listener API itself. The cross-tab bridge
// uses `BroadcastChannel` when available and degrades to a no-op
// otherwise (Safari extension contexts, server-side imports).
//
// `import type` from `notify.ts` keeps prisma out of the client bundle.
// =====================================================================

import type { NotificationRow } from "./notify"

type ToastListener = (row: NotificationRow) => void
type RefreshListener = () => void

const toastListeners = new Set<ToastListener>()
const refreshListeners = new Set<RefreshListener>()

// Cross-tab channel name. Anything posted here is interpreted as
// "another tab created a notification — your bell is stale".
const CROSS_TAB_CHANNEL = "tomodachi-notifications"
type CrossTabMessage = { kind: "refresh" }

// Lazy singleton so we only construct one BroadcastChannel per tab.
let crossTabChannel: BroadcastChannel | null = null
let crossTabInited = false

function ensureCrossTab(): BroadcastChannel | null {
  if (crossTabInited) return crossTabChannel
  crossTabInited = true
  if (typeof window === "undefined") return null
  if (typeof BroadcastChannel === "undefined") return null
  try {
    const ch = new BroadcastChannel(CROSS_TAB_CHANNEL)
    ch.addEventListener("message", (ev: MessageEvent<CrossTabMessage>) => {
      // Other tabs only ever ask us to refresh — they don't ship the
      // row payload, since toasts should only pop in the tab the user
      // is actively interacting with. The bell will fetch fresh data
      // and the new entries will appear in the dropdown / badge.
      if (ev.data?.kind === "refresh") emitRefreshLocal()
    })
    crossTabChannel = ch
    return ch
  } catch {
    return null
  }
}

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
  // Touch the cross-tab channel on first subscribe so listeners get
  // wired up before any other tab has a chance to publish.
  ensureCrossTab()
  refreshListeners.add(fn)
  return () => {
    refreshListeners.delete(fn)
  }
}

// Local-only refresh emit. Used internally by the cross-tab handler
// (so a remote refresh doesn't bounce back across tabs and loop).
function emitRefreshLocal(): void {
  for (const fn of refreshListeners) {
    try {
      fn()
    } catch (err) {
      console.error("[notification-bus] refresh listener threw:", err)
    }
  }
}

/**
 * Emit a refresh signal locally AND notify other tabs. Most callers
 * should prefer `dispatchNewNotifications`, but this is exposed for
 * the rare case where the bell needs to be told "the server may have
 * changed under you" without an associated row payload.
 */
export function emitRefresh(): void {
  emitRefreshLocal()
  const ch = ensureCrossTab()
  if (ch) {
    try {
      ch.postMessage({ kind: "refresh" } satisfies CrossTabMessage)
    } catch {
      // postMessage can throw on detached channels (tab teardown).
      // Nothing actionable; the local emit already happened.
    }
  }
}

/**
 * Fan freshly created notifications out to the toast channel, ping
 * the bell to refresh its unread count, and notify other tabs so
 * their bells stay in sync. Safe to call with an empty array — it's
 * a no-op in that case.
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
