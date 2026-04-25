import {
  Backpack,
  Cat,
  Crown,
  Footprints,
  Gem,
  Hand,
  Home,
  Mountain,
  Shirt,
  Smile,
  Sparkles,
  Tag,
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
  | "face"
  | "neck"
  | "tops"
  | "bottoms"
  | "shoes"
  | "hand"
  | "back"
  | "pets"
  | "backgrounds"
  | "house"
  | "accessories";

export type ShopRarity = "common" | "rare" | "epic" | "legendary";

export type ShopStatus = "live" | "coming-soon";

// Equippable slot the item occupies on the dashboard mascot canvas.
// One slot per item; `pet`, `background`, and `house` decorate the
// scene rather than the mascot itself but still occupy a single slot.
//
// Slot z-order on the mascot, back→front:
//   back-accessory → body → bottom → top → neck → face → headwear →
//   hand → front-accessory
// (defined alongside the eventual MascotCanvas; this enum is just the
// taxonomy.)
export type ShopSlot =
  | "head"
  | "face"
  | "neck"
  | "top"
  | "bottom"
  | "feet"
  | "hand"
  | "back"
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

// Ordered top-down body, then held → world → scene. The Inventory
// EquipStage slices the first half into the left rail and the second
// half into the right rail, so this order *is* the rail order.
//
// Rail layout (each rail spans all 6 tones — no adjacent duplicates):
//   Left  (outfit, head→feet):   amber, emerald, slate, rose, violet, sky
//   Right (held, world, scene):  rose,  sky,    emerald, violet, amber, slate
export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  {
    id: "headwear",
    label: "Headwear",
    description: "Hats, helmets, and crowns to top off your Dachi.",
    icon: Crown,
    tone: "amber",
    slot: "head",
  },
  {
    id: "face",
    label: "Face",
    description: "Glasses, masks, and face paint — change the vibe.",
    icon: Smile,
    tone: "emerald",
    slot: "face",
  },
  {
    id: "neck",
    label: "Neck",
    description: "Scarves, ties, omamori — what hangs at the collar.",
    icon: Tag,
    tone: "slate",
    slot: "neck",
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
    id: "hand",
    label: "Hand",
    description: "Books, fans, weapons — what your Dachi holds.",
    icon: Hand,
    tone: "rose",
    slot: "hand",
  },
  {
    id: "back",
    label: "Back",
    description: "Backpacks, capes, wings — what's worn behind.",
    icon: Backpack,
    tone: "sky",
    slot: "back",
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
    description: "Pins, ribbons, charms — finishing touches.",
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

  // ---------- face (8) ----------
  // round-glasses moved here from accessories — they belong on the face.
  item("oni-paint", "face", "Oni face paint", "legendary", "👹", "Crimson demon paint that pulses on perfect quizzes.", "鬼隈"),
  item("kabuki-paint", "face", "Kabuki paint", "epic", "🎭", "Bold kumadori stripes from the Edo stage.", "隈取"),
  item("ninja-mask", "face", "Ninja mask", "epic", "🥷", "Cloth wrap that hides everything but the eyes.", "覆面"),
  item("eye-patch", "face", "Eye patch", "rare", "🩹", "Black silk patch — instantly mysterious.", "眼帯"),
  item("monocle", "face", "Monocle", "rare", "🧐", "Single brass lens on a thin gold chain.", "片眼鏡"),
  item("round-glasses", "face", "Round glasses", "common", "👓", "Wire-rim study specs.", "眼鏡"),
  item("sunglasses", "face", "Sunglasses", "common", "🕶️", "Tortoiseshell shades for off-day swagger.", "サングラス"),
  item("surgical-mask", "face", "Surgical mask", "common", "😷", "Pastel everyday mask. Catches no germs, lots of vibes.", "マスク"),

  // ---------- neck (8) ----------
  // scarf + amulet moved here from accessories — both wrap the neck.
  item("dragon-pendant", "neck", "Dragon pendant", "epic", "🐉", "Carved jade dragon on a silk cord.", "龍の首飾り"),
  item("obi-collar", "neck", "Obi collar", "rare", "🎀", "Brocade obi tied tight at the neck.", "帯襟"),
  item("amulet", "neck", "Omamori charm", "rare", "🧿", "Shrine charm tied to a thin neck cord.", "お守り"),
  item("headphones", "neck", "Studio headphones", "rare", "🎧", "Big cans, currently around the neck.", "ヘッドホン"),
  item("scarf", "neck", "Wool scarf", "common", "🧣", "Snug knit scarf for autumn quizzes.", "マフラー"),
  item("school-tie", "neck", "School tie", "common", "👔", "Navy school-uniform tie, slightly loosened.", "ネクタイ"),
  item("bell-collar", "neck", "Bell collar", "common", "🔔", "Tiny brass bell that jingles when you study.", "鈴の首輪"),
  item("bandana", "neck", "Neck bandana", "common", "🌺", "Patterned cotton bandana, casual mode.", "バンダナ"),

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

  // ---------- hand (8) ----------
  // ornate-fan + sensei-pipe moved here from accessories — both are held.
  item("dragon-scroll", "hand", "Dragon scroll", "legendary", "📜", "Ancient scroll inked with a coiling dragon.", "龍の巻物"),
  item("ornate-fan", "hand", "Ornate fan", "epic", "🪭", "Folding sensu inked with bold kanji.", "扇子"),
  item("sensei-pipe", "hand", "Sensei pipe", "epic", "🪈", "Old-master kiseru — purely decorative.", "煙管"),
  item("bokken", "hand", "Bokken", "rare", "⚔️", "Carved oak training sword. Don't actually swing it.", "木刀"),
  item("shamisen", "hand", "Shamisen", "rare", "🪕", "Three-string lute for late-night practice.", "三味線"),
  item("chochin-lantern", "hand", "Chōchin lantern", "rare", "🏮", "Hand-held paper lantern that glows softly.", "提灯"),
  item("study-book", "hand", "Open textbook", "common", "📖", "A well-thumbed grammar book, mid-page.", "教科書"),
  item("bento", "hand", "Bento box", "common", "🍱", "Two-tier bento — lunch break vibes.", "弁当"),

  // ---------- back (8) ----------
  // backpack moved here from accessories — it's worn on the back.
  item("spirit-wings", "back", "Spirit wings", "legendary", "🔥", "Foxfire wings that flicker with study streaks.", "霊翼"),
  item("dragon-cape", "back", "Dragon cape", "epic", "🐉", "Embroidered cape that ripples like scales.", "龍の外套"),
  item("tengu-cape", "back", "Tengu feather cape", "epic", "🪶", "Mountain-spirit feathers in deep indigo.", "天狗の羽織"),
  item("paper-wings", "back", "Paper wings", "rare", "📄", "Folded origami wings — surprisingly sturdy.", "折り翼"),
  item("samurai-sword-back", "back", "Sword on back", "rare", "🗡️", "Sheathed katana strapped across the back.", "背刀"),
  item("backpack", "back", "Studio backpack", "common", "🎒", "Sturdy daypack for the daily commute.", "リュック"),
  item("school-satchel", "back", "School satchel", "common", "👜", "Classic leather randoseru.", "ランドセル"),
  item("furoshiki", "back", "Furoshiki bundle", "common", "🎁", "Cloth-wrapped bundle slung over the shoulder.", "風呂敷"),

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
  // Now reserved for small "finishing touch" items that don't belong on
  // face / neck / hand / back. Glasses, masks, scarves, omamori, fans,
  // and backpacks all moved out of here into their proper slots above.
  item("lucky-charm", "accessories", "Lucky charm", "epic", "✨", "Glittering trinket that hums on a streak day.", "幸運の符"),
  item("brooch", "accessories", "Kanji brooch", "rare", "🈂️", "Enamel brooch stamped with a single kanji.", "ブローチ"),
  item("study-badge", "accessories", "Scholar badge", "rare", "🎖️", "Earned-not-bought vibes (eventually).", "学者の徽章"),
  item("sash-belt", "accessories", "Cloth sash", "rare", "🪢", "Wide cotton sash tied at the waist.", "帯紐"),
  item("watch", "accessories", "Pocket watch", "common", "⌚", "A trusty timer for your timed quizzes.", "懐中時計"),
  item("enamel-pin", "accessories", "Enamel pin", "common", "📌", "Tiny kawaii pin clipped to the collar.", "ピンバッジ"),
  item("bow-ribbon", "accessories", "Bow ribbon", "common", "🎀", "Soft satin bow — clip it anywhere.", "リボン"),
  item("wristband", "accessories", "Wristband", "common", "🪅", "Cloth wrist tie in matching colors.", "リストバンド"),
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
