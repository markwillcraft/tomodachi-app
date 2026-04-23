"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BookMarked,
  BookOpen,
  Brush,
  Coins,
  GraduationCap,
  Keyboard,
  Languages,
  Layers,
  LayoutDashboard,
  Library,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Trophy,
  TrendingUp,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

// ---------- types ----------

export type SidebarStreak = {
  current: number
  todayCompleted: boolean
  quizDone: number
  quizGoal: number
  cardsDone: number
  cardsGoal: number
  overallPct: number
  freezesAvailable: number
}

export type SidebarCoins = {
  balance: number
  earnedToday: number
}

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  children?: NavItem[]
}

type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}

// ---------- nav config ----------
//
// Track first (where the user lands and reflects), Learn second (the daily
// loop with sub-routes). Study exposes every study surface as a quick-jump
// child so the user can hop straight into kana / vocab / grammar / kanji /
// muscle memory without going through the hub. "Browse Categories" sits
// first because it's the gateway for populating the vocab library.

const NAV_GROUPS: NavGroup[] = [
  {
    id: "track",
    label: "Track",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/progress", label: "Progress", icon: TrendingUp },
      { href: "/achievements", label: "Achievements", icon: Trophy },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    items: [
      {
        href: "/study",
        label: "Study",
        icon: BookOpen,
        children: [
          { href: "/categories", label: "Browse Categories", icon: Layers },
          { href: "/study/kana", label: "Kana Table", icon: Languages },
          { href: "/study/vocab", label: "Vocab Cards", icon: Library },
          { href: "/study/grammar", label: "N5 Grammar", icon: BookMarked },
          { href: "/study/kanji", label: "N5 Kanji", icon: Brush },
          {
            href: "/study/muscle-memory",
            label: "Muscle Memory",
            icon: Keyboard,
          },
        ],
      },
      {
        href: "/quiz",
        label: "Quiz",
        icon: GraduationCap,
        children: [
          { href: "/quiz/vocab", label: "Vocab", icon: Sparkles },
          { href: "/quiz/kana", label: "Hiragana / Katakana", icon: Languages },
          { href: "/quiz/kanji", label: "Kanji", icon: ScrollText },
        ],
      },
    ],
  },
  {
    // Cosmetics economy: Store is where the user spends coins,
    // Inventory is where their unlocks live. Sits between Learn and
    // Account so the natural flow is "study → earn → spend → flex".
    id: "shop",
    label: "Shop",
    items: [
      { href: "/shop", label: "Store", icon: ShoppingBag },
      { href: "/inventory", label: "Inventory", icon: Package },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
]

const COLLAPSED_KEY = "tomodachi_sidebar_collapsed"

// Routes that opt into the wider main-canvas (max-w-7xl). Visual
// surfaces with a lot of horizontal layout (shop shelf, equipped
// preview grid) need the extra room; everything else reads better at
// the narrower default width.
const WIDE_ROUTE_PREFIXES = ["/shop", "/inventory"]
function isWideRoute(pathname: string): boolean {
  return WIDE_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  )
}

// ---------- shell ----------

export function AppShell({
  isSignedIn,
  streak,
  coins,
  children,
}: {
  isSignedIn: boolean
  streak: SidebarStreak | null
  coins: SidebarCoins | null
  children: React.ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_KEY)
      if (raw === "1") setCollapsed(true)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0")
    } catch {
      // ignore
    }
  }, [collapsed])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [drawerOpen])

  // Keep the server's stored timezone in sync with the user's actual
  // browser timezone. We do a self-healing check: fetch what the server
  // currently has and only POST when it differs. This handles the case
  // where an unrelated upsert (e.g. toggling `autoFreezeStreak`) created
  // a UserProfile row with the default `UTC` and the previous cache-only
  // sync thought it was already in sync.
  //
  // The localStorage cache is still used as an optimization: if we've
  // already confirmed the server matches within the last day, we skip
  // the GET. It resets automatically when the browser tz changes.
  useEffect(() => {
    if (!isSignedIn) return
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!tz) return
      const cacheKey = "tomodachi_tz_synced"
      const now = Date.now()
      const ONE_DAY = 24 * 60 * 60 * 1000
      try {
        const raw = window.localStorage.getItem(cacheKey)
        if (raw) {
          const parsed = JSON.parse(raw) as { tz?: string; at?: number }
          if (parsed.tz === tz && parsed.at && now - parsed.at < ONE_DAY) {
            return
          }
        }
      } catch {
        // Malformed cache; fall through and re-sync.
      }

      void (async () => {
        try {
          const res = await fetch("/api/profile/preferences")
          if (!res.ok) return
          const prefs = (await res.json().catch(() => null)) as
            | { timezone?: string }
            | null
          if (prefs?.timezone !== tz) {
            const upd = await fetch("/api/profile/timezone", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ timezone: tz }),
            })
            if (!upd.ok) return
            // Server-stored data changed — force a refresh so daily
            // countdowns, streak calendar anchor, and quest reset times
            // all re-render with the correct tz without requiring a
            // manual reload.
            router.refresh()
          }
          window.localStorage.setItem(
            cacheKey,
            JSON.stringify({ tz, at: now }),
          )
        } catch {
          // Network errors are fine — we'll retry next mount.
        }
      })()
    } catch {
      // Intl unavailable in this environment; nothing to do.
    }
  }, [isSignedIn, router])

  if (!isSignedIn) {
    return (
      <div className="min-h-screen">
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
            <Brand />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <SignInButton mode="modal">
                <Button size="sm" variant="ghost">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Sign up</Button>
              </SignUpButton>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </div>
    )
  }

  const sidebarWidth = collapsed ? "lg:w-[72px]" : "lg:w-[260px]"
  const mainOffset = collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"

  return (
    <div className="min-h-screen overflow-x-clip">
      <DesktopSidebar
        pathname={pathname}
        collapsed={collapsed}
        widthClass={sidebarWidth}
        streak={streak}
        coins={coins}
      />

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] transform border-r bg-card transition-transform lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContents
          pathname={pathname}
          collapsed={false}
          streak={streak}
          coins={coins}
          onClose={() => setDrawerOpen(false)}
          hideSummaryPanels
        />
      </aside>

      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200",
          mainOffset,
        )}
      >
        <TopBar
          collapsed={collapsed}
          coins={coins}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <main>
          <div
            className={cn(
              "mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:py-10",
              // Cosmetics surfaces (Store, Inventory) get the full
              // available canvas (capped at the screen-2xl breakpoint
              // so it doesn't run away on ultra-wide displays). The
              // shop shelf benefits from every pixel — more visible
              // cards per row = less scrolling. Everything else stays
              // at the reading-friendly 5xl width.
              isWideRoute(pathname)
                ? "max-w-screen-2xl"
                : "max-w-5xl",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// ---------- topbar ----------
//
// One topbar that adapts: on mobile it has the menu trigger + brand; on
// desktop it has the sidebar collapse toggle. Either way the right side
// holds the coin chip, theme toggle, and the profile button. (Import
// lives on the Study page — it's a contextual action, not a chrome one.)

function TopBar({
  collapsed,
  coins,
  onToggleCollapsed,
  onOpenDrawer,
}: {
  collapsed: boolean
  coins: SidebarCoins | null
  onToggleCollapsed: () => void
  onOpenDrawer: () => void
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 min-h-16 items-center justify-between gap-2 border-b bg-background/85 px-3 py-0 backdrop-blur sm:px-4">
      {/* Left cluster shrinks; the Tomodachi wordmark is hidden on phones to
          avoid colliding with the action cluster on the right. */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          className="size-9 shrink-0 p-0 lg:hidden"
          aria-label="Open menu"
          onClick={onOpenDrawer}
        >
          <Menu className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden size-9 shrink-0 p-0 lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </Button>
        <Brand
          size="sm"
          hideSubtitle
          className="lg:hidden"
          wordmarkClassName="hidden sm:inline"
        />
      </div>
      {/* Right cluster never compresses — it owns its width. */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {coins && <CoinChip coins={coins} />}
        <ThemeToggle />
        <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
      </div>
    </header>
  )
}

function CoinChip({ coins }: { coins: SidebarCoins }) {
  return (
    <Link
      // Coins lead to the Store: it's the natural "what can I spend
      // this on?" destination and teases the shop whenever the user
      // glances at their balance.
      href="/shop"
      aria-label={`${coins.balance} coins · +${coins.earnedToday} today`}
      title={`${coins.balance} coins · +${coins.earnedToday} earned today`}
      className={cn(
        "group inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-sm font-semibold tabular-nums transition-colors",
        "border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-orange-500/10 text-amber-700 hover:from-amber-500/25 hover:to-orange-500/15 dark:text-amber-200",
      )}
    >
      <Coins
        className="size-4 text-amber-600 transition-transform group-hover:scale-110 dark:text-amber-300"
        strokeWidth={2.25}
      />
      <span>{coins.balance.toLocaleString()}</span>
      {coins.earnedToday > 0 && (
        <span className="hidden rounded-full bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-700 dark:text-amber-200 sm:inline-block">
          +{coins.earnedToday}
        </span>
      )}
    </Link>
  )
}

// ---------- desktop sidebar ----------

function DesktopSidebar({
  pathname,
  collapsed,
  widthClass,
  streak,
  coins,
}: {
  pathname: string
  collapsed: boolean
  widthClass: string
  streak: SidebarStreak | null
  coins: SidebarCoins | null
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-card transition-[width] duration-200 lg:flex",
        widthClass,
      )}
    >
      <SidebarContents
        pathname={pathname}
        collapsed={collapsed}
        streak={streak}
        coins={coins}
      />
    </aside>
  )
}

function SidebarContents({
  pathname,
  collapsed,
  streak,
  coins,
  onClose,
  // When true, the streak + coin panels at the bottom of the sidebar
  // are suppressed. The mobile drawer opts in to this: the topbar
  // already surfaces the coin balance on mobile and the dashboard
  // itself shows the full streak widget, so duplicating them inside
  // the nav drawer just crowds the screen.
  hideSummaryPanels = false,
}: {
  pathname: string
  collapsed: boolean
  streak: SidebarStreak | null
  coins: SidebarCoins | null
  onClose?: () => void
  hideSummaryPanels?: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <SidebarHeader collapsed={collapsed} onClose={onClose} />

      <div
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden py-3",
          collapsed ? "px-2" : "px-3",
        )}
      >
        <nav className={cn("flex flex-col", collapsed ? "gap-3" : "gap-5")}>
          {NAV_GROUPS.map((group, idx) => (
            <NavGroupBlock
              key={group.id}
              group={group}
              pathname={pathname}
              collapsed={collapsed}
              isFirst={idx === 0}
            />
          ))}
        </nav>
      </div>

      {!hideSummaryPanels && (
        <div
          className={cn(
            "shrink-0 space-y-3 border-t pt-3",
            collapsed ? "px-2 pb-3" : "px-3 pb-3",
          )}
        >
          <TodayPanel streak={streak} collapsed={collapsed} />
          <SidebarCoinsPanel coins={coins} collapsed={collapsed} />
        </div>
      )}
    </div>
  )
}

// ---------- coin panel (sidebar) ----------

function SidebarCoinsPanel({
  coins,
  collapsed,
}: {
  coins: SidebarCoins | null
  collapsed: boolean
}) {
  if (!coins) return null
  if (collapsed) {
    return (
      <div className="flex justify-center">
        <CollapsedTooltip
          label={`${coins.balance.toLocaleString()} coins · +${coins.earnedToday} today`}
        >
          <Link
            href="/shop"
            className="relative flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/30 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
          >
            <Coins className="size-4" strokeWidth={2.25} />
            {coins.earnedToday > 0 && (
              <span className="absolute -bottom-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 px-1 text-[9px] font-bold text-white shadow ring-2 ring-card tabular-nums">
                +{coins.earnedToday}
              </span>
            )}
          </Link>
        </CollapsedTooltip>
      </div>
    )
  }
  return (
    <Link
      href="/shop"
      className="block rounded-xl border bg-gradient-to-br from-amber-500/10 via-card to-card p-3 transition-colors hover:from-amber-500/15"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex size-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300">
          <Coins className="size-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold tabular-nums">
              {coins.balance.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">coins</span>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {coins.earnedToday > 0
              ? `+${coins.earnedToday} earned today`
              : "Earn coins from quizzes & study"}
          </p>
        </div>
      </div>
    </Link>
  )
}

function SidebarHeader({
  collapsed,
  onClose,
}: {
  collapsed: boolean
  onClose?: () => void
}) {
  return (
    <div
      className={cn(
        "flex h-16 min-h-16 items-center border-b",
        collapsed
          ? "justify-center px-2"
          : onClose
            ? "justify-between px-4"
            : "justify-center px-4",
      )}
    >
      {collapsed ? (
        <Brand size="sm" hideSubtitle compact />
      ) : (
        <Brand size="sm" className="-ml-6" />
      )}
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          aria-label="Close menu"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  )
}

// ---------- today panel ----------

function TodayPanel({
  streak,
  collapsed,
}: {
  streak: SidebarStreak | null
  collapsed: boolean
}) {
  if (!streak) return null

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <CollapsedTooltip
          label={
            streak.freezesAvailable > 0
              ? `${streak.current}-day streak · ${streak.overallPct}% today · ${streak.freezesAvailable} freeze${streak.freezesAvailable === 1 ? "" : "s"}`
              : `${streak.current}-day streak · ${streak.overallPct}% today`
          }
        >
          <Link
            href="/study"
            className="relative flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 ring-1 ring-inset ring-orange-500/30 transition-colors hover:bg-orange-500/20 dark:text-orange-300"
          >
            <FlameIcon active={streak.current > 0 || streak.todayCompleted} />
            {streak.current > 0 && (
              <span className="absolute -bottom-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-600 px-1 text-[9px] font-bold text-white shadow ring-2 ring-card tabular-nums">
                {streak.current}
              </span>
            )}
            {streak.freezesAvailable > 0 && (
              <span className="absolute -left-1 -top-1 inline-flex size-4 items-center justify-center rounded-full bg-sky-500 text-white shadow ring-2 ring-card">
                <Shield className="size-2.5" strokeWidth={2.5} />
              </span>
            )}
          </Link>
        </CollapsedTooltip>
      </div>
    )
  }

  const subtitle = streak.todayCompleted
    ? "Today complete · nice work"
    : streak.current === 0
      ? "Start a streak today"
      : "Keep your streak alive"

  return (
    <Link
      href="/study"
      className="block rounded-xl border bg-gradient-to-br from-orange-500/10 via-card to-card p-3 transition-colors hover:from-orange-500/15"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex size-10 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 ring-1 ring-inset ring-orange-500/30 dark:text-orange-300">
          <FlameIcon active={streak.current > 0 || streak.todayCompleted} />
          {streak.current > 0 && (
            <span className="absolute -bottom-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-600 px-1 text-[9px] font-bold text-white shadow ring-2 ring-card tabular-nums">
              {streak.current}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold tabular-nums">
              {streak.current}
            </span>
            <span className="text-xs text-muted-foreground">day streak</span>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            streak.todayCompleted
              ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
              : "bg-orange-500/15 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
          )}
        >
          {streak.overallPct}%
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniGoal
          label="Quiz"
          done={streak.quizDone}
          goal={streak.quizGoal}
          tone="violet"
        />
        <MiniGoal
          label="Cards"
          done={streak.cardsDone}
          goal={streak.cardsGoal}
          tone="amber"
        />
      </div>
      {streak.freezesAvailable > 0 && (
        <div
          className="mt-3 flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-[11px] text-sky-700 dark:text-sky-200"
          title="Streak freezes auto-save a missed day so your streak stays alive."
        >
          <Shield className="size-3.5" strokeWidth={2.25} />
          <span className="font-medium">
            {streak.freezesAvailable}{" "}
            {streak.freezesAvailable === 1 ? "freeze" : "freezes"} ready
          </span>
          <span className="ml-auto text-[10px] opacity-70">
            auto-saves a day
          </span>
        </div>
      )}
    </Link>
  )
}

function MiniGoal({
  label,
  done,
  goal,
  tone,
}: {
  label: string
  done: number
  goal: number
  tone: "violet" | "amber"
}) {
  const pct = Math.min(100, Math.round((done / goal) * 100))
  const complete = done >= goal
  const TONE = {
    violet: "from-violet-500 to-indigo-500",
    amber: "from-amber-400 to-orange-500",
  } as const
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            "font-medium tabular-nums",
            complete
              ? "text-emerald-600 dark:text-emerald-300"
              : "text-foreground/80",
          )}
        >
          {done}/{goal}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-[width] duration-500",
            complete ? "from-emerald-500 to-emerald-400" : TONE[tone],
          )}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
    </div>
  )
}

// ---------- nav ----------

function NavGroupBlock({
  group,
  pathname,
  collapsed,
  isFirst,
}: {
  group: NavGroup
  pathname: string
  collapsed: boolean
  isFirst: boolean
}) {
  return (
    <div>
      {!collapsed ? (
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          {group.label}
        </div>
      ) : (
        // In collapsed mode the row of icons should breathe naturally, so
        // we drop the divider on the very first group and use a tiny
        // centered hairline between the rest. No more full-width line.
        !isFirst && (
          <div
            aria-hidden
            className="mx-auto mb-2 h-px w-5 rounded-full bg-border"
          />
        )
      )}
      <ul
        className={cn(
          "flex flex-col",
          collapsed ? "items-center gap-1" : "gap-0.5",
        )}
      >
        {group.items.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </ul>
    </div>
  )
}

function NavRow({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
}) {
  const childActive =
    item.children?.some(
      (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
    ) ?? false
  const selfActive =
    pathname === item.href || pathname.startsWith(item.href + "/")
  const active = selfActive || childActive

  return (
    <li>
      <NavLink
        item={item}
        active={active}
        collapsed={collapsed}
        // When the active page is a child route (e.g. /categories under
        // Study), keep the parent visually highlighted but slightly softer
        // so the child row reads as "you are here".
        softActive={!selfActive && childActive}
      />
      {!collapsed && item.children && item.children.length > 0 && (
        // Tree connector: a vertical guide line drops from under the
        // parent icon and a short stub reaches across to each child so
        // the nesting reads instantly.
        <ul className="relative mt-0.5 space-y-0.5 pl-[26px]">
          <span
            aria-hidden
            className="absolute bottom-3 left-[19px] top-0 w-px bg-border"
          />
          {item.children.map((child, idx) => {
            const isLast = idx === item.children!.length - 1
            const childIsActive =
              pathname === child.href || pathname.startsWith(child.href + "/")
            return (
              <li key={child.href} className="relative">
                <span
                  aria-hidden
                  className="absolute left-[-7px] top-1/2 h-px w-2.5 bg-border"
                />
                {isLast && (
                  <span
                    aria-hidden
                    className="absolute bottom-1/2 left-[-7px] top-0 w-px bg-border"
                  />
                )}
                <NavLink
                  item={child}
                  active={childIsActive}
                  collapsed={false}
                  isChild
                />
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

function NavLink({
  item,
  active,
  collapsed,
  isChild = false,
  softActive = false,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  isChild?: boolean
  softActive?: boolean
}) {
  const Icon = item.icon
  const trueActive = active && !softActive

  // Active state design: a warm tinted square (collapsed) or soft
  // gradient pill (expanded) with an inset ring for a subtle border,
  // bold text, and a brand-colored icon. We dropped the left accent bar
  // because it floated awkwardly next to the centered icon in collapsed
  // mode and made the active row look like a pill behind a dot.
  const link = (
    <Link
      href={item.href}
      aria-current={trueActive ? "page" : undefined}
      className={cn(
        "group/link relative flex items-center text-sm transition-all duration-150",
        collapsed
          ? "size-10 justify-center rounded-xl"
          : isChild
            ? "gap-2 rounded-md px-2 py-1.5 text-[13px]"
            : "gap-2.5 rounded-lg px-3 py-2",
        trueActive
          ? collapsed
            ? "bg-primary/15 text-primary shadow-sm ring-1 ring-inset ring-primary/25"
            : isChild
              ? "bg-primary/10 font-medium text-foreground"
              : "bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 font-semibold text-foreground ring-1 ring-inset ring-primary/15"
          : softActive
            ? "bg-primary/5 text-foreground hover:bg-primary/10"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {isChild && (
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full transition-colors",
            active ? "bg-primary" : "bg-muted-foreground/40",
          )}
        />
      )}
      <Icon
        strokeWidth={trueActive ? 2.25 : 1.75}
        className={cn(
          isChild ? "size-3.5" : "size-[18px]",
          "shrink-0 transition-colors",
          trueActive
            ? "text-primary"
            : softActive
              ? "text-foreground/80"
              : "text-muted-foreground group-hover/link:text-foreground",
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )

  if (collapsed) {
    return <CollapsedTooltip label={item.label}>{link}</CollapsedTooltip>
  }
  return link
}

// ---------- brand ----------

function Brand({
  size = "md",
  hideSubtitle: _hideSubtitle = false,
  compact = false,
  className,
  wordmarkClassName,
}: {
  size?: "sm" | "md"
  hideSubtitle?: boolean
  compact?: boolean
  className?: string
  // Caller can hide / restyle the "Tomodachi" wordmark — used by the mobile
  // topbar to drop the wordmark on narrow screens where it would otherwise
  // collide with the right-side action cluster (coin chip, Import, etc).
  wordmarkClassName?: string
}) {
  void _hideSubtitle
  // tomodachi-logo.svg viewBox 669×373 — full asset, no clipping
  const h = compact ? (size === "sm" ? 40 : 48) : size === "sm" ? 48 : 60
  const w = Math.round((h * 669) / 373)
  return (
    <Link
      href="/dashboard"
      className={cn(
        "inline-flex min-w-0 items-center gap-0 font-extrabold leading-none tracking-tight",
        size === "sm" ? "text-3xl" : "text-4xl",
        className,
      )}
    >
      <Image
        src="/tomodachi-logo.svg"
        alt=""
        width={w}
        height={h}
        priority
        className={cn(
          "w-auto shrink-0 select-none",
          compact
            ? size === "sm"
              ? "h-10"
              : "h-12"
            : size === "sm"
              ? "h-12"
              : "h-[60px]",
        )}
        draggable={false}
      />
      {!compact && (
        <span
          className={cn(
            "-ml-3 min-w-0 leading-none [text-rendering:geometricPrecision]",
            wordmarkClassName,
          )}
        >
          Tomodachi
        </span>
      )}
    </Link>
  )
}

// ---------- tooltip ----------
//
// Custom hover tooltip used in collapsed sidebar mode. We avoid the native
// `title` attribute because its delay and OS styling break the visual flow.

function CollapsedTooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{
    top: number
    left: number
  } | null>(null)

  const updatePosition = () => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPosition({
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    })
  }

  useEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [open])

  return (
    <span
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        updatePosition()
        setOpen(true)
      }}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => {
        updatePosition()
        setOpen(true)
      }}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open && position && (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-100 shadow-md"
          style={{
            top: position.top,
            left: position.left,
            transform: "translateY(-50%)",
          }}
        >
          {label}
        </span>
      )}
    </span>
  )
}

// ---------- icons ----------

function FlameIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      className={cn(!active && "opacity-50 saturate-50")}
    >
      <defs>
        <linearGradient id="sb-flame" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="45%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        fill="url(#sb-flame)"
        stroke="#b91c1c"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
