/**
 * Tiny fetch wrapper for first-party `/api/*` calls.
 *
 * Why this exists:
 * - Every client `fetch` site was inventing its own JSON parsing
 *   and error-handling. That's a paper cut at first and a
 *   bug factory once we add 429/5xx semantics, retries, and
 *   AbortController plumbing.
 * - Centralizing it means error handling, rate-limit awareness,
 *   and abort propagation get fixed in one place.
 *
 * Conventions baked in:
 * - 429 → `ApiRateLimitError` so callers can show a "slow down"
 *   toast without re-parsing headers.
 * - Non-2xx with a JSON `{ error: string }` body → `ApiError`
 *   carrying that message, the status, and the parsed body.
 * - 204 / empty body → `null` instead of throwing on JSON parse.
 * - Abort is treated as a normal cancellation: the promise
 *   rejects with the underlying `DOMException`, never an
 *   `ApiError`. Callers can `if (e.name === "AbortError") return`.
 * - Any 2xx response carrying `newNotifications: NotificationRow[]`
 *   has those rows auto-dispatched to the notification bus, so a
 *   single trigger route round-trip both writes the bell entry and
 *   pops the toast on the user's screen — no per-call-site plumbing.
 *
 * NOT included on purpose:
 * - No retry loop — read endpoints can be retried at the call
 *   site if needed; write endpoints must not be auto-retried
 *   (idempotency belongs at the route).
 * - No global cache — Server Components and `router.refresh()`
 *   are the right cache layer for this app.
 */

import {
  dispatchNewNotifications,
  extractNewNotifications,
} from "./notification-bus"

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

export class ApiRateLimitError extends ApiError {
  /** Seconds until the bucket refills, surfaced from the `retry-after` header. */
  readonly retryAfter: number | null

  constructor(message: string, body: unknown, retryAfter: number | null) {
    super(message, 429, body)
    this.name = "ApiRateLimitError"
    this.retryAfter = retryAfter
  }
}

/**
 * Fetch JSON from a first-party API route.
 *
 * Throws:
 * - `ApiRateLimitError` on 429
 * - `ApiError` on any other non-2xx
 * - `DOMException` (AbortError) when the signal fires
 */
export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init)
  const body = await readJsonSafe(res)

  if (!res.ok) {
    const message =
      (isErrorBody(body) && body.error) || `${res.status} ${res.statusText}`

    if (res.status === 429) {
      const ra = res.headers.get("retry-after")
      const retryAfter = ra ? Number.parseInt(ra, 10) : null
      throw new ApiRateLimitError(
        message,
        body,
        Number.isFinite(retryAfter) ? retryAfter : null,
      )
    }
    throw new ApiError(message, res.status, body)
  }

  // Auto-dispatch any notification rows the route attached to its
  // response. Done after the ok-check so failures never trigger a
  // toast. Synchronous (the bus is in-process), so it adds zero
  // latency to the call site that's awaiting `apiFetch`.
  const fresh = extractNewNotifications(body)
  if (fresh) dispatchNewNotifications(fresh)

  return body as T
}

async function readJsonSafe(res: Response): Promise<unknown> {
  // 204 / 205 have no body by spec; some routes also return empty 200s.
  if (res.status === 204 || res.status === 205) return null
  const text = await res.text()
  if (text.length === 0) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function isErrorBody(b: unknown): b is { error: string } {
  return (
    typeof b === "object" &&
    b !== null &&
    "error" in b &&
    typeof (b as { error: unknown }).error === "string"
  )
}

/**
 * Human-readable message for any error thrown out of `apiFetch`.
 *
 * - 429 → "You're going too fast. Try again in Xs."
 * - Other API errors → the server's `error` field (or a generic
 *   fallback if the server didn't send one).
 * - Anything else → the `Error.message`, falling back to `fallback`.
 *
 * Use this in catch blocks so every call site reports rate limits
 * the same way without re-implementing the string formatting.
 */
export function apiErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiRateLimitError) {
    const wait = e.retryAfter ? ` Try again in ${e.retryAfter}s.` : ""
    return `You're going too fast.${wait}`
  }
  if (e instanceof Error) return e.message || fallback
  return fallback
}
