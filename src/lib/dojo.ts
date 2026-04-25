// =====================================================================
// Dojo catalog — structured learning paths
// ---------------------------------------------------------------------
// The Dojo is the *guided* counterpart to /study (now called
// "Self-study"). Where /study lets a learner pick their own surface
// and grind, /dojo walks them through a curated curriculum, lesson
// by lesson, like a textbook.
//
// Curriculum source: **Genki I + II** (3rd ed., The Japan Times).
// We deliberately do NOT mix Genki and Minna no Nihongo because:
//   * Their grammar orderings disagree (te-form, particles, copulas
//     are introduced in different sequences).
//   * Their vocabulary sets only partially overlap; cross-referencing
//     would teach learners contradictory canonical readings.
//   * Genki is built for self-study with bilingual scaffolding,
//     Minna assumes a Japanese-only classroom teacher.
// Genki I lessons 1–12 cover the JLPT N5 grammar surface; Genki II
// lessons 13–23 cover N4. We mirror that mapping here.
//
// This catalog is the *display layer*. The *content layer* lives in
// `src/lib/dojo-content.ts` — that's where grammar explanations,
// vocab items, and listening prompts are authored. A lesson is
// considered drillable only if `dojo-content` has authored content
// for it; the `live` / `coming-soon` flags on each section here
// must be kept in sync with what's been authored.
//
// Coverage status:
//   * n5-l1 … n5-l12      → live (full content — N5 complete)
//   * n4-l13 … n4-l23     → live (full content, gated behind N5
//                           completion via DojoPath.prerequisite)
// =====================================================================

import type { LucideIcon } from "lucide-react"
import {
  BookMarked,
  Headphones,
  Languages,
  Sparkles,
  Trophy,
} from "lucide-react"

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

export type DojoLevel = "n5" | "n4"

export type DojoSectionKind = "grammar" | "vocab" | "listening"

export type DojoSection = {
  kind: DojoSectionKind
  /** Number of items inside this section (grammar points, vocab
   *  words, listening dialogues). Used to weight the lesson card. */
  count: number
  /** Phase 1 ships everything as `coming-soon`. Phase 2 flips to
   *  `live` per-section as the underlying drills land. */
  status: "live" | "coming-soon"
}

export type DojoLessonStatus = "available" | "locked" | "completed"

export type DojoLesson = {
  /** Stable id. Format: `<level>-l<n>` (e.g. `n5-l1`). */
  id: string
  level: DojoLevel
  /** 1-based lesson number within the level. */
  number: number
  /** Short English title — what the textbook calls the lesson. */
  title: string
  /** Romaji theme — flavour text matching the Genki chapter. */
  jpTitle: string
  /** One-line "what you'll learn" copy for the card. */
  summary: string
  /** Two or three highlight grammar points to surface on the card.
   *  Lets the user evaluate "do I want to crack this open?" without
   *  drilling into the lesson. */
  highlights: string[]
  status: DojoLessonStatus
  sections: DojoSection[]
}

export type DojoPathStatus = "available" | "locked"

/** Declarative gate for a path. Distinct from `status` because a path
 *  can have *all its content authored* (`status: "available"`) yet
 *  still be locked for a specific user until they clear an earlier
 *  level — N4 hides behind N5 completion, for example. The field is
 *  data-only; runtime evaluation lives in `dojo-server.ts`. */
export type DojoPathPrerequisite = {
  kind: "level-complete"
  /** The level whose lessons must all be completed. */
  level: DojoLevel
}

export type DojoPath = {
  level: DojoLevel
  /** Display label, e.g. "JLPT N5". */
  label: string
  /** Short uppercase tag rendered as a chip on the path selector. */
  badge: string
  /** Genki textbook reference — shown as a sub-label so learners
   *  know what curriculum they're on. */
  textbook: string
  description: string
  status: DojoPathStatus
  /** Optional runtime prerequisite. When present, the path renders
   *  in a "preview" state until the gate is satisfied — content is
   *  visible but drills don't dispatch. */
  prerequisite?: DojoPathPrerequisite
  lessons: readonly DojoLesson[]
}

// ---------------------------------------------------------------------
// Section icon map
// ---------------------------------------------------------------------
//
// Kept here so the catalog can carry pure-data while the UI renders
// the matching glyph. We DON'T put the icon component on the section
// itself because the catalog is imported by client components — and
// while that works today, threading icons via the kind keeps the data
// schema serialisable for any future API/server-shape we want.

export const SECTION_META: Record<
  DojoSectionKind,
  { label: string; icon: LucideIcon; tone: string }
> = {
  grammar: {
    label: "Grammar",
    icon: BookMarked,
    tone: "text-violet-600 dark:text-violet-300",
  },
  vocab: {
    label: "Vocab",
    icon: Languages,
    tone: "text-amber-600 dark:text-amber-300",
  },
  listening: {
    label: "Listening",
    icon: Headphones,
    tone: "text-sky-600 dark:text-sky-300",
  },
}

export const PATH_BADGE_META: Record<
  DojoLevel,
  { icon: LucideIcon; tone: string; ring: string }
> = {
  n5: {
    icon: Sparkles,
    tone: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/40 bg-emerald-500/10",
  },
  n4: {
    icon: Trophy,
    tone: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/40 bg-violet-500/10",
  },
}

// ---------------------------------------------------------------------
// Catalog data
// ---------------------------------------------------------------------
//
// Lesson titles map 1:1 to Genki chapters. Highlights pick the 2–3
// most defining grammar points of each chapter so the card teaches
// even at a glance.
//
// Counts are best-effort estimates of what the lesson will eventually
// contain (matched roughly to Genki's actual chapter density), used
// to weight the section meters. They will tighten in Phase 2 when
// each section is wired to its real bank.

const N5_LESSONS: readonly DojoLesson[] = [
  {
    id: "n5-l1",
    level: "n5",
    number: 1,
    title: "New Friends",
    jpTitle: "Atarashii Tomodachi",
    summary: "Greetings, self-introduction, and the X wa Y desu pattern.",
    highlights: ["X wa Y desu", "Question marker か", "Numbers 1–100"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n5-l2",
    level: "n5",
    number: 2,
    title: "Shopping",
    jpTitle: "Kaimono",
    summary: "Demonstratives (this/that) and asking how much things cost.",
    highlights: ["これ・それ・あれ", "Particles の", "Prices in 円"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 5, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n5-l3",
    level: "n5",
    number: 3,
    title: "Making a Date",
    jpTitle: "Deeto no Yakusoku",
    summary: "Verb conjugation (-masu form) and inviting someone out.",
    highlights: ["-masu / -masen", "Particles を・で・に", "Time expressions"],
    status: "available",
    sections: [
      { kind: "vocab", count: 22, status: "live" },
      { kind: "grammar", count: 5, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n5-l4",
    level: "n5",
    number: 4,
    title: "The First Date",
    jpTitle: "Hatsu Deeto",
    summary: "Past tense, locations, and there is/are with arimasu / imasu.",
    highlights: ["Past -mashita", "X ga arimasu / imasu", "Position words"],
    status: "available",
    sections: [
      { kind: "vocab", count: 22, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n5-l5",
    level: "n5",
    number: 5,
    title: "A Trip to Okinawa",
    jpTitle: "Okinawa Ryokou",
    summary: "Adjectives (i and na), likes and dislikes, suggestions.",
    highlights: ["い-adj / な-adj", "好きです / 嫌いです", "-mashou suggestions"],
    status: "available",
    sections: [
      { kind: "vocab", count: 22, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n5-l6",
    level: "n5",
    number: 6,
    title: "A Day in Robert's Life",
    jpTitle: "Robaato-san no Ichinichi",
    summary: "The te-form: requests, permission, and connecting actions.",
    highlights: ["て-form", "-te kudasai", "-te mo ii desu"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n5-l7",
    level: "n5",
    number: 7,
    title: "Family Picture",
    jpTitle: "Kazoku no Shashin",
    summary: "te-iru forms (in-progress / state) and family vocabulary.",
    highlights: ["-te imasu", "Family terms", "Describing people"],
    status: "available",
    sections: [
      { kind: "vocab", count: 22, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n5-l8",
    level: "n5",
    number: 8,
    title: "Barbecue",
    jpTitle: "Baabekyuu",
    summary: "Short / plain forms — the foundation of casual speech.",
    highlights: ["Short form (verbs)", "Short form (adjectives)", "と思います"],
    status: "available",
    sections: [
      { kind: "vocab", count: 22, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n5-l9",
    level: "n5",
    number: 9,
    title: "Kabuki",
    jpTitle: "Kabuki",
    summary: "Past short form, quoting, and reporting what someone said.",
    highlights: ["Past short form", "と言っていました", "もう / まだ"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n5-l10",
    level: "n5",
    number: 10,
    title: "Winter Vacation Plans",
    jpTitle: "Fuyu-yasumi no Keikaku",
    summary: "Comparisons, superlatives, and intent (-tsumori).",
    highlights: ["A より B / 一番", "つもりです", "なる (to become)"],
    status: "available",
    sections: [
      { kind: "vocab", count: 22, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n5-l11",
    level: "n5",
    number: 11,
    title: "After the Vacation",
    jpTitle: "Yasumi no Ato",
    summary: "Want to do (-tai), listing actions (-tari ... -tari).",
    highlights: ["-たい (want to)", "-たり…-たり", "ことがあります"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n5-l12",
    level: "n5",
    number: 12,
    title: "Feeling Ill",
    jpTitle: "Byouki",
    summary: "Should / must, body parts, and explaining why with -nde.",
    highlights: ["-nakereba ikemasen", "んです explanation", "-sugiru"],
    status: "available",
    sections: [
      { kind: "vocab", count: 22, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
]

const N4_LESSONS: readonly DojoLesson[] = [
  {
    id: "n4-l13",
    level: "n4",
    number: 13,
    title: "Looking for a Part-time Job",
    jpTitle: "Arubaito-sagashi",
    summary: "Potential form: 'can do' and 'is able to'.",
    highlights: ["Potential form", "見える / 聞こえる", "しか…ない"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n4-l14",
    level: "n4",
    number: 14,
    title: "Valentine's Day",
    jpTitle: "Barentain Dee",
    summary: "Giving and receiving — あげる, くれる, もらう.",
    highlights: ["あげる / くれる / もらう", "-te ageru / kureru", "Conditional たら"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n4-l15",
    level: "n4",
    number: 15,
    title: "Looking for a Club",
    jpTitle: "Saakuru-sagashi",
    summary: "Volitional form, plans (-you to omou), and let me (-sasete).",
    highlights: ["Volitional", "-you to omou", "Conditional ば"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n4-l16",
    level: "n4",
    number: 16,
    title: "Lost and Found",
    jpTitle: "Wasuremono",
    summary: "te-form helpers — try, finish, do in advance.",
    highlights: ["-te miru", "-te shimau", "-te oku"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n4-l17",
    level: "n4",
    number: 17,
    title: "Grumble and Request",
    jpTitle: "Guchi to Onegai",
    summary: "Hearsay (-sou), conjecture (-rashii), and polite requests.",
    highlights: ["-sou desu (hearsay)", "-rashii", "-te hoshii"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n4-l18",
    level: "n4",
    number: 18,
    title: "John's Diary",
    jpTitle: "Jon-san no Nikki",
    summary: "Transitive vs intransitive verb pairs.",
    highlights: ["他動詞 vs 自動詞", "-te aru", "-nagara"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n4-l19",
    level: "n4",
    number: 19,
    title: "Meeting the Boss",
    jpTitle: "Joushi to Au",
    summary: "Honorifics — 尊敬語 (sonkeigo).",
    highlights: ["お〜になる", "Honorific verbs", "いらっしゃる"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n4-l20",
    level: "n4",
    number: 20,
    title: "Mary the Tenant",
    jpTitle: "Meari-san no Shitaku",
    summary: "Humble forms — 謙譲語 (kenjougo).",
    highlights: ["お〜する", "申す / 参る", "ございます"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n4-l21",
    level: "n4",
    number: 21,
    title: "A Korean Friend",
    jpTitle: "Kankokujin no Tomodachi",
    summary: "Passive voice and 'because' with ので.",
    highlights: ["Passive form", "ので", "〜方"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n4-l22",
    level: "n4",
    number: 22,
    title: "Japanese Culture",
    jpTitle: "Nihon no Bunka",
    summary: "Causative form and goal-oriented ように・ために.",
    highlights: ["Causative", "〜させてください", "ように・ために"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
  {
    id: "n4-l23",
    level: "n4",
    number: 23,
    title: "Complaint and Request",
    jpTitle: "Fuman to Onegai",
    summary: "Causative-passive — 'was made to do something'.",
    highlights: ["Causative-passive", "〜やすい / にくい", "〜ば〜ほど"],
    status: "available",
    sections: [
      { kind: "vocab", count: 20, status: "live" },
      { kind: "grammar", count: 4, status: "live" },
      { kind: "listening", count: 4, status: "live" },
    ],
  },
]

export const DOJO_PATHS: readonly DojoPath[] = [
  {
    level: "n5",
    label: "JLPT N5",
    badge: "Beginner",
    textbook: "Genki I · Lessons 1–12",
    description:
      "Foundations: greetings, particles, te-form, basic past tense.",
    status: "available",
    lessons: N5_LESSONS,
  },
  {
    level: "n4",
    label: "JLPT N4",
    badge: "Elementary",
    textbook: "Genki II · Lessons 13–23",
    description:
      "Casual speech, keigo, transitive/intransitive, conditional forms.",
    status: "available",
    prerequisite: { kind: "level-complete", level: "n5" },
    lessons: N4_LESSONS,
  },
] as const

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

/** True if every section of the lesson is `live` (i.e. authored
 *  content exists in `src/lib/dojo-content.ts`). The lesson grid
 *  uses this to decide whether a card links into drills or renders
 *  in coming-soon mode. */
export function isLessonLive(lesson: DojoLesson): boolean {
  return lesson.sections.every((s) => s.status === "live")
}

/** Find a lesson by id across all paths. Returns `null` if not found. */
export function findLesson(lessonId: string): DojoLesson | null {
  for (const path of DOJO_PATHS) {
    const found = path.lessons.find((l) => l.id === lessonId)
    if (found) return found
  }
  return null
}

/** Locate the path that owns a given lesson id. Used by the server-
 *  side prereq guard to evaluate `path.prerequisite` before allowing
 *  a section submission. Returns `null` if the lesson isn't in any
 *  path (which shouldn't happen at runtime — caller treats as 404). */
export function findPathForLesson(lessonId: string): DojoPath | null {
  for (const path of DOJO_PATHS) {
    if (path.lessons.some((l) => l.id === lessonId)) return path
  }
  return null
}

/** Sum of section counts across every lesson in a path. Used by the
 *  path selector chips to communicate "what's in here". */
export function getPathTotals(path: DojoPath): {
  grammar: number
  vocab: number
  listening: number
  lessons: number
} {
  const totals = { grammar: 0, vocab: 0, listening: 0, lessons: path.lessons.length }
  for (const lesson of path.lessons) {
    for (const sec of lesson.sections) {
      totals[sec.kind] += sec.count
    }
  }
  return totals
}
