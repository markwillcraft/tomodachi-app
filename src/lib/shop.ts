import {
  Cat,
  Crown,
  Footprints,
  Gem,
  Home,
  Mountain,
  Shirt,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// =====================================================================
// Shop catalog
// ---------------------------------------------------------------------
// Static, single-source-of-truth catalog of every cosmetic the user
// can eventually spend coins on. Modeled after `categories.ts` and
// `kanji.ts` — typed `const` arrays, no DB dependency.
//
// PHASE 1 (this file's current state): every item ships as
// `status: "coming-soon"`. The Store renders them as locked previews
// so the user can see the road map and we can validate the layout
// before any art lands. No purchases are persisted, no Prisma rows are
// written.
//
// PHASE 2 (later): art arrives → flip items to `status: "live"`,
// add `previewImage`, and wire up the buy/equip APIs. The catalog
// shape is forward-compatible with that swap.
// =====================================================================

export type ShopCategoryId =
  | "headwear"
  | "tops"
  | "bottoms"
  | "shoes"
  | "pets"
  | "backgrounds"
  | "house"
  | "accessories";

export type ShopRarity = "common" | "rare" | "epic" | "legendary";

export type ShopStatus = "live" | "coming-soon";

// Equippable slot the item occupies on the dashboard mascot canvas.
// One slot per item; `pets`, `backgrounds`, and `house` decorate the
// scene rather than the mascot itself but still occupy a single slot.
export type ShopSlot =
  | "head"
  | "top"
  | "bottom"
  | "feet"
  | "pet"
  | "background"
  | "house"
  | "accessory";

// Color tone — reused across the Store + Inventory pages so a
// category's accent chip, item-card glow, and slot tile all match.
// Mirrors the tones used in the N5 mastery modal so the design
// language stays coherent across the app.
export type ShopTone = "violet" | "amber" | "rose" | "emerald" | "sky" | "slate";

export type ShopCategory = {
  id: ShopCategoryId;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: ShopTone;
  slot: ShopSlot;
};

export type ShopItem = {
  // Stable slug — never rename (would break inventory rows once Phase 2
  // ships). Lowercase kebab-case.
  id: string;
  categoryId: ShopCategoryId;
  name: string;
  // Optional Japanese name shown as a small subtitle. Adds personality
  // and reinforces the language theme.
  nameJp?: string;
  description: string;
  // Coin cost. Tuned by rarity: common ~50, rare ~250, epic ~1000,
  // legendary ~3000. Adjust per-item if it should feel premium.
  price: number;
  rarity: ShopRarity;
  status: ShopStatus;
  // Placeholder glyph (emoji or kanji) shown in the item card while
  // we have no art. Becomes a `previewImage` path in Phase 2.
  glyph: string;
};

// ---------- categories ----------

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  {
    id: "headwear",
    label: "Headwear",
    description: "Hats, masks, and crowns to top off your Dachi.",
    icon: Crown,
    tone: "amber",
    slot: "head",
  },
  {
    id: "tops",
    label: "Tops",
    description: "Yukata, hoodies, school uniforms — the upper layer.",
    icon: Shirt,
    tone: "rose",
    slot: "top",
  },
  {
    id: "bottoms",
    label: "Bottoms",
    description: "Hakama, jeans, skirts — pair them with a top.",
    icon: Shirt,
    tone: "violet",
    slot: "bottom",
  },
  {
    id: "shoes",
    label: "Shoes",
    description: "Geta, sneakers, and tabi to round out the outfit.",
    icon: Footprints,
    tone: "sky",
    slot: "feet",
  },
  {
    id: "pets",
    label: "Pets",
    description: "Tiny companions that follow your Dachi around.",
    icon: Cat,
    tone: "emerald",
    slot: "pet",
  },
  {
    id: "backgrounds",
    label: "Backgrounds",
    description: "Scenes that frame your dashboard hero card.",
    icon: Mountain,
    tone: "violet",
    slot: "background",
  },
  {
    id: "house",
    label: "House",
    description: "Decorate your mascot's home and show it off.",
    icon: Home,
    tone: "amber",
    slot: "house",
  },
  {
    id: "accessories",
    label: "Accessories",
    description: "Glasses, scarves, badges — finishing touches.",
    icon: Gem,
    tone: "slate",
    slot: "accessory",
  },
];

// ---------- items ----------
//
// Pricing follows the rarity ladder. Tweak per item if a design feels
// special enough to break the curve.
const PRICE: Record<ShopRarity, number> = {
  common: 50,
  rare: 250,
  epic: 1000,
  legendary: 3000,
};

// Convenience builder — keeps the catalog terse and prevents typos.
function item(
  id: string,
  categoryId: ShopCategoryId,
  name: string,
  rarity: ShopRarity,
  glyph: string,
  description: string,
  nameJp?: string,
): ShopItem {
  return {
    id,
    categoryId,
    name,
    nameJp,
    description,
    price: PRICE[rarity],
    rarity,
    status: "coming-soon",
    glyph,
  };
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  // ---------- headwear (10) ----------
  item("oni-mask", "headwear", "Oni mask", "legendary", "👹", "Demon-king mask. Loud and proud.", "鬼面"),
  item("samurai-kabuto", "headwear", "Samurai kabuto", "epic", "⛩️", "Lacquered helmet of an old clan.", "兜"),
  item("tengu-mask", "headwear", "Tengu mask", "epic", "👺", "Long-nosed mountain spirit mask.", "天狗面"),
  item("kitsune-mask", "headwear", "Fox mask", "rare", "🦊", "Classic festival kitsune mask.", "狐面"),
  item("sakura-crown", "headwear", "Sakura crown", "rare", "🌸", "A wreath of cherry blossoms.", "桜冠"),
  item("hachimaki", "headwear", "Hachimaki", "rare", "🎌", "Study-mode headband. Ganbare!", "鉢巻"),
  item("cat-ears", "headwear", "Cat ears", "common", "🐱", "Soft fluffy ears in matching tones.", "ねこみみ"),
  item("straw-hat", "headwear", "Straw hat", "common", "👒", "Wide-brim hat for sunny strolls.", "麦わら帽子"),
  item("beanie", "headwear", "Knit beanie", "common", "🧢", "Warm slouchy beanie for cold studies.", "ニット帽"),
  item("flower-pin", "headwear", "Flower pin", "common", "🌼", "A simple bloom tucked behind the ear.", "花飾り"),

  // ---------- tops (10) ----------
  item("ninja-gi", "tops", "Ninja gi", "legendary", "🥷", "Stealth-black uppers. Move silently.", "忍び装束"),
  item("kimono-jacket", "tops", "Kimono jacket", "epic", "🥻", "Hand-dyed silk haori.", "羽織"),
  item("dragon-robe", "tops", "Dragon robe", "epic", "🐉", "Embroidered with rolling clouds and scales.", "龍袍"),
  item("yukata-top", "tops", "Yukata top", "rare", "👘", "Light cotton summer-festival yukata.", "浴衣"),
  item("happi-coat", "tops", "Happi coat", "rare", "🎏", "Festival coat with a bold crest.", "法被"),
  item("varsity-jacket", "tops", "Varsity jacket", "rare", "🏫", "Letterman jacket, study-club edition.", "スタジャン"),
  item("school-blazer", "tops", "School blazer", "common", "🎒", "Crisp navy uniform jacket.", "制服"),
  item("hoodie", "tops", "Tokyo hoodie", "common", "🧥", "Streetwear hoodie with a kanji print.", "パーカー"),
  item("graphic-tee", "tops", "Graphic tee", "common", "👕", "Soft cotton tee with a Tokyo skyline.", "Tシャツ"),
  item("cardigan", "tops", "Cozy cardigan", "common", "🧶", "Knit cardigan for late-night study sessions.", "カーディガン"),

  // ---------- bottoms (8) ----------
  item("dragon-hakama", "bottoms", "Dragon hakama", "legendary", "🐲", "Inked with twin dragons chasing pearls.", "龍袴"),
  item("samurai-greaves", "bottoms", "Samurai greaves", "epic", "🛡️", "Armored leg plates of a warrior.", "脛当"),
  item("hakama", "bottoms", "Hakama", "rare", "👖", "Pleated traditional bottoms.", "袴"),
  item("cargo-pants", "bottoms", "Cargo pants", "rare", "🪖", "Utility pants with a thousand pockets.", "カーゴパンツ"),
  item("school-skirt", "bottoms", "School skirt", "common", "🧷", "Pleated navy uniform skirt.", "制服"),
  item("denim-jeans", "bottoms", "Denim jeans", "common", "👖", "Indigo selvedge jeans.", "ジーンズ"),
  item("track-pants", "bottoms", "Track pants", "common", "🏃", "Striped sporty pants for weekend grinds.", "ジャージ"),
  item("shorts", "bottoms", "Linen shorts", "common", "🩳", "Breezy linen shorts for summer drills.", "ハーフパンツ"),

  // ---------- shoes (8) ----------
  item("ryu-boots", "shoes", "Dragon boots", "legendary", "🐉", "Boots wreathed in dragon scales.", "龍の靴"),
  item("kabuki-clogs", "shoes", "Kabuki clogs", "epic", "🎭", "Tall lacquered geta of a stage star.", "舞台下駄"),
  item("tabi-boots", "shoes", "Tabi boots", "rare", "🥾", "Split-toe boots, ninja-approved.", "足袋"),
  item("hiking-boots", "shoes", "Hiking boots", "rare", "🥾", "Rugged boots for mountain pilgrimages.", "登山靴"),
  item("geta", "shoes", "Geta sandals", "common", "👡", "Wooden geta with cloth thongs.", "下駄"),
  item("sneakers", "shoes", "Harajuku sneakers", "common", "👟", "Bright street-style kicks.", "スニーカー"),
  item("loafers", "shoes", "Leather loafers", "common", "👞", "Polished loafers for school assemblies.", "ローファー"),
  item("sandals", "shoes", "Beach sandals", "common", "🩴", "Easy summer slides for the beach.", "ビーサン"),

  // ---------- pets (10) ----------
  item("baby-dragon", "pets", "Baby dragon", "legendary", "🐲", "Hatchling that breathes tiny sparks.", "竜の子"),
  item("kitsune-pup", "pets", "Kitsune pup", "epic", "🦊", "Nine-tailed pup, three tails so far.", "子狐"),
  item("tanuki", "pets", "Tanuki", "epic", "🦝", "A mischievous shape-shifting raccoon dog.", "狸"),
  item("maneki-neko", "pets", "Maneki-neko", "rare", "🐈", "Lucky cat that waves at passersby.", "招き猫"),
  item("shiba-pup", "pets", "Shiba pup", "rare", "🐕", "Loyal little Shiba — judges your accuracy.", "柴犬"),
  item("crane", "pets", "Paper crane", "rare", "🕊️", "An origami crane that flutters along.", "折り鶴"),
  item("koi", "pets", "Koi", "common", "🐟", "Bright koi that drifts beside you.", "鯉"),
  item("hedgehog", "pets", "Hedgehog", "common", "🦔", "Tiny hedgehog. Surprisingly opinionated.", "ハリネズミ"),
  item("tadpole", "pets", "Tadpole", "common", "🐸", "Will be a frog one day. For now: vibes.", "オタマジャクシ"),
  item("rice-ball", "pets", "Onigiri buddy", "common", "🍙", "A sentient rice ball. Don't ask.", "おにぎり"),

  // ---------- backgrounds (8) ----------
  item("mt-fuji", "backgrounds", "Mt. Fuji dawn", "legendary", "🗻", "Sunrise over snow-capped Fuji.", "富士山"),
  item("torii-gate", "backgrounds", "Torii gate", "epic", "⛩️", "A vermilion torii at golden hour.", "鳥居"),
  item("bamboo-grove", "backgrounds", "Bamboo grove", "epic", "🎋", "Tall bamboo, dappled sun, soft hush.", "竹林"),
  item("sakura-grove", "backgrounds", "Sakura grove", "rare", "🌸", "A drift of cherry blossoms in spring.", "桜の森"),
  item("shinjuku-night", "backgrounds", "Shinjuku night", "rare", "🌃", "Neon glow over a rainy crossing.", "新宿の夜"),
  item("autumn-temple", "backgrounds", "Autumn temple", "rare", "🍁", "Maple leaves around a quiet temple.", "紅葉の寺"),
  item("ramen-shop", "backgrounds", "Ramen shop", "common", "🍜", "A warm corner ramen-ya at midnight.", "ラーメン屋"),
  item("seaside", "backgrounds", "Seaside dawn", "common", "🌊", "Pale sunrise over the Pacific.", "海辺"),

  // ---------- house (8) ----------
  item("shrine-altar", "house", "Shrine altar", "legendary", "🏯", "A small home shrine for daily wins.", "神棚"),
  item("zen-garden", "house", "Zen garden", "epic", "🪨", "Raked stone garden for quiet study.", "枯山水"),
  item("library-corner", "house", "Library corner", "epic", "📚", "Tall shelves crammed with study notes.", "書斎"),
  item("tatami-room", "house", "Tatami room", "rare", "🟫", "Reed-mat floor with a low chabudai.", "和室"),
  item("tea-room", "house", "Tea room", "rare", "🍵", "Quiet tea room for slow afternoons.", "茶室"),
  item("kotatsu", "house", "Kotatsu", "common", "🛋️", "Heated table with a cozy quilt.", "炬燵"),
  item("paper-lantern", "house", "Paper lantern", "common", "🏮", "Warm chōchin glow by the doorway.", "提灯"),
  item("plant-shelf", "house", "Plant shelf", "common", "🪴", "Small bonsai and succulents in a row.", "植木棚"),

  // ---------- accessories (8) ----------
  item("sensei-pipe", "accessories", "Sensei pipe", "epic", "🪈", "Old-master kiseru — purely decorative.", "煙管"),
  item("ornate-fan", "accessories", "Ornate fan", "epic", "🪭", "Folding sensu inked with kanji.", "扇子"),
  item("study-badge", "accessories", "Scholar badge", "rare", "🎖️", "Earned-not-bought vibes (eventually).", "学者の徽章"),
  item("amulet", "accessories", "Omamori charm", "rare", "🧿", "Shrine charm tied to your wrist.", "お守り"),
  item("round-glasses", "accessories", "Round glasses", "common", "👓", "Wire-rim study specs.", "眼鏡"),
  item("scarf", "accessories", "Wool scarf", "common", "🧣", "Snug knit scarf for autumn quizzes.", "マフラー"),
  item("backpack", "accessories", "Studio backpack", "common", "🎒", "Sturdy daypack for the daily commute.", "リュック"),
  item("watch", "accessories", "Pocket watch", "common", "⌚", "A trusty timer for your timed quizzes.", "懐中時計"),
];

// ---------- helpers ----------

export function getShopCategory(id: ShopCategoryId): ShopCategory | undefined {
  return SHOP_CATEGORIES.find((c) => c.id === id);
}

export function getItemsByCategory(id: ShopCategoryId): readonly ShopItem[] {
  return SHOP_ITEMS.filter((it) => it.categoryId === id);
}

// Per-rarity display tokens. Kept here (next to the catalog) so any
// surface that renders an item — store card, inventory tile, future
// equip dialog — agrees on the visual language.
export const RARITY_META: Record<
  ShopRarity,
  {
    label: string;
    // Tailwind class fragment for the small ribbon/chip.
    chip: string;
    // Subtle ring + glow for the card border on hover.
    ring: string;
    // Order rank for sorting (legendary first).
    weight: number;
  }
> = {
  legendary: {
    label: "Legendary",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
    ring: "group-hover:border-amber-400/60 group-hover:shadow-amber-500/15",
    weight: 4,
  },
  epic: {
    label: "Epic",
    chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40",
    ring: "group-hover:border-violet-400/60 group-hover:shadow-violet-500/15",
    weight: 3,
  },
  rare: {
    label: "Rare",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40",
    ring: "group-hover:border-sky-400/60 group-hover:shadow-sky-500/10",
    weight: 2,
  },
  common: {
    label: "Common",
    chip: "bg-muted text-muted-foreground border-border",
    ring: "group-hover:border-foreground/30",
    weight: 1,
  },
};

// Per-tone Tailwind fragments. Same shape as TONE_BG in the N5 mastery
// modal so the two surfaces feel like cousins.
export const TONE_META: Record<
  ShopTone,
  {
    iconWrap: string;
    // Subtle wash used inside an item card's image area.
    cardGlow: string;
    // Stronger, richer wash for the shelf backdrop (display-case feel).
    // Goes top-left → bottom-right, then stacks with the spotlight +
    // dotted texture overlays defined in `Shelf`.
    shelfBg: string;
    // Hex(ish) color used for the shelf's outer halo glow. Keeps
    // each category visually distinct without changing the layout.
    shelfBorder: string;
  }
> = {
  violet: {
    iconWrap:
      "bg-violet-500/15 text-violet-600 ring-violet-500/30 dark:text-violet-300",
    cardGlow: "from-violet-500/20 via-violet-500/5 to-transparent",
    shelfBg:
      "from-violet-500/15 via-background to-violet-950/30 dark:from-violet-500/10 dark:via-background dark:to-violet-950/40",
    shelfBorder: "border-violet-500/25",
  },
  amber: {
    iconWrap:
      "bg-amber-500/15 text-amber-600 ring-amber-500/30 dark:text-amber-300",
    cardGlow: "from-amber-500/20 via-amber-500/5 to-transparent",
    shelfBg:
      "from-amber-500/15 via-background to-amber-950/30 dark:from-amber-500/10 dark:via-background dark:to-amber-950/40",
    shelfBorder: "border-amber-500/25",
  },
  rose: {
    iconWrap:
      "bg-rose-500/15 text-rose-600 ring-rose-500/30 dark:text-rose-300",
    cardGlow: "from-rose-500/20 via-rose-500/5 to-transparent",
    shelfBg:
      "from-rose-500/15 via-background to-rose-950/30 dark:from-rose-500/10 dark:via-background dark:to-rose-950/40",
    shelfBorder: "border-rose-500/25",
  },
  emerald: {
    iconWrap:
      "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30 dark:text-emerald-300",
    cardGlow: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    shelfBg:
      "from-emerald-500/15 via-background to-emerald-950/30 dark:from-emerald-500/10 dark:via-background dark:to-emerald-950/40",
    shelfBorder: "border-emerald-500/25",
  },
  sky: {
    iconWrap:
      "bg-sky-500/15 text-sky-600 ring-sky-500/30 dark:text-sky-300",
    cardGlow: "from-sky-500/20 via-sky-500/5 to-transparent",
    shelfBg:
      "from-sky-500/15 via-background to-sky-950/30 dark:from-sky-500/10 dark:via-background dark:to-sky-950/40",
    shelfBorder: "border-sky-500/25",
  },
  slate: {
    iconWrap:
      "bg-slate-500/15 text-slate-600 ring-slate-500/30 dark:text-slate-300",
    cardGlow: "from-slate-500/20 via-slate-500/5 to-transparent",
    shelfBg:
      "from-slate-500/15 via-background to-slate-950/40 dark:from-slate-500/10 dark:via-background dark:to-slate-950/50",
    shelfBorder: "border-slate-500/25",
  },
};
