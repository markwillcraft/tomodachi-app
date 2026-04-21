// JLPT N5 grammar lessons. Each lesson is laid out as a "pattern" made of
// colored tokens (so we can render the わ・を・は particles in distinct hues
// like a textbook), plus a list of example sentences and an explanation.
//
// All Japanese strings are written in hiragana/katakana (no kanji) to stay
// approachable for absolute beginners.

export type TokenColor =
  | "noun1"
  | "noun2"
  | "noun3"
  | "particle"
  | "verb"
  | "copula"
  | "question"
  | "neutral";

export type Token = {
  text: string;
  romaji?: string;
  color: TokenColor;
};

export type Example = {
  english: string;
  // Tokens build the JP sentence. Use { text: "は", romaji: "wa", color: "particle" } etc.
  jp: Token[];
};

export type GrammarLesson = {
  slug: string;
  number: string;
  title: string;
  pattern: Token[];
  meaning: string;
  explanation: string;
  examples: Example[];
};

export const N5_LESSONS: GrammarLesson[] = [
  {
    slug: "1-1-n1-wa-n2-desu",
    number: "1-1",
    title: "N1 は N2 です。",
    meaning: "N1 is N2.",
    pattern: [
      { text: "N1", color: "noun1" },
      { text: " は ", romaji: "wa", color: "particle" },
      { text: "N2", color: "noun2" },
      { text: " です", romaji: "desu", color: "copula" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "The most basic Japanese sentence. は (wa) marks the topic, and です (desu) is the polite copula 'is/am/are'. Note: は is written wa here, not ha.",
    examples: [
      {
        english: "I am Rose.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "ローズ", romaji: "rouzu", color: "noun2" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "I am a Filipino.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "フィリピンじん", romaji: "firipin-jin", color: "noun2" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "Tanaka is a teacher.",
        jp: [
          { text: "たなかさん", romaji: "tanaka-san", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "せんせい", romaji: "sensei", color: "noun2" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "1-2-negative",
    number: "1-2",
    title: "N1 は N2 では ありません。",
    meaning: "N1 is not N2.",
    pattern: [
      { text: "N1", color: "noun1" },
      { text: " は ", romaji: "wa", color: "particle" },
      { text: "N2", color: "noun2" },
      { text: " では ありません", romaji: "dewa arimasen", color: "copula" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "To make 'N1 is N2' negative, swap です for では ありません (or the more casual じゃ ありません). It means 'is not'.",
    examples: [
      {
        english: "I am not a student.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "がくせい", romaji: "gakusei", color: "noun2" },
          { text: " では ありません", romaji: "dewa arimasen", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "She is not Japanese.",
        jp: [
          { text: "かのじょ", romaji: "kanojo", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "にほんじん", romaji: "nihonjin", color: "noun2" },
          { text: " じゃ ありません", romaji: "ja arimasen", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "1-3-question",
    number: "1-3",
    title: "N1 は N2 です か。",
    meaning: "Is N1 a N2?",
    pattern: [
      { text: "N1", color: "noun1" },
      { text: " は ", romaji: "wa", color: "particle" },
      { text: "N2", color: "noun2" },
      { text: " です", romaji: "desu", color: "copula" },
      { text: " か", romaji: "ka", color: "question" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "Add the particle か (ka) at the end to turn any statement into a yes/no question. No question mark needed in formal writing.",
    examples: [
      {
        english: "Are you a student?",
        jp: [
          { text: "あなた", romaji: "anata", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "がくせい", romaji: "gakusei", color: "noun2" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: " か", romaji: "ka", color: "question" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "Is Tanaka a teacher?",
        jp: [
          { text: "たなかさん", romaji: "tanaka-san", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "せんせい", romaji: "sensei", color: "noun2" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: " か", romaji: "ka", color: "question" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "2-1-kore-sore-are",
    number: "2-1",
    title: "これ / それ / あれ は N です。",
    meaning: "This / that / that-over-there is N.",
    pattern: [
      { text: "これ・それ・あれ", romaji: "kore/sore/are", color: "noun1" },
      { text: " は ", romaji: "wa", color: "particle" },
      { text: "N", color: "noun2" },
      { text: " です", romaji: "desu", color: "copula" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "これ (kore) = this (near me). それ (sore) = that (near you). あれ (are) = that over there (far from both). They stand alone as nouns; for 'this book', use この ほん (kono hon).",
    examples: [
      {
        english: "This is a book.",
        jp: [
          { text: "これ", romaji: "kore", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "ほん", romaji: "hon", color: "noun2" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "That (over there) is a car.",
        jp: [
          { text: "あれ", romaji: "are", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "くるま", romaji: "kuruma", color: "noun2" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "2-2-no-possessive",
    number: "2-2",
    title: "N1 の N2",
    meaning: "N2 of N1 / N1's N2.",
    pattern: [
      { text: "N1", color: "noun1" },
      { text: " の ", romaji: "no", color: "particle" },
      { text: "N2", color: "noun2" },
    ],
    explanation:
      "の (no) links two nouns. It can mean possession ('my book'), origin ('Japan's car'), or category ('Japanese teacher'). N1 modifies N2.",
    examples: [
      {
        english: "My book.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " の ", romaji: "no", color: "particle" },
          { text: "ほん", romaji: "hon", color: "noun2" },
        ],
      },
      {
        english: "Japanese teacher.",
        jp: [
          { text: "にほんご", romaji: "nihongo", color: "noun1" },
          { text: " の ", romaji: "no", color: "particle" },
          { text: "せんせい", romaji: "sensei", color: "noun2" },
        ],
      },
      {
        english: "Tanaka's car.",
        jp: [
          { text: "たなかさん", romaji: "tanaka-san", color: "noun1" },
          { text: " の ", romaji: "no", color: "particle" },
          { text: "くるま", romaji: "kuruma", color: "noun2" },
        ],
      },
    ],
  },
  {
    slug: "3-1-time",
    number: "3-1",
    title: "いま X じ です。",
    meaning: "It is now X o'clock.",
    pattern: [
      { text: "いま", romaji: "ima", color: "noun1" },
      { text: " ", color: "neutral" },
      { text: "X じ", romaji: "X-ji", color: "noun2" },
      { text: " です", romaji: "desu", color: "copula" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "じ (ji) is the counter for 'o'clock'. Just put a number in front: いちじ (1 o'clock), にじ (2 o'clock). For 'now' say いま.",
    examples: [
      {
        english: "It is now 3 o'clock.",
        jp: [
          { text: "いま", romaji: "ima", color: "noun1" },
          { text: " ", color: "neutral" },
          { text: "さんじ", romaji: "san-ji", color: "noun2" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "It is now 9 o'clock.",
        jp: [
          { text: "いま", romaji: "ima", color: "noun1" },
          { text: " ", color: "neutral" },
          { text: "くじ", romaji: "ku-ji", color: "noun2" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "4-1-wo-particle",
    number: "4-1",
    title: "N を Verb。",
    meaning: "Do [verb] to N (object marker).",
    pattern: [
      { text: "N", color: "noun1" },
      { text: " を ", romaji: "wo", color: "particle" },
      { text: "Verb", color: "verb" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "を (wo, pronounced 'o') marks the direct object of a transitive verb. The verb comes at the end of the sentence.",
    examples: [
      {
        english: "I eat sushi.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "すし", romaji: "sushi", color: "noun2" },
          { text: " を ", romaji: "wo", color: "particle" },
          { text: "たべます", romaji: "tabemasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "I read a book.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "ほん", romaji: "hon", color: "noun2" },
          { text: " を ", romaji: "wo", color: "particle" },
          { text: "よみます", romaji: "yomimasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "4-2-ni-particle-place",
    number: "4-2",
    title: "Place に いきます / きます。",
    meaning: "Go / come to [place].",
    pattern: [
      { text: "Place", color: "noun1" },
      { text: " に ", romaji: "ni", color: "particle" },
      { text: "いきます・きます", romaji: "ikimasu/kimasu", color: "verb" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "に (ni) marks the destination of motion verbs like いきます (to go) and きます (to come). Use へ (e) interchangeably for direction.",
    examples: [
      {
        english: "I go to school.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "がっこう", romaji: "gakkou", color: "noun2" },
          { text: " に ", romaji: "ni", color: "particle" },
          { text: "いきます", romaji: "ikimasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "Tomorrow I go to Japan.",
        jp: [
          { text: "あした", romaji: "ashita", color: "noun1" },
          { text: " ", color: "neutral" },
          { text: "にほん", romaji: "nihon", color: "noun2" },
          { text: " に ", romaji: "ni", color: "particle" },
          { text: "いきます", romaji: "ikimasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
];

export function getLessonBySlug(slug: string): GrammarLesson | undefined {
  return N5_LESSONS.find((l) => l.slug === slug);
}

// Tailwind classes for each token color. Centralized so the lesson UI and
// the pattern preview on the index page stay in lockstep.
export const TOKEN_COLOR_CLASS: Record<TokenColor, string> = {
  noun1: "text-yellow-400",
  noun2: "text-cyan-300",
  noun3: "text-emerald-300",
  particle: "text-pink-400 font-bold",
  verb: "text-orange-300",
  copula: "text-violet-300",
  question: "text-rose-400 font-bold",
  neutral: "text-foreground",
};
