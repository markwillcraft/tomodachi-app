// JLPT N5 kanji set (one hundred characters; matches the MochiMochi N5
// chart). For each kanji we store:
//   - char       the character itself
//   - meaning    short English gloss for the card / quiz
//   - on         on'yomi (Sino-Japanese) reading(s) in romaji, lower-case
//   - kun        kun'yomi (native) reading(s) in romaji, lower-case
//   - strokes    total stroke count (helps the stroke display label things)
//
// We expose a helper that returns the KanjiVG SVG URL for a character so
// the stroke-order viewer can fetch it client-side.

export type Kanji = {
  char: string;
  meaning: string;
  on: string[];
  kun: string[];
  strokes: number;
};

export const N5_KANJI: Kanji[] = [
  { char: "一", meaning: "one", on: ["ichi"], kun: ["hito"], strokes: 1 },
  { char: "二", meaning: "two", on: ["ni"], kun: ["futa"], strokes: 2 },
  { char: "三", meaning: "three", on: ["san"], kun: ["mi"], strokes: 3 },
  { char: "四", meaning: "four", on: ["shi"], kun: ["yo", "yon"], strokes: 5 },
  { char: "五", meaning: "five", on: ["go"], kun: ["itsu"], strokes: 4 },
  { char: "六", meaning: "six", on: ["roku"], kun: ["mu"], strokes: 4 },
  { char: "七", meaning: "seven", on: ["shichi"], kun: ["nana"], strokes: 2 },
  { char: "八", meaning: "eight", on: ["hachi"], kun: ["ya"], strokes: 2 },
  { char: "九", meaning: "nine", on: ["kyuu", "ku"], kun: ["kokono"], strokes: 2 },
  { char: "十", meaning: "ten", on: ["juu"], kun: ["too"], strokes: 2 },

  { char: "百", meaning: "hundred", on: ["hyaku"], kun: [], strokes: 6 },
  { char: "千", meaning: "thousand", on: ["sen"], kun: ["chi"], strokes: 3 },
  { char: "万", meaning: "ten thousand", on: ["man", "ban"], kun: [], strokes: 3 },
  { char: "日", meaning: "sun, day", on: ["nichi", "jitsu"], kun: ["hi", "ka"], strokes: 4 },
  { char: "月", meaning: "moon, month", on: ["getsu", "gatsu"], kun: ["tsuki"], strokes: 4 },
  { char: "火", meaning: "fire", on: ["ka"], kun: ["hi"], strokes: 4 },
  { char: "水", meaning: "water", on: ["sui"], kun: ["mizu"], strokes: 4 },
  { char: "木", meaning: "tree, wood", on: ["boku", "moku"], kun: ["ki"], strokes: 4 },
  { char: "金", meaning: "gold, money", on: ["kin", "kon"], kun: ["kane"], strokes: 8 },
  { char: "土", meaning: "soil, earth", on: ["do", "to"], kun: ["tsuchi"], strokes: 3 },

  { char: "本", meaning: "book, origin", on: ["hon"], kun: ["moto"], strokes: 5 },
  { char: "語", meaning: "language", on: ["go"], kun: ["kata"], strokes: 14 },
  { char: "人", meaning: "person", on: ["jin", "nin"], kun: ["hito"], strokes: 2 },
  { char: "女", meaning: "woman", on: ["jo", "nyo"], kun: ["onna"], strokes: 3 },
  { char: "男", meaning: "man", on: ["dan", "nan"], kun: ["otoko"], strokes: 7 },
  { char: "子", meaning: "child", on: ["shi", "su"], kun: ["ko"], strokes: 3 },
  { char: "友", meaning: "friend", on: ["yuu"], kun: ["tomo"], strokes: 4 },
  { char: "国", meaning: "country", on: ["koku"], kun: ["kuni"], strokes: 8 },
  { char: "学", meaning: "study", on: ["gaku"], kun: ["mana"], strokes: 8 },
  { char: "校", meaning: "school", on: ["kou"], kun: [], strokes: 10 },

  { char: "小", meaning: "small", on: ["shou"], kun: ["chii", "ko"], strokes: 3 },
  { char: "大", meaning: "big", on: ["dai", "tai"], kun: ["oo"], strokes: 3 },
  { char: "少", meaning: "few", on: ["shou"], kun: ["suko", "suku"], strokes: 4 },
  { char: "多", meaning: "many", on: ["ta"], kun: ["oo"], strokes: 6 },
  { char: "時", meaning: "time, hour", on: ["ji"], kun: ["toki"], strokes: 10 },
  { char: "分", meaning: "minute, part", on: ["bun", "fun"], kun: ["wa"], strokes: 4 },
  { char: "年", meaning: "year", on: ["nen"], kun: ["toshi"], strokes: 6 },
  { char: "名", meaning: "name", on: ["mei", "myou"], kun: ["na"], strokes: 6 },
  { char: "前", meaning: "in front, before", on: ["zen"], kun: ["mae"], strokes: 9 },
  { char: "後", meaning: "behind, after", on: ["go", "kou"], kun: ["ato", "ushi", "nochi"], strokes: 9 },

  { char: "山", meaning: "mountain", on: ["san"], kun: ["yama"], strokes: 3 },
  { char: "川", meaning: "river", on: ["sen"], kun: ["kawa"], strokes: 3 },
  { char: "花", meaning: "flower", on: ["ka"], kun: ["hana"], strokes: 7 },
  { char: "魚", meaning: "fish", on: ["gyo"], kun: ["sakana", "uo"], strokes: 11 },
  { char: "上", meaning: "above, up", on: ["jou"], kun: ["ue", "kami", "a", "nobo"], strokes: 3 },
  { char: "中", meaning: "middle, inside", on: ["chuu"], kun: ["naka"], strokes: 4 },
  { char: "下", meaning: "below, down", on: ["ka", "ge"], kun: ["shita", "shimo", "kuda", "sa"], strokes: 3 },
  { char: "左", meaning: "left", on: ["sa"], kun: ["hidari"], strokes: 5 },
  { char: "右", meaning: "right", on: ["u", "yuu"], kun: ["migi"], strokes: 5 },
  { char: "外", meaning: "outside", on: ["gai", "ge"], kun: ["soto", "hoka", "hazu"], strokes: 5 },

  { char: "雨", meaning: "rain", on: ["u"], kun: ["ame"], strokes: 8 },
  { char: "電", meaning: "electricity", on: ["den"], kun: [], strokes: 13 },
  { char: "天", meaning: "heaven, sky", on: ["ten"], kun: ["ame"], strokes: 4 },
  { char: "店", meaning: "store, shop", on: ["ten"], kun: ["mise"], strokes: 8 },
  { char: "手", meaning: "hand", on: ["shu"], kun: ["te"], strokes: 4 },
  { char: "古", meaning: "old", on: ["ko"], kun: ["furu"], strokes: 5 },
  { char: "新", meaning: "new", on: ["shin"], kun: ["atara", "ara"], strokes: 13 },
  { char: "買", meaning: "buy", on: ["bai"], kun: ["ka"], strokes: 12 },
  { char: "生", meaning: "life, birth", on: ["sei", "shou"], kun: ["i", "u", "nama", "ki"], strokes: 5 },
  { char: "午", meaning: "noon", on: ["go"], kun: [], strokes: 4 },

  { char: "口", meaning: "mouth", on: ["kou", "ku"], kun: ["kuchi"], strokes: 3 },
  { char: "入", meaning: "enter", on: ["nyuu"], kun: ["i", "hai"], strokes: 2 },
  { char: "出", meaning: "exit", on: ["shutsu"], kun: ["de", "da"], strokes: 5 },
  { char: "長", meaning: "long, leader", on: ["chou"], kun: ["naga"], strokes: 8 },
  { char: "高", meaning: "tall, expensive", on: ["kou"], kun: ["taka"], strokes: 10 },
  { char: "円", meaning: "circle, yen", on: ["en"], kun: ["maru"], strokes: 4 },
  { char: "北", meaning: "north", on: ["hoku"], kun: ["kita"], strokes: 5 },
  { char: "南", meaning: "south", on: ["nan"], kun: ["minami"], strokes: 9 },
  { char: "東", meaning: "east", on: ["tou"], kun: ["higashi"], strokes: 8 },
  { char: "西", meaning: "west", on: ["sei", "sai"], kun: ["nishi"], strokes: 6 },

  { char: "食", meaning: "eat, food", on: ["shoku"], kun: ["ta", "ku"], strokes: 9 },
  { char: "飲", meaning: "drink", on: ["in"], kun: ["no"], strokes: 12 },
  { char: "駅", meaning: "station", on: ["eki"], kun: [], strokes: 14 },
  { char: "目", meaning: "eye", on: ["moku", "boku"], kun: ["me"], strokes: 5 },
  { char: "見", meaning: "see", on: ["ken"], kun: ["mi"], strokes: 7 },
  { char: "耳", meaning: "ear", on: ["ji"], kun: ["mimi"], strokes: 6 },
  { char: "聞", meaning: "listen, ask", on: ["bun", "mon"], kun: ["ki"], strokes: 14 },
  { char: "足", meaning: "foot, enough", on: ["soku"], kun: ["ashi", "ta"], strokes: 7 },
  { char: "行", meaning: "go", on: ["kou", "gyou"], kun: ["i", "yu", "okona"], strokes: 6 },
  { char: "来", meaning: "come", on: ["rai"], kun: ["ku", "ki", "ko"], strokes: 7 },

  { char: "社", meaning: "company, shrine", on: ["sha"], kun: ["yashiro"], strokes: 7 },
  { char: "休", meaning: "rest", on: ["kyuu"], kun: ["yasu"], strokes: 6 },
  { char: "車", meaning: "vehicle, car", on: ["sha"], kun: ["kuruma"], strokes: 7 },
  { char: "道", meaning: "road, way", on: ["dou"], kun: ["michi"], strokes: 12 },
  { char: "空", meaning: "sky, empty", on: ["kuu"], kun: ["sora", "a", "kara"], strokes: 8 },
  { char: "言", meaning: "word, say", on: ["gen", "gon"], kun: ["i", "koto"], strokes: 7 },
  { char: "話", meaning: "talk, story", on: ["wa"], kun: ["hana", "hanashi"], strokes: 13 },
  { char: "読", meaning: "read", on: ["doku"], kun: ["yo"], strokes: 14 },
  { char: "書", meaning: "write, book", on: ["sho"], kun: ["ka"], strokes: 10 },
  { char: "立", meaning: "stand", on: ["ritsu"], kun: ["ta"], strokes: 5 },

  { char: "母", meaning: "mother", on: ["bo"], kun: ["haha"], strokes: 5 },
  { char: "父", meaning: "father", on: ["fu"], kun: ["chichi"], strokes: 4 },
  { char: "毎", meaning: "every", on: ["mai"], kun: [], strokes: 6 },
  { char: "気", meaning: "spirit, feeling", on: ["ki", "ke"], kun: [], strokes: 6 },
  { char: "白", meaning: "white", on: ["haku", "byaku"], kun: ["shiro"], strokes: 5 },
  { char: "何", meaning: "what", on: ["ka"], kun: ["nani", "nan"], strokes: 7 },
  { char: "週", meaning: "week", on: ["shuu"], kun: [], strokes: 11 },
  { char: "間", meaning: "between, interval", on: ["kan", "ken"], kun: ["aida", "ma"], strokes: 12 },
  { char: "半", meaning: "half", on: ["han"], kun: ["naka"], strokes: 5 },
  { char: "今", meaning: "now", on: ["kon", "kin"], kun: ["ima"], strokes: 4 },
];

export function getKanjiByChar(char: string): Kanji | undefined {
  return N5_KANJI.find((k) => k.char === char);
}

// KanjiVG hosts free, MIT-licensed stroke-order SVGs keyed by zero-padded
// 5-digit hex codepoint. We hit raw.githubusercontent.com directly so no
// extra hosting is required.
export function kanjiVgUrl(char: string): string {
  const cp = char.codePointAt(0) ?? 0;
  const hex = cp.toString(16).padStart(5, "0");
  return `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`;
}

// Themed groupings matching the standard N5 ordering on the MochiMochi
// study chart. Each section has an accent color and short description to
// make the index page browsable instead of one endless grid.
export type KanjiSection = {
  id: string;
  title: string;
  subtitle: string;
  // Tailwind utility names (not class strings) so we can compose variants.
  accent: {
    // Background gradient for the section card header.
    gradient: string;
    // Accent text color used for section title.
    text: string;
    // Ring / hover border color for individual kanji tiles.
    ring: string;
    // Solid chip background.
    chip: string;
  };
  chars: string[];
};

export const KANJI_SECTIONS: KanjiSection[] = [
  {
    id: "numbers",
    title: "Numbers 1–10",
    subtitle: "The counting set — foundation for dates, prices, and time.",
    accent: {
      gradient: "from-sky-500/20 to-cyan-500/5",
      text: "text-sky-500 dark:text-sky-300",
      ring: "hover:border-sky-400/70 hover:bg-sky-500/5",
      chip: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    },
    chars: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
  },
  {
    id: "big-numbers-nature",
    title: "Big numbers & nature",
    subtitle: "Hundreds to ten-thousands plus sun, moon, and the elements.",
    accent: {
      gradient: "from-amber-500/20 to-orange-500/5",
      text: "text-amber-600 dark:text-amber-300",
      ring: "hover:border-amber-400/70 hover:bg-amber-500/5",
      chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    },
    chars: ["百", "千", "万", "日", "月", "火", "水", "木", "金", "土"],
  },
  {
    id: "people-school",
    title: "People & school",
    subtitle: "Words you'll use introducing yourself and your world.",
    accent: {
      gradient: "from-violet-500/20 to-fuchsia-500/5",
      text: "text-violet-500 dark:text-violet-300",
      ring: "hover:border-violet-400/70 hover:bg-violet-500/5",
      chip: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    },
    chars: ["本", "語", "人", "女", "男", "子", "友", "国", "学", "校"],
  },
  {
    id: "size-time",
    title: "Size & time",
    subtitle: "Big / small, before / after, hours and minutes.",
    accent: {
      gradient: "from-rose-500/20 to-pink-500/5",
      text: "text-rose-500 dark:text-rose-300",
      ring: "hover:border-rose-400/70 hover:bg-rose-500/5",
      chip: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    },
    chars: ["小", "大", "少", "多", "時", "分", "年", "名", "前", "後"],
  },
  {
    id: "places-directions",
    title: "Places & directions",
    subtitle: "Geography basics plus up/down, left/right, inside/outside.",
    accent: {
      gradient: "from-emerald-500/20 to-green-500/5",
      text: "text-emerald-500 dark:text-emerald-300",
      ring: "hover:border-emerald-400/70 hover:bg-emerald-500/5",
      chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    },
    chars: ["山", "川", "花", "魚", "上", "中", "下", "左", "右", "外"],
  },
  {
    id: "weather-shops",
    title: "Weather, shops & life",
    subtitle: "Rain, electricity, shopping, and the rhythm of the day.",
    accent: {
      gradient: "from-blue-500/20 to-indigo-500/5",
      text: "text-blue-500 dark:text-blue-300",
      ring: "hover:border-blue-400/70 hover:bg-blue-500/5",
      chip: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    },
    chars: ["雨", "電", "天", "店", "手", "古", "新", "買", "生", "午"],
  },
  {
    id: "body-compass",
    title: "Body & compass",
    subtitle: "Parts of the body mixed with the four cardinal directions.",
    accent: {
      gradient: "from-red-500/20 to-rose-500/5",
      text: "text-red-500 dark:text-red-300",
      ring: "hover:border-red-400/70 hover:bg-red-500/5",
      chip: "bg-red-500/15 text-red-600 dark:text-red-300",
    },
    chars: ["口", "入", "出", "長", "高", "円", "北", "南", "東", "西"],
  },
  {
    id: "senses-motion",
    title: "Senses & motion",
    subtitle: "Eat, drink, see, listen — and the verbs that get you around.",
    accent: {
      gradient: "from-teal-500/20 to-cyan-500/5",
      text: "text-teal-500 dark:text-teal-300",
      ring: "hover:border-teal-400/70 hover:bg-teal-500/5",
      chip: "bg-teal-500/15 text-teal-600 dark:text-teal-300",
    },
    chars: ["食", "飲", "駅", "目", "見", "耳", "聞", "足", "行", "来"],
  },
  {
    id: "society-actions",
    title: "Society & actions",
    subtitle: "Everyday verbs and the places they happen.",
    accent: {
      gradient: "from-indigo-500/20 to-purple-500/5",
      text: "text-indigo-500 dark:text-indigo-300",
      ring: "hover:border-indigo-400/70 hover:bg-indigo-500/5",
      chip: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
    },
    chars: ["社", "休", "車", "道", "空", "言", "話", "読", "書", "立"],
  },
  {
    id: "family-everyday",
    title: "Family & everyday",
    subtitle: "Mother, father, weekdays, and the little words that glue them.",
    accent: {
      gradient: "from-fuchsia-500/20 to-pink-500/5",
      text: "text-fuchsia-500 dark:text-fuchsia-300",
      ring: "hover:border-fuchsia-400/70 hover:bg-fuchsia-500/5",
      chip: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300",
    },
    chars: ["母", "父", "毎", "気", "白", "何", "週", "間", "半", "今"],
  },
];

export function getSectionByKanji(char: string): KanjiSection | undefined {
  return KANJI_SECTIONS.find((s) => s.chars.includes(char));
}

export function getKanjiInSection(section: KanjiSection): Kanji[] {
  return section.chars
    .map((c) => getKanjiByChar(c))
    .filter((k): k is Kanji => !!k);
}
