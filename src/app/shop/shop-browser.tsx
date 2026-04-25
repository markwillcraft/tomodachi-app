"use client"

import { useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Coins, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, formatInt } from "@/lib/utils"
import {
  RARITY_META,
  SHOP_CATEGORIES,
  SHOP_ITEMS,
  TONE_META,
  type ShopCategory,
  type ShopItem,
  type ShopTone,
} from "@/lib/shop"

// =====================================================================
// ShopBrowser — game-style layout
// ---------------------------------------------------------------------
// A vertical category rail on the left (think RPG inventory / pet-shop
// sidebar) and a horizontally-scrolling "shelf" of item cards on the
// right. Cards have a fixed width so the shelf metaphor scales: <=8
// items fit in one or two rows on wide screens; more than that and the
// user scrolls sideways with the chevron buttons or a swipe.
//
// Mobile/narrow viewports collapse the rail to a horizontal strip
// pinned above the shelf so there's still room for the cards.
// =====================================================================

// Tone-specific tint for the active rail tile. Component-local so the
// catalog module stays styling-agnostic.
const TILE_ACTIVE: Record<ShopTone, string> = {
  violet:
    "bg-violet-500/15 text-violet-700 ring-violet-500/40 dark:text-violet-200",
  amber: "bg-amber-500/15 text-amber-700 ring-amber-500/40 dark:text-amber-200",
  rose: "bg-rose-500/15 text-rose-700 ring-rose-500/40 dark:text-rose-200",
  emerald:
    "bg-emerald-500/15 text-emerald-700 ring-emerald-500/40 dark:text-emerald-200",
  sky: "bg-sky-500/15 text-sky-700 ring-sky-500/40 dark:text-sky-200",
  slate: "bg-slate-500/15 text-slate-700 ring-slate-500/40 dark:text-slate-200",
}

export function ShopBrowser() {
  const categories = SHOP_CATEGORIES
  const items = SHOP_ITEMS
  const [activeId, setActiveId] = useState(categories[0]?.id)

  const grouped = useMemo(() => {
    const map = new Map<string, ShopItem[]>()
    for (const cat of categories) map.set(cat.id, [])
    for (const it of items) {
      const list = map.get(it.categoryId)
      if (list) list.push(it)
    }
    // Legendary first → the marquee items always anchor the start
    // of the shelf so the shop has a clear "wow" entry point.
    for (const list of map.values()) {
      list.sort(
        (a, b) => RARITY_META[b.rarity].weight - RARITY_META[a.rarity].weight,
      )
    }
    return map
  }, [categories, items])

  const activeCategory = categories.find((c) => c.id === activeId)
  const activeItems = activeId ? (grouped.get(activeId) ?? []) : []

  return (
    <section className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
      <CategoryRail
        categories={categories}
        grouped={grouped}
        activeId={activeId}
        onSelect={setActiveId}
      />

      <div className="flex min-w-0 flex-col gap-3">
        {/* The "Headwear · Hats, masks… · 10 items" row used to live
            here. Removed so the shelf reclaims the vertical space and
            the page no longer needs to scroll. The label moved to the
            active rail tile (see RailTile, two-line variant) and the
            item count is already shown there as a chip. */}
        {activeCategory && (
          <Shelf
            key={activeCategory.id}
            category={activeCategory}
            items={activeItems}
          />
        )}
      </div>
    </section>
  )
}

// ---------- left rail ----------

function CategoryRail({
  categories,
  grouped,
  activeId,
  onSelect,
}: {
  categories: readonly ShopCategory[]
  grouped: Map<string, ShopItem[]>
  activeId?: string
  onSelect: (id: ShopCategory["id"]) => void
}) {
  return (
    <aside
      className={cn(
        "rounded-2xl border bg-gradient-to-br from-card via-card to-muted/40 p-1.5 shadow-sm",
        // Mobile/narrow: become a horizontally scrolling strip above
        // the shelf. Desktop: a compact vertical rail — natural
        // height, no flex-stretching, so all 8 categories fit in
        // the viewport without scrolling.
        "overflow-x-auto lg:overflow-visible",
      )}
    >
      <ul
        className={cn(
          "flex gap-1.5",
          "lg:flex-col lg:gap-1",
          "w-max lg:w-auto",
        )}
      >
        {categories.map((cat) => {
          const count = grouped.get(cat.id)?.length ?? 0
          const active = cat.id === activeId
          return (
            <li key={cat.id}>
              <RailTile
                category={cat}
                count={count}
                active={active}
                onSelect={() => onSelect(cat.id)}
              />
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

function RailTile({
  category,
  count,
  active,
  onSelect,
}: {
  category: ShopCategory
  count: number
  active: boolean
  onSelect: () => void
}) {
  const tone = TONE_META[category.tone]
  const Icon = category.icon
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        // Compact game-tile look: small icon + label, sized so the
        // whole 8-category rail fits within ~480px of vertical space.
        "group/tile relative flex w-[78px] flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-all duration-150",
        "lg:w-full lg:flex-row lg:items-center lg:gap-2 lg:px-2 lg:py-1.5 lg:text-left",
        active
          ? cn("ring-2 ring-inset shadow-sm", TILE_ACTIVE[category.tone])
          : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          // Icon medallion — compact on desktop so the rail stays slim.
          "relative flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-transform lg:size-7",
          tone.iconWrap,
          active && "scale-105",
        )}
      >
        <Icon className="size-4 lg:size-3.5" strokeWidth={2.25} />
        {/* Mobile-only corner badge — on desktop the count moves to a
            right-edge chip (see below) which reads better in the
            horizontal layout. */}
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-bold leading-none text-background ring-2 ring-card tabular-nums lg:hidden">
            {count}
          </span>
        )}
      </span>
      <span className="min-w-0 lg:flex-1">
        <span
          className={cn(
            "block truncate text-[11px] font-semibold leading-tight lg:text-[13px]",
            active ? "text-current" : "text-foreground/80",
          )}
        >
          {category.label}
        </span>
      </span>
      {count > 0 && (
        <span
          className={cn(
            // Right-edge count chip. Hidden on the mobile (stacked)
            // tile to keep it visually quiet, shown inline on desktop.
            "hidden shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums lg:inline-flex",
            active
              ? "bg-background/40 text-current"
              : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ---------- shelf (horizontal scroller) ----------

function Shelf({
  category,
  items,
}: {
  category: ShopCategory
  items: ShopItem[]
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  // Step the scroll roughly one column-width at a time. Cards are
  // ~144-176px wide so each "step" reveals about one new column pair.
  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * (el.clientWidth * 0.7), behavior: "smooth" })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        No items in this category yet — check back soon.
      </div>
    )
  }

  const tone = TONE_META[category.tone]
  // 2-row layout. With ≤8 items everything fits in 2 rows on a wide
  // screen; >8 starts to overflow and the user scrolls horizontally
  // through the columns (chevrons + native swipe both work).
  const overflows = items.length > 8

  return (
    <div className="relative">
      {/* "Display case" treatment.
          Layered backdrop = tonal wash + center-top spotlight + subtle
          dot grid + inner ring. The shelf re-tints to match the active
          category, giving each tab its own mood without redrawing the
          layout. */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_1px_2px_0_rgba(0,0,0,0.04)] sm:p-2.5",
          tone.shelfBg,
          tone.shelfBorder,
        )}
      >
        {/* Soft top-down spotlight — anchors the eye on the first row
            and gives the shelf depth. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,255,255,0.08),transparent_70%)]"
        />
        {/* Dotted texture — washi-paper feel; very low opacity so it
            never competes with the cards. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px] text-foreground"
        />
        {/* Inner ring for tactile depth. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/5"
        />

        {/* Edge fades hint at horizontal overflow when items > 8. */}
        {overflows && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background/80 to-transparent sm:w-8"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background/80 to-transparent sm:w-8"
            />
          </>
        )}

        <div
          ref={scrollerRef}
          className={cn(
            "relative grid grid-flow-col gap-2.5 overflow-x-auto",
            "snap-x snap-mandatory",
            overflows && "pb-2.5",
            // Custom scrollbar — matches the dark/amber storefront
            // aesthetic. Track is invisible (lets the shelf gradient
            // show through), thumb is a slim translucent pill that
            // warms to amber on hover. Firefox honours `scrollbar-*`
            // via the inline style; WebKit/Blink reads the
            // pseudo-element rules.
            "[&::-webkit-scrollbar]:h-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-foreground/15",
            "[&::-webkit-scrollbar-thumb]:transition-colors",
            "[&::-webkit-scrollbar-thumb:hover]:bg-amber-500/60",
            "[&::-webkit-scrollbar-thumb:active]:bg-amber-500/80",
          )}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(245,158,11,0.35) transparent",
            gridTemplateRows: "auto auto",
          }}
        >
          {items.map((it) => (
            <ItemCard key={it.id} item={it} tone={category.tone} />
          ))}
        </div>
      </div>

      {/* Chevron controls only appear when scrolling actually buys you
          anything (>8 items). Below that threshold the row fits and
          the chevrons would be no-ops. */}
      {overflows && (
        <>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="absolute -left-3 top-1/2 z-20 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-md transition-transform hover:scale-105 sm:inline-flex"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="absolute -right-3 top-1/2 z-20 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-md transition-transform hover:scale-105 sm:inline-flex"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      )}
    </div>
  )
}

// ---------- ItemCard ----------

function ItemCard({
  item,
  tone,
}: {
  item: ShopItem
  tone: ShopCategory["tone"]
}) {
  const rarity = RARITY_META[item.rarity]
  const t = TONE_META[tone]
  const locked = item.status !== "live"

  return (
    <article
      className={cn(
        // Fixed card width so the shelf grid stays tidy. Wider cards
        // make the inter-card gap read as a hairline divider rather
        // than empty space — the eye sees a "wall of items" instead
        // of a sparse grid. Tuned so a typical 1280px+ desktop fits
        // ~5 cards per row across 2 rows = 10 visible at once.
        "group relative flex w-52 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 sm:w-60 xl:w-64",
        rarity.ring,
        "hover:-translate-y-0.5 hover:shadow-lg",
      )}
    >
      <span
        className={cn(
          "absolute right-2 top-2 z-10 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          rarity.chip,
        )}
      >
        {rarity.label}
      </span>

      <div
        className={cn(
          // Slightly landscape (5:4) — the artwork still feels square-ish
          // and hero-sized, but each card sheds ~50px of height vs. a
          // pure square so the 2-row shelf fits more comfortably in
          // a typical desktop viewport.
          "relative flex aspect-[5/4] items-center justify-center bg-gradient-to-br",
          t.cardGlow,
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,white,transparent_65%)] opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-30 dark:group-hover:opacity-10"
        />
        <span className="select-none text-5xl drop-shadow-sm sm:text-6xl">
          {item.glyph}
        </span>
        {locked && (
          <span
            className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur"
            title="Coming soon"
          >
            <Lock className="size-3" />
            Coming soon
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-tight tracking-tight">
            {item.name}
          </h3>
          {item.nameJp && (
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {item.nameJp}
            </p>
          )}
        </div>

        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {item.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-200">
            <Coins
              className="size-3 text-amber-600 dark:text-amber-300"
              strokeWidth={2.25}
            />
            {formatInt(item.price)}
          </span>
          <Button
            type="button"
            size="sm"
            variant={locked ? "outline" : "default"}
            disabled={locked}
            className="h-7 px-2.5 text-xs"
            aria-disabled={locked}
            title={locked ? "Coming soon" : "Buy"}
          >
            {locked ? (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3" />
                Soon
              </span>
            ) : (
              "Buy"
            )}
          </Button>
        </div>
      </div>
    </article>
  )
}
