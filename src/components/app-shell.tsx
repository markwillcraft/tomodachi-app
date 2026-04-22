"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Coins,
  GraduationCap,
  Languages,
  Layers,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  ScrollText,
  Sparkles,
  TrendingUp,
  Upload,
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
// loop with sub-routes). N5 Categories nests under Study because they share
// the "browse vocabulary" mental model.

const NAV_GROUPS: NavGroup[] = [
  {
    id: "track",
    label: "Track",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/progress", label: "Progress", icon: TrendingUp },
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
          { href: "/categories", label: "N5 Categories", icon: Layers },
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
]

const COLLAPSED_KEY = "tomodachi_sidebar_collapsed"
const LAST_VISITED_KEY = "tomodachi_last_visited"

// Anything not in this list is treated as "chrome" and won't be remembered
// for the Continue learning CTA (so coming back doesn't dump you back on
// /import or /dashboard).
const TRACKABLE_PREFIXES = ["/study", "/quiz", "/categories", "/progress"]
const FALLBACK_CONTINUE = "/study"

function isTrackablePath(path: string): boolean {
  return TRACKABLE_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))
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
  const [continueHref, setContinueHref] = useState<string>(FALLBACK_CONTINUE)
  const pathname = usePathname()

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_KEY)
      if (raw === "1") setCollapsed(true)
      const last = window.localStorage.getItem(LAST_VISITED_KEY)
      if (last) setContinueHref(last)
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

  // Remember the most recent learning page so the sidebar CTA can deep-link
  // back to it. We re-read on every pathname change so the button label and
  // target stay in sync as the user navigates.
  useEffect(() => {
    if (!pathname) return
    if (!isTrackablePath(pathname)) return
    try {
      window.localStorage.setItem(LAST_VISITED_KEY, pathname)
      setContinueHref(pathname)
    } catch {
      // ignore
    }
  }, [pathname])

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
    <div className="min-h-screen">
      <DesktopSidebar
        pathname={pathname}
        collapsed={collapsed}
        widthClass={sidebarWidth}
        streak={streak}
        coins={coins}
        continueHref={continueHref}
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
          continueHref={continueHref}
          onClose={() => setDrawerOpen(false)}
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
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
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
// holds Import, theme toggle, and the profile button.

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
      <div className="flex min-w-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="size-9 p-0 lg:hidden"
          aria-label="Open menu"
          onClick={onOpenDrawer}
        >
          <Menu className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden size-9 p-0 lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </Button>
        <Brand size="sm" hideSubtitle className="lg:hidden" />
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {coins && <CoinChip coins={coins} />}
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/import">
            <Upload className="size-4" />
            <span className="hidden sm:inline">Import</span>
          </Link>
        </Button>
        <ThemeToggle />
        <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
      </div>
    </header>
  )
}

function CoinChip({ coins }: { coins: SidebarCoins }) {
  return (
    <Link
      href="/dashboard"
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
  continueHref,
}: {
  pathname: string
  collapsed: boolean
  widthClass: string
  streak: SidebarStreak | null
  coins: SidebarCoins | null
  continueHref: string
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card transition-[width] duration-200 lg:flex",
        widthClass,
      )}
    >
      <SidebarContents
        pathname={pathname}
        collapsed={collapsed}
        streak={streak}
        coins={coins}
        continueHref={continueHref}
      />
    </aside>
  )
}

function SidebarContents({
  pathname,
  collapsed,
  streak,
  coins,
  continueHref,
  onClose,
}: {
  pathname: string
  collapsed: boolean
  streak: SidebarStreak | null
  coins: SidebarCoins | null
  continueHref: string
  onClose?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <SidebarHeader collapsed={collapsed} onClose={onClose} />

      <div
        className={cn(
          "flex-1 overflow-y-auto py-3",
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

      <div
        className={cn(
          "shrink-0 space-y-3 border-t pt-3",
          collapsed ? "px-2 pb-3" : "px-3 pb-3",
        )}
      >
        <ContinueCTA
          collapsed={collapsed}
          streak={streak}
          href={continueHref}
        />
        <TodayPanel streak={streak} collapsed={collapsed} />
        <SidebarCoinsPanel coins={coins} collapsed={collapsed} />
      </div>
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
            href="/dashboard"
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
      href="/dashboard"
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
          label={`${streak.current}-day streak · ${streak.overallPct}% today`}
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

// ---------- continue CTA ----------

function ContinueCTA({
  collapsed,
  streak,
  href,
}: {
  collapsed: boolean
  streak: SidebarStreak | null
  href: string
}) {
  const label = useMemo(() => {
    if (!streak || streak.current === 0) return "Start studying"
    if (streak.todayCompleted) return "Keep going"
    return "Continue learning"
  }, [streak])

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <CollapsedTooltip label={label}>
          <Link
            href={href}
            className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
          >
            <Play className="size-4" fill="currentColor" />
          </Link>
        </CollapsedTooltip>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
    >
      <Play className="size-3.5" fill="currentColor" />
      {label}
    </Link>
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
}: {
  size?: "sm" | "md"
  hideSubtitle?: boolean
  compact?: boolean
  className?: string
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
        <span className="-ml-3 min-w-0 leading-none [text-rendering:geometricPrecision]">
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
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-all duration-150 group-hover/tip:translate-x-0 group-hover/tip:opacity-100"
      >
        {label}
      </span>
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
