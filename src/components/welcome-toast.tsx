"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useUser } from "@clerk/nextjs"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// =====================================================================
// Welcome toast
// ---------------------------------------------------------------------
// Floating bottom-right card that says "Welcome back, <name>" once per
// browser session. Gated on `sessionStorage` so it shows on a fresh
// sign-in (or a fresh tab) but stays quiet on internal navigation /
// page reloads — exactly matching the "every time the user logs in"
// expectation, since a fresh sign-in always opens a fresh session.
//
// Deliberately NOT a Notification row: this is a transient greeting,
// not something the user would ever want to revisit in the bell. The
// only state we need to remember is "did we already show it this
// session", which sessionStorage handles natively (cleared when the
// last tab of the origin closes).
//
// Render placement: mounted once near the root of the signed-in shell,
// so it pops in regardless of which page the user lands on after auth.
// =====================================================================

const SESSION_KEY = "tomodachi_welcome_shown"

// How long the toast stays on screen before sliding out.
const AUTO_DISMISS_MS = 6_000
// Tailwind `duration-300` matches the enter/exit transition below.
const EXIT_ANIM_MS = 300

type Phase = "hidden" | "entering" | "visible" | "leaving"

export function WelcomeToast() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [phase, setPhase] = useState<Phase>("hidden")

  // Decide whether to show on first sign-in load. We wait for Clerk to
  // hydrate (`isLoaded`) so we don't flash for signed-out users, then
  // check sessionStorage exactly once per mount.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let alreadyShown = false
    try {
      alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "1"
    } catch {
      // Storage may be disabled (private mode, locked-down browser).
      // Falling through means we'll show the toast every fresh mount,
      // which is acceptable degraded behavior for a one-line greeting.
    }
    if (alreadyShown) return

    try {
      window.sessionStorage.setItem(SESSION_KEY, "1")
    } catch {
      // ignore — see above.
    }

    // Defer the "entering" phase by a frame so the initial off-screen
    // class is committed first, giving the CSS transition something
    // to animate from.
    const enterRaf = requestAnimationFrame(() => setPhase("entering"))
    const settleTimer = window.setTimeout(
      () => setPhase("visible"),
      EXIT_ANIM_MS,
    )
    const dismissTimer = window.setTimeout(() => {
      setPhase("leaving")
      window.setTimeout(() => setPhase("hidden"), EXIT_ANIM_MS)
    }, AUTO_DISMISS_MS)

    return () => {
      cancelAnimationFrame(enterRaf)
      window.clearTimeout(settleTimer)
      window.clearTimeout(dismissTimer)
    }
  }, [isLoaded, isSignedIn])

  if (phase === "hidden") return null

  const firstName =
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress.split("@")[0] ??
    "there"

  const handleClose = () => {
    setPhase("leaving")
    window.setTimeout(() => setPhase("hidden"), EXIT_ANIM_MS)
  }

  // The toast lives in the bottom-right by default. On phones we anchor
  // it to the bottom safe area and stretch full-width-minus-margin so
  // it reads cleanly on small screens without colliding with the topbar.
  const offScreen = phase === "entering" || phase === "leaving"

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed z-50 transition-all duration-300 ease-out",
        // Mobile: bottom-pinned, near-full-width.
        "bottom-3 left-3 right-3",
        // Desktop: anchored bottom-right, fixed width.
        "sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px]",
        // Animation: slide up + fade.
        offScreen
          ? "translate-y-3 opacity-0 sm:translate-y-4"
          : "translate-y-0 opacity-100",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border border-amber-500/30 bg-card/95 p-3.5 pr-9 shadow-xl backdrop-blur",
          "ring-1 ring-amber-500/10",
        )}
      >
        {/* Soft warm halo behind the mascot — feels like sunrise. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-8 -top-8 size-32 rounded-full bg-gradient-to-br from-amber-400/30 via-orange-400/10 to-transparent blur-xl"
        />
        <span className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-500/20 ring-1 ring-amber-500/30">
          <Image
            src="/Dachi-mascot.png"
            alt=""
            width={44}
            height={44}
            className="size-10 select-none object-contain"
            draggable={false}
            priority={false}
          />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">
            Welcome back, <span className="text-amber-700 dark:text-amber-300">{firstName}</span>!
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ready for today&apos;s study session?
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss welcome message"
          className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
