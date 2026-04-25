import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  Layers,
  Package,
  Shirt,
  ShoppingBag,
  Sparkles,
} from "lucide-react"
import { auth } from "@clerk/nextjs/server"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  SHOP_CATEGORIES,
  SHOP_ITEMS,
  TONE_META,
  type ShopCategory,
} from "@/lib/shop"
import { InventoryBrowser } from "./inventory-browser"

// =====================================================================
// /inventory — Your closet
// ---------------------------------------------------------------------
// Phase 1: pure UI scaffold. There is no Prisma `UserInventory` table
// yet, so every equip slot is empty and the per-category browser shows
// an empty state pointing back to the Store.
//
// Layout (no-scroll target):
//   ┌─────────────────────────────────────────────────────┐
//   │ Compact header (1 row)                              │
//   ├──────────────┬───────────────────┬──────────────────┤
//   │ Slot  1 │  2 │                   │ Slot  7 │  8     │
//   │ Slot  3 │  4 │  Mascot preview   │ Slot  9 │ 10     │
//   │ Slot  5 │  6 │                   │ Slot 11 │ 12     │
//   ├──────────────┴───────────────────┴──────────────────┤
//   │ Owned by category (horizontal tabs)                 │
//   └─────────────────────────────────────────────────────┘
// Two 2×3 rails flank the mascot — same square tile shape as
// before, just one extra row each. The rail height now lines up
// with the preview square so the stage reads as balanced.
//
// Phase 2 (when buying ships): read `UserInventory` for owned items
// and `EquippedCosmetic` for the slot map; replace the placeholder
// slot tiles with real previews; show owned items grouped by
// category with "Equip / Unequip" toggles.
// =====================================================================

export const dynamic = "force-dynamic"

export default async function InventoryPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const totalSlots = SHOP_CATEGORIES.length
  const totalItems = SHOP_ITEMS.length
  const ownedCount = 0 // Hard-coded until Phase 2.

  return (
    <div className="space-y-3">
      <ClosetHeader
        ownedCount={ownedCount}
        totalSlots={totalSlots}
        totalItems={totalItems}
      />

      {/* Paper-doll equip stage — mascot anchored in the center,
          4 equip slots stacked on each side. Classic RPG character-
          sheet layout that makes it visually obvious which cosmetic
          maps to which body region. */}
      <EquipStage categories={SHOP_CATEGORIES} />

      {/* Owned-by-category browser — full width below so the tab strip
          uses the entire canvas and the placeholder grid breathes.
          Once owned items exist this is where the picker grid will
          live. InventoryBrowser pulls SHOP_CATEGORIES itself — the
          Lucide icon components on each category aren't serialisable
          across the server → client boundary. */}
      <InventoryBrowser />
    </div>
  )
}

// ---------- header ----------

function ClosetHeader({
  ownedCount,
  totalSlots,
  totalItems,
}: {
  ownedCount: number
  totalSlots: number
  totalItems: number
}) {
  // Phase 1 — nothing equipped, nothing owned. Wire these up to
  // real DB counts when `UserInventory` ships.
  const equippedCount = 0
  const collectionPct = Math.round((ownedCount / totalItems) * 100)
  const equippedPct = Math.round((equippedCount / totalSlots) * 100)
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-violet-500/20",
        // Slightly warmer & deeper gradient than before — more
        // "closet at golden hour" than "flat lavender wash". Adds a
        // bottom rose tint that ties to the mascot's blush palette.
        "bg-gradient-to-br from-violet-500/[0.20] via-sky-500/[0.08] to-rose-500/[0.06]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),inset_0_-1px_0_0_rgba(0,0,0,0.06),0_4px_16px_-8px_rgba(139,92,246,0.25)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-violet-400/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-sky-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-1/3 top-0 size-40 rounded-full bg-rose-400/15 blur-3xl"
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
              "bg-gradient-to-br from-violet-400 to-violet-600 text-white",
              "shadow-[0_6px_16px_-4px_rgba(139,92,246,0.55),inset_0_1px_0_0_rgba(255,255,255,0.35)]",
              "ring-1 ring-violet-300/50",
            )}
          >
            <Package className="size-5" strokeWidth={2.5} />
            {/* Tiny sparkle medallion — hints at "your stuff lives
                here" with a touch of the cosmetics theme. */}
            <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border-2 border-background bg-violet-200 text-violet-700 shadow-sm">
              <Sparkles className="size-2.5" strokeWidth={3} />
            </span>
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h1 className="text-base font-bold tracking-tight sm:text-lg">
                Inventory
              </h1>
              <span className="hidden text-[11px] font-medium uppercase tracking-wider text-violet-700 dark:text-violet-300/80 sm:inline">
                Closet · Equip your Dachi
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Mix and match cosmetics across {totalSlots} slots to dress up
              your mascot.
            </p>
          </div>
        </div>

        {/* ---- Twin progress meters (Equipped + Collection) ----
            Replaces the flat stat chip. Two parallel bars give the
            user a sense of both short-term goal (fill all 12 equip
            slots) and long-term goal (collect every cosmetic). */}
        <div className="flex shrink-0 flex-col gap-1.5">
          <ProgressMeter
            label="Equipped"
            current={equippedCount}
            total={totalSlots}
            pct={equippedPct}
            from="from-violet-500"
            to="to-sky-500"
            icon={
              <Shirt
                className="size-3 text-violet-600 dark:text-violet-300"
                strokeWidth={2.5}
              />
            }
          />
          <ProgressMeter
            label="Collection"
            current={ownedCount}
            total={totalItems}
            pct={collectionPct}
            from="from-amber-400"
            to="to-rose-500"
            icon={
              <Layers
                className="size-3 text-amber-600 dark:text-amber-300"
                strokeWidth={2.5}
              />
            }
          />
        </div>

        {/* ---- CTA ----
            Designed as a "warm doorway to the storefront": uses the
            same amber→rose gradient as the Shop header's brand mark
            so the action visually previews its destination. Depth
            comes from a layered ring + warm shadow halo, and a soft
            sheen sweeps across the surface on hover (700ms) to
            reward the user for noticing it. */}
        <Button
          asChild
          size="sm"
          className={cn(
            "group/cta relative h-auto overflow-hidden rounded-xl border-0 p-0",
            "bg-gradient-to-br from-amber-400 via-amber-500 to-rose-500",
            "text-white font-semibold",
            "ring-1 ring-amber-300/60",
            "shadow-[0_4px_14px_-2px_rgba(245,158,11,0.45),inset_0_1px_0_0_rgba(255,255,255,0.35),inset_0_-1px_0_0_rgba(0,0,0,0.08)]",
            "hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,0.55),inset_0_1px_0_0_rgba(255,255,255,0.4),inset_0_-1px_0_0_rgba(0,0,0,0.08)]",
            "hover:-translate-y-px transition-all duration-200",
            "focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <Link
            href="/shop"
            className="relative flex items-center gap-2 px-4 py-2"
          >
            {/* Sheen sweep — diagonal highlight slides L→R on hover.
                pointer-events-none + overflow-hidden on the parent
                keeps it confined to the pill. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-[300%]"
            />
            {/* Bag chip — sits on a darker inset so it reads as a
                physical icon plate, not a flat glyph. */}
            <span
              className={cn(
                "relative flex size-5 items-center justify-center rounded-md",
                "bg-white/20 ring-1 ring-inset ring-white/30",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]",
                "transition-transform group-hover/cta:scale-110",
              )}
            >
              <ShoppingBag className="size-3" strokeWidth={2.75} />
            </span>
            <span className="relative text-sm tracking-tight">
              Visit Store
            </span>
            <ArrowRight
              className="relative size-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5"
              strokeWidth={2.75}
            />
          </Link>
        </Button>
      </div>
    </section>
  )
}

// Mirror of the shop's ProgressMeter. Kept in sync so both
// surfaces render identical bars. Hoist into a shared component
// if a third surface ever needs it.
function ProgressMeter({
  label,
  current,
  total,
  pct,
  from,
  to,
  icon,
}: {
  label: string
  current: number
  total: number
  pct: number
  from: string
  to: string
  icon?: React.ReactNode
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
        <span className="font-semibold text-foreground">{current}</span>
        <span className="mx-0.5 text-muted-foreground/60">/</span>
        {total}
      </span>
    </div>
  )
}

// =====================================================================
// EquipStage
// ---------------------------------------------------------------------
// Paper-doll layout: mascot in the middle, 6 equip slots stacked
// on each side as a 2×3 grid. Reads like a classic RPG character
// sheet — the user's eye lands on the Dachi first, then naturally
// scans outward to "what can I put on it?".
//
// Slot ordering is intentional and mirrors the order in
// SHOP_CATEGORIES (top-down body, then held → world → scene):
//   Left rail  — the outfit (head → face → neck → top → bottom → feet)
//   Right rail — held + world (hand → back → pet → bg → house → accessory)
// The slice indices below MUST stay aligned with that source order.
// =====================================================================

function EquipStage({
  categories,
}: {
  categories: readonly ShopCategory[]
}) {
  const half = Math.ceil(categories.length / 2)
  const left = categories.slice(0, half)
  const right = categories.slice(half)
  const filled = 0 // Phase 1 — nothing equipped yet.
  const total = categories.length
  const pct = Math.round((filled / total) * 100)

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border px-3 py-3 sm:px-4 sm:py-4",
        // Same "display case" vocabulary as the shop shelf, tinted
        // with the inventory's violet/rose palette. Keeping the
        // wash subtle so the colourful slot tiles still pop.
        "bg-gradient-to-br from-violet-500/[0.06] via-background to-rose-500/[0.05]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_1px_2px_0_rgba(0,0,0,0.04)]",
      )}
    >
      {/* Top-down spotlight — borrowed from the shop shelf so both
          surfaces share the same lighting. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(255,255,255,0.07),transparent_70%)]"
      />
      {/* Washi-paper dotted texture — extremely low opacity so it
          adds tactility without competing with the slot tiles. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px] text-foreground"
      />
      {/* Inner ring for tactile depth (matches the shop). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/5"
      />

      {/* ---- Header (label + progress) ---- */}
      <header className="relative mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-0.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Equipped</h2>
          <span className="text-[11px] text-muted-foreground">
            Tap a slot to swap
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="relative h-1.5 w-28 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={filled}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label="Equipped slots"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{filled}</span>
            <span className="mx-0.5 text-muted-foreground/60">/</span>
            {total}
          </span>
        </div>
      </header>

      {/* ---- Paper-doll row ----
          On large screens: 3-column grid with 2×3 side rails
          (~300–340px wide) flanking a centered mascot column capped
          at ~460px. Three rows of square tiles per rail line up
          almost perfectly with the preview square so the stage
          reads as balanced rather than top-heavy.
          On mobile: single column — slots collapse to a 3-up
          horizontal grid (2 rows of 3) above and below the mascot.
          `relative` so the row stacks above the decorative
          spotlight / dotted-texture / inner-ring layers above. */}
      <div
        className={cn(
          "relative grid items-center justify-center gap-3 sm:gap-4",
          "grid-cols-1",
          "lg:grid-cols-[300px_minmax(0,420px)_300px]",
          "xl:grid-cols-[340px_minmax(0,460px)_340px]",
        )}
      >
        <SlotRail slots={left} side="left" />
        <MascotPreview />
        <SlotRail slots={right} side="right" />
      </div>
    </section>
  )
}

function SlotRail({
  slots,
  side,
}: {
  slots: readonly ShopCategory[]
  side: "left" | "right"
}) {
  return (
    <div
      className={cn(
        // Mobile: 3-up horizontal grid so 6 tiles wrap as 2 rows of
        // 3 — keeps each tile readable on phones.
        // Desktop: 2×3 grid — two columns of three square tiles —
        // so the rail's overall height tracks the mascot square
        // (≈3 tiles tall ≈ preview square) instead of leaving an
        // awkward gap.
        "grid grid-cols-3 gap-2 lg:grid-cols-2 lg:gap-2.5",
      )}
      aria-label={`${side === "left" ? "Outfit" : "World"} slots`}
    >
      {slots.map((cat) => (
        <SlotTile key={cat.id} category={cat} side={side} />
      ))}
    </div>
  )
}

// =====================================================================
// MascotPreview
// ---------------------------------------------------------------------
// Visual anchor for the equip stage. Phase 2: this becomes
// <MascotCanvas equipped={…} /> that layers equipped sprites over
// the base Dachi.
// =====================================================================

function MascotPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-2xl border",
          // Display-case treatment matching the shop shelf so both
          // pages share a visual language.
          "bg-gradient-to-br from-violet-500/15 via-background to-rose-500/10",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_16px_-8px_rgba(0,0,0,0.2)]",
          "ring-1 ring-inset ring-foreground/5",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(255,255,255,0.1),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-4 left-1/2 h-4 w-3/5 -translate-x-1/2 rounded-full bg-foreground/15 blur-md"
        />
        <Image
          src="/Dachi-boy.png"
          alt="Your Dachi mascot — base appearance"
          fill
          sizes="(min-width: 1280px) 400px, (min-width: 1024px) 360px, 80vw"
          priority
          className="select-none object-contain p-4 drop-shadow-md"
          draggable={false}
        />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
          <Sparkles className="size-3 text-violet-500" />
          Preview
        </span>
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
          Base look
        </span>
      </div>
    </div>
  )
}

// =====================================================================
// SlotTile
// ---------------------------------------------------------------------
// Single equip slot. Adapts its internal layout to the rail it lives
// in:
//   - Mobile (4-up horizontal grid): square tile with stacked
//     icon + label so it reads like an inventory cell.
//   - Desktop (vertical rail): same square shape, but the label sits
//     under the icon medallion which is centered for symmetry with
//     the matching tile on the opposite rail.
// =====================================================================

function SlotTile({
  category,
  side,
}: {
  category: ShopCategory
  side: "left" | "right"
}) {
  const tone = TONE_META[category.tone]
  const Icon = category.icon
  return (
    <button
      type="button"
      className={cn(
        "group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed bg-card/40 p-2 transition-all duration-150",
        "hover:-translate-y-px hover:border-foreground/25 hover:bg-card hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
      )}
      aria-label={`Equip ${category.label}`}
    >
      {/* Stage — tonal wash that fills the tile. The icon medallion
          floats on top, framed by the wash. Once owned items exist,
          this becomes the item's preview image. */}
      <div
        className={cn(
          "absolute inset-1.5 rounded-lg bg-gradient-to-br ring-1 ring-inset ring-foreground/5",
          tone.cardGlow,
        )}
        aria-hidden
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-1.5 top-1.5 h-1/2 rounded-t-lg bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(255,255,255,0.08),transparent_70%)]"
      />

      {/* Centered medallion — icon over a tonal pill. */}
      <span
        className={cn(
          "relative flex size-12 items-center justify-center rounded-xl ring-1 ring-inset transition-transform group-hover:scale-110",
          tone.iconWrap,
        )}
      >
        <Icon className="size-5" strokeWidth={2.25} />
      </span>

      {/* Label — slot type sits below the medallion, fades on hover
          to let the (future) equipped item shine through. */}
      <span className="relative mt-1.5 truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {category.slot}
      </span>

      {/* Empty pill — anchored to the side of the tile that faces
          the mascot, so the visual flow is "slot → label → mascot". */}
      <span
        className={cn(
          "absolute bottom-1 rounded-full border bg-background/70 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur",
          side === "left" ? "right-1" : "left-1",
        )}
      >
        Empty
      </span>
    </button>
  )
}
