"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const CACHE_KEY = "tomodachi_tz_synced"
const ONE_DAY = 24 * 60 * 60 * 1000

/**
 * Keep the server's stored timezone in sync with the user's actual
 * browser timezone. We do a self-healing check: fetch what the server
 * currently has and only POST when it differs. This handles the case
 * where an unrelated upsert (e.g. toggling `autoFreezeStreak`) created
 * a UserProfile row with the default `UTC` and the previous cache-only
 * sync thought it was already in sync.
 *
 * The localStorage cache is still used as an optimization: if we've
 * already confirmed the server matches within the last day, we skip
 * the GET. It resets automatically when the browser tz changes.
 *
 * Lives in its own hook so `AppShell` stays focused on layout.
 */
export function useTimezoneSync(isSignedIn: boolean): void {
  const router = useRouter()

  useEffect(() => {
    if (!isSignedIn) return

    const tz = safeBrowserTimezone()
    if (!tz) return

    if (cacheHit(tz)) return

    // AbortController guards against the (rare) double-fire from
    // React's strict mode in dev: if the effect re-runs before the
    // request settles, we cancel the in-flight fetch instead of
    // racing two writes.
    const ctrl = new AbortController()
    void syncTimezone(tz, router, ctrl.signal)
    return () => ctrl.abort()
  }, [isSignedIn, router])
}

function safeBrowserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

function cacheHit(tz: string): boolean {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { tz?: string; at?: number }
    return (
      parsed.tz === tz &&
      typeof parsed.at === "number" &&
      Date.now() - parsed.at < ONE_DAY
    )
  } catch {
    return false
  }
}

async function syncTimezone(
  tz: string,
  router: ReturnType<typeof useRouter>,
  signal: AbortSignal,
): Promise<void> {
  try {
    const res = await fetch("/api/profile/preferences", { signal })
    if (!res.ok) return
    const prefs = (await res.json().catch(() => null)) as
      | { timezone?: string }
      | null
    if (prefs?.timezone !== tz) {
      const upd = await fetch("/api/profile/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: tz }),
        signal,
      })
      if (!upd.ok) return
      // Server-stored data changed — force a refresh so daily
      // countdowns, streak calendar anchor, and quest reset times
      // all re-render with the correct tz without requiring a
      // manual reload.
      router.refresh()
    }
    try {
      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ tz, at: Date.now() }),
      )
    } catch {
      // Storage may be disabled (private mode); the next mount will
      // just re-check, which is fine.
    }
  } catch {
    // Network errors and aborts are both fine — we'll retry next mount.
  }
}
