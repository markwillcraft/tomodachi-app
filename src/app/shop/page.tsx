import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Coins, Sparkles, Store, TrendingUp } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCoinSummary } from "@/lib/coins";
import { SHOP_CATEGORIES, SHOP_ITEMS } from "@/lib/shop";
import { ShopBrowser } from "./shop-browser";

// =====================================================================
// /shop — Store
// ---------------------------------------------------------------------
// Phase 1: pure UI scaffold. Every catalog item is `coming-soon`, no
// purchases hit Prisma. The page composes a server-rendered balance
// header (so the coin total is fresh on every visit) with a client-side
// `ShopBrowser` that owns category-tab state.
//
// Phase 2 (when art lands): swap `coming-soon` → `live`, surface a
// real "Buy" action that hits `/api/shop/buy`, and let the dashboard
// mascot read the equipped cosmetics.
// =====================================================================

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const coinSummary = await getCoinSummary(userId);

  // Quick stats for the header — frames the road map size and shows
  // how broad the catalog is across categories.
  const totalItems = SHOP_ITEMS.length;
  const liveItems = SHOP_ITEMS.filter((i) => i.status === "live").length;
  const totalCategories = SHOP_CATEGORIES.length;

  return (
    // `space-y-3` matches the inventory page so both surfaces share
    // the same vertical rhythm. Designed for a no-scroll desktop fit.
    <div className="space-y-3">
      <BalanceHeader
        balance={coinSummary.balance}
        earnedToday={coinSummary.earnedToday}
        liveItems={liveItems}
        totalItems={totalItems}
        totalCategories={totalCategories}
      />

      {/* ShopBrowser pulls SHOP_CATEGORIES + SHOP_ITEMS itself. We don't
          pass them as props because the catalog includes Lucide icon
          components (functions) which are not serialisable across the
          server → client boundary. */}
      <ShopBrowser />
    </div>
  );
}

function BalanceHeader({
  balance,
  earnedToday,
  liveItems,
  totalItems,
  totalCategories,
}: {
  balance: number;
  earnedToday: number;
  liveItems: number;
  totalItems: number;
  totalCategories: number;
}) {
  const liveBalancePct = Math.min(
    100,
    Math.max(0, Math.round((balance / 500) * 100)),
  );
  const catalogPct = Math.round((liveItems / totalItems) * 100);
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-amber-500/20",
        // Same layered backdrop language as the inventory's ClosetHeader
        // (3-stop gradient + corner glow blobs + dot texture + warm
        // halo shadow) so the two pages read as siblings.
        "bg-gradient-to-br from-amber-500/[0.20] via-rose-500/[0.08] to-violet-500/[0.06]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),inset_0_-1px_0_0_rgba(0,0,0,0.06),0_4px_16px_-8px_rgba(245,158,11,0.25)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-amber-400/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-rose-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-1/3 top-0 size-40 rounded-full bg-violet-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:18px_18px] text-foreground"
      />

      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 sm:px-5 sm:py-4">
        {/* ---- Brand mark ---- */}
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span
            className={cn(
              "relative flex size-12 shrink-0 items-center justify-center rounded-xl",
              "bg-gradient-to-br from-amber-400 to-amber-600 text-white",
              "shadow-[0_6px_16px_-4px_rgba(245,158,11,0.55),inset_0_1px_0_0_rgba(255,255,255,0.35)]",
              "ring-1 ring-amber-300/50",
            )}
          >
            <Store className="size-5" strokeWidth={2.5} />
            {/* Currency notch — mirrors the sparkle medallion on the
                inventory brand mark; both anchor a small "feature
                marker" in the lower-right corner. */}
            <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border-2 border-background bg-amber-300 text-[8px] font-black text-amber-900 shadow-sm">
              ¥
            </span>
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h1 className="text-base font-bold tracking-tight sm:text-lg">
                Tomodachi Store
              </h1>
              <span className="hidden text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300/80 sm:inline">
                Cosmetics · Spend coins
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Browse {totalItems} cosmetics across {totalCategories} categories
              and dress up your Dachi.
            </p>
          </div>
        </div>

        {/* ---- Twin progress meters (Wallet + Catalog) ----
            Same component as the inventory's twin meters so the
            visual pattern is shared. The "Wallet" bar maxes out at
            500 coins as a soft target, then keeps showing the real
            balance as the labeled number. */}
        <div className="flex shrink-0 flex-col gap-1.5">
          <ProgressMeter
            label="Wallet"
            current={balance}
            total={500}
            displayCurrent={balance.toLocaleString()}
            displayTotal={
              earnedToday > 0 ? `+${earnedToday.toLocaleString()} today` : "today"
            }
            pct={liveBalancePct}
            from="from-amber-400"
            to="to-rose-500"
            icon={
              <Coins
                className="size-3 text-amber-600 dark:text-amber-300"
                strokeWidth={2.5}
              />
            }
          />
          <ProgressMeter
            label="Catalog"
            current={liveItems}
            total={totalItems}
            pct={catalogPct}
            from="from-emerald-400"
            to="to-sky-500"
            icon={
              <Sparkles
                className="size-3 text-emerald-600 dark:text-emerald-300"
                strokeWidth={2.5}
              />
            }
          />
        </div>

        {/* ---- CTA ----
            Premium gradient pill that mirrors the inventory's
            "Visit Store" button — just retinted to violet/sky for
            the quiz/learn destination so colour communicates intent. */}
        <Button
          asChild
          size="sm"
          className={cn(
            "group/cta relative h-auto overflow-hidden rounded-xl border-0 p-0",
            "bg-gradient-to-br from-violet-400 via-violet-500 to-sky-500",
            "text-white font-semibold",
            "ring-1 ring-violet-300/60",
            "shadow-[0_4px_14px_-2px_rgba(139,92,246,0.45),inset_0_1px_0_0_rgba(255,255,255,0.35),inset_0_-1px_0_0_rgba(0,0,0,0.08)]",
            "hover:shadow-[0_8px_24px_-4px_rgba(139,92,246,0.55),inset_0_1px_0_0_rgba(255,255,255,0.4),inset_0_-1px_0_0_rgba(0,0,0,0.08)]",
            "hover:-translate-y-px transition-all duration-200",
            "focus-visible:ring-2 focus-visible:ring-violet-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <Link
            href="/quiz"
            className="relative flex items-center gap-2 px-4 py-2"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-[300%]"
            />
            <span
              className={cn(
                "relative flex size-5 items-center justify-center rounded-md",
                "bg-white/20 ring-1 ring-inset ring-white/30",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]",
                "transition-transform group-hover/cta:scale-110",
              )}
            >
              <TrendingUp className="size-3" strokeWidth={2.75} />
            </span>
            <span className="relative text-sm tracking-tight">
              Earn coins
            </span>
            <ArrowRight
              className="relative size-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5"
              strokeWidth={2.75}
            />
          </Link>
        </Button>
      </div>
    </section>
  );
}

// =====================================================================
// ProgressMeter
// ---------------------------------------------------------------------
// Local copy of the inventory's progress meter. Kept in lockstep so
// both pages share the exact same look. If we add a third surface
// that needs this, hoist it into `src/components/ui/progress-meter`.
// =====================================================================

function ProgressMeter({
  label,
  current,
  total,
  pct,
  from,
  to,
  icon,
  displayCurrent,
  displayTotal,
}: {
  label: string;
  current: number;
  total: number;
  pct: number;
  from: string;
  to: string;
  icon?: React.ReactNode;
  displayCurrent?: string;
  displayTotal?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex w-[68px] items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <div
        className="relative h-1.5 w-32 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${label}: ${current} of ${total}`}
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all",
            from,
            to,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">
          {displayCurrent ?? current}
        </span>
        <span className="mx-0.5 text-muted-foreground/60">/</span>
        {displayTotal ?? total}
      </span>
    </div>
  );
}
