"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Lock, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SHOP_CATEGORIES,
  TONE_META,
  type ShopCategory,
  type ShopTone,
} from "@/lib/shop"

// =====================================================================
// InventoryBrowser
// ---------------------------------------------------------------------
// Compact horizontal-tab layout. The original vertical rail consumed
// too much height and pushed the page below the fold; pill tabs
// across the top let us show the same 8 categories in ~36px of
// vertical space, with the active category's owned items below.
//
// Until inventory rows exist, every tab shows a single-row empty
// state pointing back to the Store.
// =====================================================================

const TAB_ACTIVE: Record<ShopTone, string> = {
  violet:
    "bg-violet-500/15 text-violet-700 ring-violet-500/40 dark:text-violet-200",
  amber: "bg-amber-500/15 text-amber-700 ring-amber-500/40 dark:text-amber-200",
  rose: "bg-rose-500/15 text-rose-700 ring-rose-500/40 dark:text-rose-200",
  emerald:
    "bg-emerald-500/15 text-emerald-700 ring-emerald-500/40 dark:text-emerald-200",
  sky: "bg-sky-500/15 text-sky-700 ring-sky-500/40 dark:text-sky-200",
  slate: "bg-slate-500/15 text-slate-700 ring-slate-500/40 dark:text-slate-200",
}

export function InventoryBrowser() {
  const categories = SHOP_CATEGORIES
  const [activeId, setActiveId] = useState(categories[0]?.id)
  const activeCategory = categories.find((c) => c.id === activeId)

  return (
    <section className="space-y-2">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Owned by category
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Items you collect appear here
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {activeCategory?.label} · 0 items
        </span>
      </header>

      {/* Horizontal pill tabs — overflow-x-auto so all 8 reach on
          narrow viewports without wrapping into a 2nd row. The
          custom thin scrollbar only shows when overflow occurs. */}
      <div
        className={cn(
          "-mx-1 overflow-x-auto px-1",
          "[&::-webkit-scrollbar]:h-1",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full",
          "[&::-webkit-scrollbar-thumb]:bg-foreground/15",
        )}
      >
        <ul
          className="flex w-max gap-1.5"
          role="tablist"
          aria-label="Inventory categories"
        >
          {categories.map((cat) => (
            <li key={cat.id}>
              <TabPill
                category={cat}
                active={cat.id === activeId}
                onSelect={() => setActiveId(cat.id)}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="min-w-0">
        {activeCategory && <EmptyCategory category={activeCategory} />}
      </div>
    </section>
  )
}

function TabPill({
  category,
  active,
  onSelect,
}: {
  category: ShopCategory
  active: boolean
  onSelect: () => void
}) {
  const tone = TONE_META[category.tone]
  const Icon = category.icon
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "group/tab inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
        active
          ? cn("shadow-sm ring-1 ring-inset", TAB_ACTIVE[category.tone])
          : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition-transform",
          tone.iconWrap,
          active && "scale-105",
        )}
      >
        <Icon className="size-3" strokeWidth={2.5} />
      </span>
      <span className="truncate">{category.label}</span>
    </button>
  )
}

// Number of placeholder slots to render in the empty owned grid.
// 16 = 2 rows of 8 on desktop / 2 rows of 6 on md / 2 rows of 4 on
// mobile. Two rows always visible so the section reads as a
// collection grid in waiting, never a lonely single row.
const PLACEHOLDER_COUNT = 16

function EmptyCategory({ category }: { category: ShopCategory }) {
  const tone = TONE_META[category.tone]
  const Icon = category.icon
  return (
    <div
      className={cn(
        // Neutral surface — keeps the focus on the placeholder grid
        // and the (eventual) owned items. Same display-case
        // vocabulary as the shop shelf (spotlight + dot texture +
        // inner ring) but without the tonal wash so the section
        // stays calm.
        "relative overflow-hidden rounded-xl border border-dashed bg-muted/30 p-3 dark:bg-muted/20",
      )}
    >
      {/* Top-down spotlight — shared with the shop shelf and the
          equip stage so all three surfaces feel lit by the same
          source. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(255,255,255,0.05),transparent_70%)]"
      />
      {/* Washi-paper dotted texture — borrowed from the shop shelf
          for a consistent tactile feel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px] text-foreground"
      />
      {/* Inner ring for tactile depth (matches shop + equip stage). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-foreground/5"
      />

      {/* Header row — concise call-out + CTA. Lives above the grid
          so the placeholder slots can be the visual focal point. */}
      <div className="relative mb-2.5 flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            tone.iconWrap,
          )}
        >
          <Icon className="size-3.5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold tracking-tight">
            No {category.label.toLowerCase()} yet
          </h3>
          <p className="truncate text-[11px] text-muted-foreground">
            {category.description}
          </p>
        </div>
        <Link
          href="/shop"
          className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-[11px] font-medium transition-all",
            "hover:-translate-y-px hover:bg-accent hover:shadow-sm",
          )}
        >
          <ShoppingBag className="size-3" />
          Store
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Placeholder grid — 2 rows of slots that telegraph where
          future owned items will land. Heights scale with viewport
          (see PlaceholderSlot) so the grid takes up meaningful
          vertical real estate on desktop while still keeping the
          page scroll-free. Always 8 columns on desktop so 16 slots
          form 2 clean rows; gaps tighten to gap-2 for desktop
          breathing room. */}
      <div className="relative grid grid-cols-4 gap-1.5 sm:grid-cols-6 sm:gap-2 md:grid-cols-8">
        {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
          <PlaceholderSlot key={i} index={i} />
        ))}
      </div>
    </div>
  )
}

function PlaceholderSlot({ index }: { index: number }) {
  return (
    <div
      className={cn(
        // Height scales with viewport so the grid feels substantial
        // on desktop without overflowing on smaller screens.
        // h-16 (mobile) → h-20 (sm) → h-24 (lg) → h-28 (xl)
        // ≈ 64–112px tall — enough vertical mass to read as a real
        // collection grid, still leaves the page scroll-free.
        "group/slot relative flex h-16 items-center justify-center overflow-hidden rounded-lg border border-dashed border-foreground/10 bg-background/30 sm:h-20 lg:h-20 xl:h-23",
        // Subtle stagger — even cells get a touch more glow so the
        // grid reads as a textured surface rather than a flat array
        // of identical boxes.
        index % 2 === 0 ? "bg-foreground/[0.02]" : "bg-foreground/[0.015]",
      )}
      aria-hidden
    >
      <Lock
        className="size-4 text-foreground/15 transition-transform group-hover/slot:scale-110 lg:size-5"
        strokeWidth={1.75}
      />
    </div>
  )
}
