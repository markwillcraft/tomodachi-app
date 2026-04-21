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
  {
    slug: "4-3-de-place-of-action",
    number: "4-3",
    title: "Place で Verb。",
    meaning: "Do [verb] at [place].",
    pattern: [
      { text: "Place", color: "noun1" },
      { text: " で ", romaji: "de", color: "particle" },
      { text: "Verb", color: "verb" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "で (de) marks the location where an action happens — distinct from に (ni), which marks a destination. Use で whenever something is done at, in, or on a place.",
    examples: [
      {
        english: "I eat at a restaurant.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "レストラン", romaji: "resutoran", color: "noun2" },
          { text: " で ", romaji: "de", color: "particle" },
          { text: "たべます", romaji: "tabemasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "I study at the library.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "としょかん", romaji: "toshokan", color: "noun2" },
          { text: " で ", romaji: "de", color: "particle" },
          { text: "べんきょう します", romaji: "benkyou shimasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "4-4-to-with-someone",
    number: "4-4",
    title: "Person と Verb。",
    meaning: "Do [verb] together with [person].",
    pattern: [
      { text: "Person", color: "noun1" },
      { text: " と ", romaji: "to", color: "particle" },
      { text: "Verb", color: "verb" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "と (to) means 'with' when it's followed by a person/group and a verb of doing-together. (と also means 'and' between nouns: パン と たまご = bread and eggs.)",
    examples: [
      {
        english: "I play with my friend.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "ともだち", romaji: "tomodachi", color: "noun2" },
          { text: " と ", romaji: "to", color: "particle" },
          { text: "あそびます", romaji: "asobimasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "Tomorrow I'll go with Tanaka.",
        jp: [
          { text: "あした", romaji: "ashita", color: "noun1" },
          { text: " ", color: "neutral" },
          { text: "たなかさん", romaji: "tanaka-san", color: "noun2" },
          { text: " と ", romaji: "to", color: "particle" },
          { text: "いきます", romaji: "ikimasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "5-1-i-adjective",
    number: "5-1",
    title: "N は i-Adj です。",
    meaning: "N is [i-adjective].",
    pattern: [
      { text: "N", color: "noun1" },
      { text: " は ", romaji: "wa", color: "particle" },
      { text: "i-Adj", color: "verb" },
      { text: " です", romaji: "desu", color: "copula" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "i-adjectives end in い (oishii, takai, atsui). They keep their い in the polite form: just add です. The negative drops い → くない: たかくない です = is not expensive.",
    examples: [
      {
        english: "This sushi is delicious.",
        jp: [
          { text: "この", romaji: "kono", color: "noun1" },
          { text: " ", color: "neutral" },
          { text: "すし", romaji: "sushi", color: "noun2" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "おいしい", romaji: "oishii", color: "verb" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "Today is hot.",
        jp: [
          { text: "きょう", romaji: "kyou", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "あつい", romaji: "atsui", color: "verb" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "5-2-na-adjective",
    number: "5-2",
    title: "N は na-Adj です。",
    meaning: "N is [na-adjective].",
    pattern: [
      { text: "N", color: "noun1" },
      { text: " は ", romaji: "wa", color: "particle" },
      { text: "na-Adj", color: "verb" },
      { text: " です", romaji: "desu", color: "copula" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "na-adjectives (kirei, shizuka, genki) act like nouns: just attach です. They take a な only when modifying a noun directly (next lesson). Negative is the same as nouns: では ありません.",
    examples: [
      {
        english: "This park is quiet.",
        jp: [
          { text: "この", romaji: "kono", color: "noun1" },
          { text: " ", color: "neutral" },
          { text: "こうえん", romaji: "kouen", color: "noun2" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "しずか", romaji: "shizuka", color: "verb" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "Tanaka is energetic.",
        jp: [
          { text: "たなかさん", romaji: "tanaka-san", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "げんき", romaji: "genki", color: "verb" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "5-3-adjective-modifying-noun",
    number: "5-3",
    title: "Adj + N",
    meaning: "[adjective] + [noun] (e.g. a big house).",
    pattern: [
      { text: "i-Adj / na-Adj な", color: "verb" },
      { text: " ", color: "neutral" },
      { text: "N", color: "noun1" },
    ],
    explanation:
      "i-adjectives attach directly to a noun: おおきい いえ = big house. na-adjectives need な between the adjective and the noun: きれい な はな = pretty flower.",
    examples: [
      {
        english: "A big house.",
        jp: [
          { text: "おおきい", romaji: "ookii", color: "verb" },
          { text: " ", color: "neutral" },
          { text: "いえ", romaji: "ie", color: "noun1" },
        ],
      },
      {
        english: "A pretty flower.",
        jp: [
          { text: "きれい", romaji: "kirei", color: "verb" },
          { text: " な ", romaji: "na", color: "particle" },
          { text: "はな", romaji: "hana", color: "noun1" },
        ],
      },
      {
        english: "A new, cheap car.",
        jp: [
          { text: "あたらしくて", romaji: "atarashikute", color: "verb" },
          { text: " ", color: "neutral" },
          { text: "やすい", romaji: "yasui", color: "verb" },
          { text: " ", color: "neutral" },
          { text: "くるま", romaji: "kuruma", color: "noun1" },
        ],
      },
    ],
  },
  {
    slug: "6-1-arimasu-imasu",
    number: "6-1",
    title: "N が あります / います。",
    meaning: "N exists / there is N.",
    pattern: [
      { text: "N", color: "noun1" },
      { text: " が ", romaji: "ga", color: "particle" },
      { text: "あります・います", romaji: "arimasu/imasu", color: "verb" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "あります (arimasu) is for inanimate things (books, trees, money). います (imasu) is for living things that move (people, animals). The thing that exists is marked with が (ga).",
    examples: [
      {
        english: "There is a book.",
        jp: [
          { text: "ほん", romaji: "hon", color: "noun1" },
          { text: " が ", romaji: "ga", color: "particle" },
          { text: "あります", romaji: "arimasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "There is a cat.",
        jp: [
          { text: "ねこ", romaji: "neko", color: "noun1" },
          { text: " が ", romaji: "ga", color: "particle" },
          { text: "います", romaji: "imasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "6-2-location-ni-arimasu",
    number: "6-2",
    title: "Place に N が あります / います。",
    meaning: "There is N at [place].",
    pattern: [
      { text: "Place", color: "noun1" },
      { text: " に ", romaji: "ni", color: "particle" },
      { text: "N", color: "noun2" },
      { text: " が ", romaji: "ga", color: "particle" },
      { text: "あります・います", romaji: "arimasu/imasu", color: "verb" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "に (ni) here marks the location of existence (not motion). Pattern: place に thing が あります/います = 'at [place], [thing] exists'. Common location words: うえ (on), した (under), なか (inside), まえ (in front).",
    examples: [
      {
        english: "There is a book on the desk.",
        jp: [
          { text: "つくえ", romaji: "tsukue", color: "noun1" },
          { text: " の ", romaji: "no", color: "particle" },
          { text: "うえ", romaji: "ue", color: "noun1" },
          { text: " に ", romaji: "ni", color: "particle" },
          { text: "ほん", romaji: "hon", color: "noun2" },
          { text: " が ", romaji: "ga", color: "particle" },
          { text: "あります", romaji: "arimasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "There is a teacher in the room.",
        jp: [
          { text: "へや", romaji: "heya", color: "noun1" },
          { text: " に ", romaji: "ni", color: "particle" },
          { text: "せんせい", romaji: "sensei", color: "noun2" },
          { text: " が ", romaji: "ga", color: "particle" },
          { text: "います", romaji: "imasu", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "7-1-masu-negative",
    number: "7-1",
    title: "Verb-ません。",
    meaning: "Do not do [verb] (polite negative).",
    pattern: [
      { text: "N", color: "noun1" },
      { text: " を ", romaji: "wo", color: "particle" },
      { text: "Verb-ません", romaji: "verb-masen", color: "verb" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "Swap the polite ます ending for ません to make a verb negative: たべます (eat) → たべません (don't eat). Sentence structure stays exactly the same.",
    examples: [
      {
        english: "I don't drink coffee.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "コーヒー", romaji: "koohii", color: "noun2" },
          { text: " を ", romaji: "wo", color: "particle" },
          { text: "のみません", romaji: "nomimasen", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "Today I won't go to school.",
        jp: [
          { text: "きょう", romaji: "kyou", color: "noun1" },
          { text: " ", color: "neutral" },
          { text: "がっこう", romaji: "gakkou", color: "noun2" },
          { text: " に ", romaji: "ni", color: "particle" },
          { text: "いきません", romaji: "ikimasen", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "7-2-mashita-past",
    number: "7-2",
    title: "Verb-ました。",
    meaning: "Did [verb] (polite past).",
    pattern: [
      { text: "N", color: "noun1" },
      { text: " を ", romaji: "wo", color: "particle" },
      { text: "Verb-ました", romaji: "verb-mashita", color: "verb" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "Replace ます with ました to put a verb in the polite past tense: たべます (eat) → たべました (ate). Past negative is ませんでした.",
    examples: [
      {
        english: "Yesterday I watched a movie.",
        jp: [
          { text: "きのう", romaji: "kinou", color: "noun1" },
          { text: " ", color: "neutral" },
          { text: "えいが", romaji: "eiga", color: "noun2" },
          { text: " を ", romaji: "wo", color: "particle" },
          { text: "みました", romaji: "mimashita", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "I didn't study yesterday.",
        jp: [
          { text: "きのう", romaji: "kinou", color: "noun1" },
          { text: " ", color: "neutral" },
          { text: "べんきょう しませんでした", romaji: "benkyou shimasendeshita", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "8-1-tai-want-to",
    number: "8-1",
    title: "Verb-stem たい です。",
    meaning: "I want to do [verb].",
    pattern: [
      { text: "N", color: "noun1" },
      { text: " が ", romaji: "ga", color: "particle" },
      { text: "Verb-たい", romaji: "verb-tai", color: "verb" },
      { text: " です", romaji: "desu", color: "copula" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "Drop ます from a polite verb and add たい to express 'want to do X': たべます → たべたい (want to eat). The object often takes が (instead of を) when something is desired.",
    examples: [
      {
        english: "I want to eat sushi.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "すし", romaji: "sushi", color: "noun2" },
          { text: " が ", romaji: "ga", color: "particle" },
          { text: "たべたい", romaji: "tabetai", color: "verb" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "I want to go to Japan.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "にほん", romaji: "nihon", color: "noun2" },
          { text: " に ", romaji: "ni", color: "particle" },
          { text: "いきたい", romaji: "ikitai", color: "verb" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "8-2-kara-because",
    number: "8-2",
    title: "Sentence1、Sentence2 から。",
    meaning: "Sentence 2, because Sentence 1. (reason → result)",
    pattern: [
      { text: "Result", color: "noun1" },
      { text: "、", color: "neutral" },
      { text: "Reason", color: "noun2" },
      { text: " から", romaji: "kara", color: "particle" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "から (kara) at the end of a sentence means 'because [previous clause]'. Both clauses end normally in です/ます; から just attaches to the reason clause.",
    examples: [
      {
        english: "I won't go because it's cold today.",
        jp: [
          { text: "いきません", romaji: "ikimasen", color: "verb" },
          { text: "、", color: "neutral" },
          { text: "きょう", romaji: "kyou", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "さむい", romaji: "samui", color: "verb" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: " から", romaji: "kara", color: "particle" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "I'll drink water because it's hot.",
        jp: [
          { text: "みず", romaji: "mizu", color: "noun1" },
          { text: " を ", romaji: "wo", color: "particle" },
          { text: "のみます", romaji: "nomimasu", color: "verb" },
          { text: "、", color: "neutral" },
          { text: "あつい", romaji: "atsui", color: "verb" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: " から", romaji: "kara", color: "particle" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "8-3-mashou-lets",
    number: "8-3",
    title: "Verb-ましょう。",
    meaning: "Let's do [verb].",
    pattern: [
      { text: "Verb-ましょう", romaji: "verb-mashou", color: "verb" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "Swap the polite ます ending for ましょう to suggest doing something together: たべます → たべましょう (let's eat). Add か at the end (たべましょう か) to soften it into 'shall we eat?'.",
    examples: [
      {
        english: "Let's eat lunch together.",
        jp: [
          { text: "ひるごはん", romaji: "hirugohan", color: "noun1" },
          { text: " を ", romaji: "wo", color: "particle" },
          { text: "いっしょ に ", romaji: "issho ni", color: "particle" },
          { text: "たべましょう", romaji: "tabemashou", color: "verb" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "Shall we go to the park?",
        jp: [
          { text: "こうえん", romaji: "kouen", color: "noun1" },
          { text: " に ", romaji: "ni", color: "particle" },
          { text: "いきましょう", romaji: "ikimashou", color: "verb" },
          { text: " か", romaji: "ka", color: "question" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "8-4-te-kudasai",
    number: "8-4",
    title: "Verb-て ください。",
    meaning: "Please do [verb].",
    pattern: [
      { text: "Verb-て", romaji: "verb-te", color: "verb" },
      { text: " ください", romaji: "kudasai", color: "copula" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "The て-form of a verb + ください is a polite request: 'please do X'. Common te-forms: たべて (eat), みて (look), まって (wait), きいて (listen).",
    examples: [
      {
        english: "Please wait a minute.",
        jp: [
          { text: "ちょっと", romaji: "chotto", color: "noun1" },
          { text: " ", color: "neutral" },
          { text: "まって", romaji: "matte", color: "verb" },
          { text: " ください", romaji: "kudasai", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "Please look at this book.",
        jp: [
          { text: "この", romaji: "kono", color: "noun1" },
          { text: " ", color: "neutral" },
          { text: "ほん", romaji: "hon", color: "noun2" },
          { text: " を ", romaji: "wo", color: "particle" },
          { text: "みて", romaji: "mite", color: "verb" },
          { text: " ください", romaji: "kudasai", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "9-1-suki-desu",
    number: "9-1",
    title: "N が すき です。",
    meaning: "I like N.",
    pattern: [
      { text: "N", color: "noun1" },
      { text: " が ", romaji: "ga", color: "particle" },
      { text: "すき", romaji: "suki", color: "verb" },
      { text: " です", romaji: "desu", color: "copula" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "すき (like) is a na-adjective in Japanese. The thing you like is marked with が (ga), not を. Use きらい (dislike) the same way. Add だい- for emphasis: だいすき = love.",
    examples: [
      {
        english: "I like sushi.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "すし", romaji: "sushi", color: "noun2" },
          { text: " が ", romaji: "ga", color: "particle" },
          { text: "すき", romaji: "suki", color: "verb" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "I love Japan.",
        jp: [
          { text: "わたし", romaji: "watashi", color: "noun1" },
          { text: " は ", romaji: "wa", color: "particle" },
          { text: "にほん", romaji: "nihon", color: "noun2" },
          { text: " が ", romaji: "ga", color: "particle" },
          { text: "だいすき", romaji: "daisuki", color: "verb" },
          { text: " です", romaji: "desu", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
    ],
  },
  {
    slug: "9-2-counter-tsu",
    number: "9-2",
    title: "N を ＿つ ください。",
    meaning: "Please give me [number] of N.",
    pattern: [
      { text: "N", color: "noun1" },
      { text: " を ", romaji: "wo", color: "particle" },
      { text: "Counter", color: "noun2" },
      { text: " ください", romaji: "kudasai", color: "copula" },
      { text: "。", color: "neutral" },
    ],
    explanation:
      "The generic counter ～つ works for most concrete things: ひとつ (1), ふたつ (2), みっつ (3), よっつ (4), いつつ (5)… For specific objects use the dedicated counters: 〜まい (flat), 〜ほん (long), 〜にん (people).",
    examples: [
      {
        english: "Two coffees please.",
        jp: [
          { text: "コーヒー", romaji: "koohii", color: "noun1" },
          { text: " を ", romaji: "wo", color: "particle" },
          { text: "ふたつ", romaji: "futatsu", color: "noun2" },
          { text: " ください", romaji: "kudasai", color: "copula" },
          { text: "。", color: "neutral" },
        ],
      },
      {
        english: "Please give me three apples.",
        jp: [
          { text: "りんご", romaji: "ringo", color: "noun1" },
          { text: " を ", romaji: "wo", color: "particle" },
          { text: "みっつ", romaji: "mittsu", color: "noun2" },
          { text: " ください", romaji: "kudasai", color: "copula" },
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
