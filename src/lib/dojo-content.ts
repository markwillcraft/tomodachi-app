// =====================================================================
// Dojo lesson content — pedagogical payload
// ---------------------------------------------------------------------
// `src/lib/dojo.ts` defines the *catalog* (path/lesson metadata, status,
// section counts). This file holds the *content* — the actual grammar
// points, vocab items, and listening prompts a learner drills against.
//
// Why split? The catalog is consumed by every Dojo screen (path picker,
// lesson grid, breadcrumbs). The content is only needed by the drill
// route + the lesson detail. Keeping them separate means the catalog
// stays tiny and serialisable while the content can grow without
// bloating shared bundles.
//
// Coverage status (Phase 2c):
//   * n5-l1 … n5-l12  → full content (grammar + vocab + listening)
//   * n4-l13 … n4-l23 → coming-soon stubs (entire path locked)
//
// Adding a new lesson is *only* an entry in `LESSON_CONTENT` here; the
// rest of the Dojo flow (drill UI, progress, achievements, mastery)
// reads from these maps and lights up automatically.
// =====================================================================

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

export type DrillQuestion = {
  /** Stable id, scoped to lesson + section + index. */
  id: string
  prompt: string
  /** Always 4 choices; `correctIndex` ∈ {0,1,2,3}. */
  choices: readonly string[]
  correctIndex: number
  /** Optional one-liner shown after the user answers — the *why*. */
  explanation?: string
}

export type GrammarPoint = {
  id: string
  /** Romaji or hybrid pattern, e.g. "X は Y です". */
  pattern: string
  /** Plain-English title, e.g. "Stating who/what something is". */
  title: string
  /** Friendly prose explanation, 1–3 short paragraphs. */
  explanation: string
  /** 2–4 example sentences so the pattern lands before drilling. */
  examples: ReadonlyArray<{ jp: string; romaji: string; en: string }>
  /** Multiple-choice questions for the grammar drill. The drill
   *  engine pools these across all of the lesson's grammar points
   *  and shuffles. */
  drills: readonly DrillQuestion[]
}

export type VocabItem = {
  id: string
  kana: string
  /** Optional kanji rendering. Undefined for kana-only words
   *  (greetings, particles) or words Genki introduces in kana. */
  kanji?: string
  romaji: string
  english: string
  partOfSpeech:
    | "noun"
    | "verb"
    | "adjective"
    | "adverb"
    | "particle"
    | "pronoun"
    | "expression"
    | "number"
}

export type ListeningPrompt = {
  id: string
  /** Japanese line(s) the user listens to. Played via SpeechSynthesis. */
  jp: string
  romaji: string
  english: string
  /** Comprehension check shown after playback. */
  question: DrillQuestion
}

export type LessonContent = {
  lessonId: string
  /** Short blurb shown above the grammar section in the lesson detail. */
  intro: string
  grammar: readonly GrammarPoint[]
  vocab: readonly VocabItem[]
  listening: readonly ListeningPrompt[]
}

// ---------------------------------------------------------------------
// Lesson 1 — New Friends (Atarashii Tomodachi)
// ---------------------------------------------------------------------

const N5_L1: LessonContent = {
  lessonId: "n5-l1",
  intro:
    "Your first dojo session covers self-introduction. By the end you'll be able to greet someone, say who you are, ask their name, and answer a simple yes/no question.",
  grammar: [
    {
      id: "n5-l1-g1",
      pattern: "X は Y です",
      title: "Stating who or what someone is",
      explanation:
        "The basic Japanese sentence is 'X は Y です' — 'X is Y'. は (pronounced *wa* when used as a particle) marks the topic, and です (*desu*) is a polite copula that covers 'is / am / are'. Word order is the opposite of English: subject first, the verb-ish part last.",
      examples: [
        { jp: "私は学生です。", romaji: "Watashi wa gakusei desu.", en: "I am a student." },
        { jp: "アンナさんは日本人です。", romaji: "Anna-san wa nihonjin desu.", en: "Anna is Japanese." },
        { jp: "田中さんは先生です。", romaji: "Tanaka-san wa sensei desu.", en: "Tanaka is a teacher." },
      ],
      drills: [
        {
          id: "n5-l1-g1-d1",
          prompt: "Pick the correct translation of 'I am a student.'",
          choices: [
            "私は学生です。",
            "学生は私です。",
            "私は先生です。",
            "私が学生です。",
          ],
          correctIndex: 0,
          explanation: "Topic comes first (私), then the description (学生です). は marks the topic.",
        },
        {
          id: "n5-l1-g1-d2",
          prompt: "What does は do in 田中さんは先生です？",
          choices: [
            "Marks the topic of the sentence",
            "Marks the object of an action",
            "Means 'or'",
            "Asks a question",
          ],
          correctIndex: 0,
          explanation: "は (pronounced 'wa' here) is the topic particle — it tells the listener what the sentence is about.",
        },
        {
          id: "n5-l1-g1-d3",
          prompt: "Translate: 'Anna is Japanese.'",
          choices: [
            "アンナさんは日本人です。",
            "アンナさんは日本です。",
            "日本人はアンナさんです。",
            "アンナさんが日本人です。",
          ],
          correctIndex: 0,
          explanation: "日本人 = 'Japanese person'. 日本 alone means the country, not nationality.",
        },
      ],
    },
    {
      id: "n5-l1-g2",
      pattern: "X は Y ですか",
      title: "Yes/no questions with か",
      explanation:
        "Japanese turns any sentence into a question by adding か (*ka*) to the end — no inversion, no extra 'do you'. The expected answers are はい (*hai*, yes) or いいえ (*iie*, no). In casual speech you can drop か and just rely on rising intonation.",
      examples: [
        { jp: "学生ですか。", romaji: "Gakusei desu ka?", en: "Are you a student?" },
        { jp: "アンナさんは日本人ですか。", romaji: "Anna-san wa nihonjin desu ka?", en: "Is Anna Japanese?" },
        { jp: "はい、そうです。", romaji: "Hai, sou desu.", en: "Yes, that's right." },
      ],
      drills: [
        {
          id: "n5-l1-g2-d1",
          prompt: "How do you turn 学生です into a question?",
          choices: ["学生ですか。", "学生でしたか。", "は学生です。", "が学生です。"],
          correctIndex: 0,
          explanation: "Add か to the end. Nothing else changes.",
        },
        {
          id: "n5-l1-g2-d2",
          prompt: "Best answer to '日本人ですか。' if you are Japanese:",
          choices: [
            "はい、日本人です。",
            "いいえ、日本人です。",
            "はい、学生です。",
            "そうですか。",
          ],
          correctIndex: 0,
          explanation: "はい = yes, then restate the affirmation.",
        },
        {
          id: "n5-l1-g2-d3",
          prompt: "Translate: 'Is Tanaka a teacher?'",
          choices: [
            "田中さんは先生ですか。",
            "田中さんは先生です。",
            "先生は田中さんですか。",
            "田中さんが先生か。",
          ],
          correctIndex: 0,
          explanation: "Topic + description + か.",
        },
      ],
    },
    {
      id: "n5-l1-g3",
      pattern: "X の Y",
      title: "の — possessive / linker",
      explanation:
        "の (*no*) glues two nouns together. The most common use is possession: '私の本' = 'my book' (literally 'I-of-book'). It also links any noun to a more specific one: '日本語の先生' = 'a teacher of Japanese'. The order is always owner-の-thing.",
      examples: [
        { jp: "私の友達です。", romaji: "Watashi no tomodachi desu.", en: "(They) are my friend." },
        { jp: "アンナさんの本です。", romaji: "Anna-san no hon desu.", en: "It's Anna's book." },
        { jp: "日本語の先生です。", romaji: "Nihongo no sensei desu.", en: "(They) are a Japanese-language teacher." },
      ],
      drills: [
        {
          id: "n5-l1-g3-d1",
          prompt: "How do you say 'my book'?",
          choices: ["私の本", "本の私", "私は本", "私が本"],
          correctIndex: 0,
          explanation: "Owner first, then の, then the thing owned.",
        },
        {
          id: "n5-l1-g3-d2",
          prompt: "What does '日本語の先生' mean?",
          choices: [
            "A teacher of Japanese",
            "A Japanese (nationality) teacher",
            "Japanese is the teacher",
            "The teacher's Japanese",
          ],
          correctIndex: 0,
          explanation: "の links 日本語 (Japanese language) to 先生 (teacher) — what *kind* of teacher.",
        },
        {
          id: "n5-l1-g3-d3",
          prompt: "Translate: 'It is Anna's book.'",
          choices: [
            "アンナさんの本です。",
            "本のアンナさんです。",
            "アンナさんは本です。",
            "アンナさんが本です。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l1-g4",
      pattern: "Numbers and 〜さい (age)",
      title: "Counting people and stating age",
      explanation:
        "To ask someone's age use 何歳ですか (*nan-sai desu ka*). To answer, take the number and add 〜歳 (*sai*). A few readings change shape: 1=いっさい, 8=はっさい, 10=じゅっさい, and the special form 二十歳=はたち for twenty.",
      examples: [
        { jp: "何歳ですか。", romaji: "Nan-sai desu ka?", en: "How old are you?" },
        { jp: "二十歳です。", romaji: "Hatachi desu.", en: "I'm twenty." },
        { jp: "十九歳です。", romaji: "Juukyuu-sai desu.", en: "I'm nineteen." },
      ],
      drills: [
        {
          id: "n5-l1-g4-d1",
          prompt: "How do you ask someone's age politely?",
          choices: ["何歳ですか。", "誰ですか。", "何ですか。", "どこですか。"],
          correctIndex: 0,
        },
        {
          id: "n5-l1-g4-d2",
          prompt: "How do you say 'I'm twenty years old'?",
          choices: ["二十歳です。", "二十さいです。", "二十年です。", "二十歳ますか。"],
          correctIndex: 0,
          explanation: "20 takes the special reading 'はたち'.",
        },
        {
          id: "n5-l1-g4-d3",
          prompt: "Which reading is correct for 1歳?",
          choices: ["いっさい", "いちさい", "ひとさい", "いっとし"],
          correctIndex: 0,
          explanation: "1, 8, and 10 take a small っ before さい.",
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l1-v1", kana: "わたし", kanji: "私", romaji: "watashi", english: "I, me", partOfSpeech: "pronoun" },
    { id: "n5-l1-v2", kana: "あなた", romaji: "anata", english: "you", partOfSpeech: "pronoun" },
    { id: "n5-l1-v3", kana: "あのひと", kanji: "あの人", romaji: "ano hito", english: "that person", partOfSpeech: "pronoun" },
    { id: "n5-l1-v4", kana: "がくせい", kanji: "学生", romaji: "gakusei", english: "student", partOfSpeech: "noun" },
    { id: "n5-l1-v5", kana: "せんせい", kanji: "先生", romaji: "sensei", english: "teacher", partOfSpeech: "noun" },
    { id: "n5-l1-v6", kana: "ともだち", kanji: "友達", romaji: "tomodachi", english: "friend", partOfSpeech: "noun" },
    { id: "n5-l1-v7", kana: "にほんじん", kanji: "日本人", romaji: "nihonjin", english: "Japanese person", partOfSpeech: "noun" },
    { id: "n5-l1-v8", kana: "アメリカじん", kanji: "アメリカ人", romaji: "amerikajin", english: "American", partOfSpeech: "noun" },
    { id: "n5-l1-v9", kana: "だいがく", kanji: "大学", romaji: "daigaku", english: "university", partOfSpeech: "noun" },
    { id: "n5-l1-v10", kana: "こうこう", kanji: "高校", romaji: "koukou", english: "high school", partOfSpeech: "noun" },
    { id: "n5-l1-v11", kana: "なん", kanji: "何", romaji: "nan", english: "what", partOfSpeech: "pronoun" },
    { id: "n5-l1-v12", kana: "だれ", kanji: "誰", romaji: "dare", english: "who", partOfSpeech: "pronoun" },
    { id: "n5-l1-v13", kana: "なんさい", kanji: "何歳", romaji: "nansai", english: "how old", partOfSpeech: "expression" },
    { id: "n5-l1-v14", kana: "はい", romaji: "hai", english: "yes", partOfSpeech: "expression" },
    { id: "n5-l1-v15", kana: "いいえ", romaji: "iie", english: "no", partOfSpeech: "expression" },
    { id: "n5-l1-v16", kana: "はじめまして", romaji: "hajimemashite", english: "nice to meet you (first time)", partOfSpeech: "expression" },
    { id: "n5-l1-v17", kana: "よろしくおねがいします", romaji: "yoroshiku onegaishimasu", english: "please be kind to me", partOfSpeech: "expression" },
    { id: "n5-l1-v18", kana: "おはようございます", romaji: "ohayou gozaimasu", english: "good morning (polite)", partOfSpeech: "expression" },
    { id: "n5-l1-v19", kana: "こんにちは", romaji: "konnichiwa", english: "hello / good afternoon", partOfSpeech: "expression" },
    { id: "n5-l1-v20", kana: "さようなら", romaji: "sayounara", english: "goodbye", partOfSpeech: "expression" },
  ],
  listening: [
    {
      id: "n5-l1-li1",
      jp: "はじめまして。アンナです。よろしくおねがいします。",
      romaji: "Hajimemashite. Anna desu. Yoroshiku onegaishimasu.",
      english: "Nice to meet you. I'm Anna. Please be kind to me.",
      question: {
        id: "n5-l1-li1-q",
        prompt: "What is the speaker's name?",
        choices: ["Anna", "Tanaka", "Suzuki", "Yuki"],
        correctIndex: 0,
        explanation: "She says 'アンナです' — 'I'm Anna'.",
      },
    },
    {
      id: "n5-l1-li2",
      jp: "田中さんは先生ですか。 はい、そうです。",
      romaji: "Tanaka-san wa sensei desu ka. Hai, sou desu.",
      english: "Is Tanaka a teacher? Yes, that's right.",
      question: {
        id: "n5-l1-li2-q",
        prompt: "Is Tanaka a teacher?",
        choices: ["Yes", "No", "Not stated", "She's a student"],
        correctIndex: 0,
        explanation: "The reply 'はい、そうです' = 'yes, that's right'.",
      },
    },
    {
      id: "n5-l1-li3",
      jp: "あの人は誰ですか。 アンナさんです。私の友達です。",
      romaji: "Ano hito wa dare desu ka. Anna-san desu. Watashi no tomodachi desu.",
      english: "Who is that person? It's Anna. She's my friend.",
      question: {
        id: "n5-l1-li3-q",
        prompt: "What is Anna to the speaker?",
        choices: ["A friend", "A teacher", "A sister", "A classmate"],
        correctIndex: 0,
        explanation: "私の友達です = 'is my friend'.",
      },
    },
    {
      id: "n5-l1-li4",
      jp: "何歳ですか。 二十歳です。",
      romaji: "Nan-sai desu ka. Hatachi desu.",
      english: "How old are you? I'm twenty.",
      question: {
        id: "n5-l1-li4-q",
        prompt: "How old is the speaker?",
        choices: ["20", "10", "12", "22"],
        correctIndex: 0,
        explanation: "二十歳 (はたち) is the special reading for 'twenty years old'.",
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson 2 — Shopping (Kaimono)
// ---------------------------------------------------------------------

const N5_L2: LessonContent = {
  lessonId: "n5-l2",
  intro:
    "Time to leave the classroom and buy something. Lesson 2 introduces the これ/それ/あれ family for pointing at objects, plus the question 'いくらですか' so you can actually pay for them.",
  grammar: [
    {
      id: "n5-l2-g1",
      pattern: "これ・それ・あれ",
      title: "This / that / that-over-there",
      explanation:
        "Japanese has a three-way distance system instead of English's two. これ (*kore*) = something close to *me*. それ (*sore*) = close to *you* (the listener). あれ (*are*) = away from both of us. They stand alone as nouns: これは本です (*This is a book.*).",
      examples: [
        { jp: "これは本です。", romaji: "Kore wa hon desu.", en: "This (near me) is a book." },
        { jp: "それはペンですか。", romaji: "Sore wa pen desu ka?", en: "Is that (near you) a pen?" },
        { jp: "あれは時計です。", romaji: "Are wa tokei desu.", en: "That over there is a clock." },
      ],
      drills: [
        {
          id: "n5-l2-g1-d1",
          prompt: "You're holding a book. How do you say 'this is a book'?",
          choices: ["これは本です。", "それは本です。", "あれは本です。", "どれは本ですか。"],
          correctIndex: 0,
          explanation: "An object near you uses これ.",
        },
        {
          id: "n5-l2-g1-d2",
          prompt: "Your friend across the room is holding a magazine. What word do you use?",
          choices: ["それ", "これ", "あれ", "どれ"],
          correctIndex: 0,
          explanation: "Near the *listener* uses それ.",
        },
        {
          id: "n5-l2-g1-d3",
          prompt: "A mountain is visible far away from both of you. What word fits?",
          choices: ["あれ", "それ", "これ", "どこ"],
          correctIndex: 0,
          explanation: "Far from both speakers uses あれ.",
        },
      ],
    },
    {
      id: "n5-l2-g2",
      pattern: "この / その / あの + Noun",
      title: "Pointing while saying which thing",
      explanation:
        "Where これ/それ/あれ stand alone, この/その/あの are *attached* to a noun. この本 = 'this book', あの人 = 'that person over there'. They are NOT interchangeable: you can't say 'これ本' — that's a grammar error.",
      examples: [
        { jp: "この本は私のです。", romaji: "Kono hon wa watashi no desu.", en: "This book is mine." },
        { jp: "そのペンはいくらですか。", romaji: "Sono pen wa ikura desu ka?", en: "How much is that pen?" },
        { jp: "あの人は誰ですか。", romaji: "Ano hito wa dare desu ka?", en: "Who is that person over there?" },
      ],
      drills: [
        {
          id: "n5-l2-g2-d1",
          prompt: "Translate: 'this book'.",
          choices: ["この本", "これ本", "それ本", "この人"],
          correctIndex: 0,
          explanation: "When attached to a noun, use この (not これ).",
        },
        {
          id: "n5-l2-g2-d2",
          prompt: "Which is grammatical?",
          choices: ["あの人は誰ですか。", "あれ人は誰ですか。", "あれの人は誰ですか。", "あれ誰ですか人。"],
          correctIndex: 0,
          explanation: "あの + noun is the rule.",
        },
        {
          id: "n5-l2-g2-d3",
          prompt: "Translate: 'How much is that pen (near you)?'",
          choices: [
            "そのペンはいくらですか。",
            "このペンはいくらですか。",
            "あのペンはいくらですか。",
            "それペンはいくらですか。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l2-g3",
      pattern: "ここ・そこ・あそこ",
      title: "Here, there, over there (locations)",
      explanation:
        "The same kosoado pattern, but for *places*: ここ (here, by me), そこ (there, by you), あそこ (over there). Use them with です to identify places: 'トイレはどこですか — トイレはあそこです。' ('Where is the bathroom?' — 'It's over there.')",
      examples: [
        { jp: "トイレはあそこです。", romaji: "Toire wa asoko desu.", en: "The bathroom is over there." },
        { jp: "ここは大学です。", romaji: "Koko wa daigaku desu.", en: "This place is a university." },
        { jp: "本はどこですか。", romaji: "Hon wa doko desu ka?", en: "Where is the book?" },
      ],
      drills: [
        {
          id: "n5-l2-g3-d1",
          prompt: "Which word means 'over there (far from us both)'?",
          choices: ["あそこ", "そこ", "ここ", "どこ"],
          correctIndex: 0,
        },
        {
          id: "n5-l2-g3-d2",
          prompt: "Translate: 'Where is the book?'",
          choices: [
            "本はどこですか。",
            "本はあそこですか。",
            "本はここです。",
            "どこは本ですか。",
          ],
          correctIndex: 0,
          explanation: "どこ = where. Topic-marked subject + どこですか.",
        },
        {
          id: "n5-l2-g3-d3",
          prompt: "If a friend asks where you are and you're at a café, you can say:",
          choices: [
            "ここは喫茶店です。",
            "あそこは喫茶店です。",
            "そこは喫茶店です。",
            "どこは喫茶店です。",
          ],
          correctIndex: 0,
          explanation: "ここ = where you are right now.",
        },
      ],
    },
    {
      id: "n5-l2-g4",
      pattern: "X の (standalone)",
      title: "の as 'one' — dropping the noun",
      explanation:
        "When context is clear you can drop the second noun and let の stand alone. 'このペンは私のです' means 'This pen is mine' — の replaces the repeated word ペン. This is just like English 'mine / yours' instead of 'my pen / your pen'.",
      examples: [
        { jp: "このペンは私のです。", romaji: "Kono pen wa watashi no desu.", en: "This pen is mine." },
        { jp: "その本はアンナさんのです。", romaji: "Sono hon wa Anna-san no desu.", en: "That book is Anna's." },
        { jp: "あのかばんは誰のですか。", romaji: "Ano kaban wa dare no desu ka?", en: "Whose bag is that over there?" },
      ],
      drills: [
        {
          id: "n5-l2-g4-d1",
          prompt: "Translate: 'This pen is mine.'",
          choices: [
            "このペンは私のです。",
            "このペンは私です。",
            "私はこのペンです。",
            "このペンの私です。",
          ],
          correctIndex: 0,
          explanation: "私の (mine) standing alone, no second 'pen' needed.",
        },
        {
          id: "n5-l2-g4-d2",
          prompt: "What does '誰の' mean?",
          choices: ["whose", "who", "where", "which one"],
          correctIndex: 0,
        },
        {
          id: "n5-l2-g4-d3",
          prompt: "Translate: 'That book is Anna's.'",
          choices: [
            "その本はアンナさんのです。",
            "その本はアンナさんです。",
            "その本のアンナさんです。",
            "アンナさんのその本です。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l2-g5",
      pattern: "いくらですか / X 円",
      title: "Asking and stating prices",
      explanation:
        "いくら (*ikura*) = 'how much (money)'. Prices are stated in 円 (*en*, yen). Read multi-digit numbers in compounds: 三百 (300), 千 (1,000), 一万 (10,000). 100 = ひゃく, 1,000 = せん, 10,000 = まん.",
      examples: [
        { jp: "これはいくらですか。", romaji: "Kore wa ikura desu ka?", en: "How much is this?" },
        { jp: "三百円です。", romaji: "Sanbyaku-en desu.", en: "It's 300 yen." },
        { jp: "高いですね。", romaji: "Takai desu ne.", en: "That's expensive, huh?" },
      ],
      drills: [
        {
          id: "n5-l2-g5-d1",
          prompt: "How do you ask 'How much is this?'",
          choices: [
            "これはいくらですか。",
            "これは何ですか。",
            "これはどこですか。",
            "これは誰ですか。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l2-g5-d2",
          prompt: "Pick the reading for 三百円.",
          choices: ["さんびゃくえん", "さんひゃくえん", "さんぴゃくえん", "さんびゃくいぇん"],
          correctIndex: 0,
          explanation: "ひゃく rendaku-shifts to びゃく after 三.",
        },
        {
          id: "n5-l2-g5-d3",
          prompt: "Which means 'It's 1,000 yen'?",
          choices: ["千円です。", "百円です。", "万円です。", "十円です。"],
          correctIndex: 0,
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l2-v1", kana: "ペン", romaji: "pen", english: "pen", partOfSpeech: "noun" },
    { id: "n5-l2-v2", kana: "えんぴつ", kanji: "鉛筆", romaji: "enpitsu", english: "pencil", partOfSpeech: "noun" },
    { id: "n5-l2-v3", kana: "ノート", romaji: "nooto", english: "notebook", partOfSpeech: "noun" },
    { id: "n5-l2-v4", kana: "ほん", kanji: "本", romaji: "hon", english: "book", partOfSpeech: "noun" },
    { id: "n5-l2-v5", kana: "ざっし", kanji: "雑誌", romaji: "zasshi", english: "magazine", partOfSpeech: "noun" },
    { id: "n5-l2-v6", kana: "しんぶん", kanji: "新聞", romaji: "shinbun", english: "newspaper", partOfSpeech: "noun" },
    { id: "n5-l2-v7", kana: "かばん", romaji: "kaban", english: "bag", partOfSpeech: "noun" },
    { id: "n5-l2-v8", kana: "かさ", kanji: "傘", romaji: "kasa", english: "umbrella", partOfSpeech: "noun" },
    { id: "n5-l2-v9", kana: "とけい", kanji: "時計", romaji: "tokei", english: "watch, clock", partOfSpeech: "noun" },
    { id: "n5-l2-v10", kana: "くつ", kanji: "靴", romaji: "kutsu", english: "shoes", partOfSpeech: "noun" },
    { id: "n5-l2-v11", kana: "カメラ", romaji: "kamera", english: "camera", partOfSpeech: "noun" },
    { id: "n5-l2-v12", kana: "じてんしゃ", kanji: "自転車", romaji: "jitensha", english: "bicycle", partOfSpeech: "noun" },
    { id: "n5-l2-v13", kana: "くるま", kanji: "車", romaji: "kuruma", english: "car", partOfSpeech: "noun" },
    { id: "n5-l2-v14", kana: "コーヒー", romaji: "koohii", english: "coffee", partOfSpeech: "noun" },
    { id: "n5-l2-v15", kana: "おちゃ", kanji: "お茶", romaji: "ocha", english: "tea", partOfSpeech: "noun" },
    { id: "n5-l2-v16", kana: "みず", kanji: "水", romaji: "mizu", english: "water", partOfSpeech: "noun" },
    { id: "n5-l2-v17", kana: "いくら", romaji: "ikura", english: "how much (money)", partOfSpeech: "expression" },
    { id: "n5-l2-v18", kana: "えん", kanji: "円", romaji: "en", english: "yen", partOfSpeech: "noun" },
    { id: "n5-l2-v19", kana: "やすい", kanji: "安い", romaji: "yasui", english: "cheap, inexpensive", partOfSpeech: "adjective" },
    { id: "n5-l2-v20", kana: "たかい", kanji: "高い", romaji: "takai", english: "expensive, high", partOfSpeech: "adjective" },
  ],
  listening: [
    {
      id: "n5-l2-li1",
      jp: "すみません、これはいくらですか。 三百円です。",
      romaji: "Sumimasen, kore wa ikura desu ka. Sanbyaku-en desu.",
      english: "Excuse me, how much is this? It's 300 yen.",
      question: {
        id: "n5-l2-li1-q",
        prompt: "How much does the item cost?",
        choices: ["300 yen", "30 yen", "3,000 yen", "13 yen"],
        correctIndex: 0,
        explanation: "三百 (sanbyaku) = 300.",
      },
    },
    {
      id: "n5-l2-li2",
      jp: "そのかばんは誰のですか。 アンナさんのです。",
      romaji: "Sono kaban wa dare no desu ka. Anna-san no desu.",
      english: "Whose bag is that? It's Anna's.",
      question: {
        id: "n5-l2-li2-q",
        prompt: "Whose bag is it?",
        choices: ["Anna's", "Tanaka's", "Suzuki's", "Mine"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l2-li3",
      jp: "あの本はいくらですか。 千円です。",
      romaji: "Ano hon wa ikura desu ka. Sen-en desu.",
      english: "How much is that book over there? It's 1,000 yen.",
      question: {
        id: "n5-l2-li3-q",
        prompt: "How much is the book?",
        choices: ["1,000 yen", "100 yen", "10,000 yen", "10 yen"],
        correctIndex: 0,
        explanation: "千 (sen) = 1,000.",
      },
    },
    {
      id: "n5-l2-li4",
      jp: "コーヒー、おねがいします。 二百五十円です。",
      romaji: "Koohii, onegaishimasu. Nihyaku-gojuu-en desu.",
      english: "Coffee, please. That'll be 250 yen.",
      question: {
        id: "n5-l2-li4-q",
        prompt: "What did the customer order, and how much was it?",
        choices: [
          "Coffee, 250 yen",
          "Tea, 250 yen",
          "Coffee, 200 yen",
          "Water, 250 yen",
        ],
        correctIndex: 0,
        explanation: "コーヒー = coffee. 二百五十 = 200 + 50 = 250.",
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson 3 — Making a Date (Deeto no Yakusoku)
// ---------------------------------------------------------------------

const N5_L3: LessonContent = {
  lessonId: "n5-l3",
  intro:
    "Lesson 3 unlocks verbs. You'll learn the polite -masu form (the conjugation every Japanese textbook starts with), three core particles (を, で, に), and how to invite someone out using -masen ka.",
  grammar: [
    {
      id: "n5-l3-g1",
      pattern: "Verb + ます / ません",
      title: "Polite present and negative",
      explanation:
        "The dictionary form of verbs (飲む, 食べる, する) gets reshaped into the polite -ます form for everyday speech. Affirmative ends in -ます (*-masu*), negative in -ません (*-masen*). Both are present/future — context decides which.",
      examples: [
        { jp: "コーヒーを飲みます。", romaji: "Koohii o nomimasu.", en: "I drink coffee. / I will drink coffee." },
        { jp: "肉を食べません。", romaji: "Niku o tabemasen.", en: "I don't eat meat." },
        { jp: "毎日勉強します。", romaji: "Mainichi benkyou shimasu.", en: "I study every day." },
      ],
      drills: [
        {
          id: "n5-l3-g1-d1",
          prompt: "Which form is the polite negative of 食べる (to eat)?",
          choices: ["食べません", "食べました", "食べないです", "食べる"],
          correctIndex: 0,
          explanation: "Polite negative is -ません.",
        },
        {
          id: "n5-l3-g1-d2",
          prompt: "Translate: 'I drink coffee every day.'",
          choices: [
            "毎日コーヒーを飲みます。",
            "毎日コーヒーは飲みます。",
            "コーヒーは毎日飲ません。",
            "毎日コーヒーが飲みました。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l3-g1-d3",
          prompt: "What does 食べません mean?",
          choices: [
            "(I) don't eat / (I) won't eat",
            "(I) ate",
            "(I) am eating",
            "(I) want to eat",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l3-g2",
      pattern: "Verb + ましょう / ませんか",
      title: "Suggestions and invitations",
      explanation:
        "-ましょう (*-mashou*) means 'let's…' and is used when you assume the other person will agree. -ませんか (*-masen ka*) is the softer 'won't you / wouldn't you like to…?' — perfect for inviting someone out without sounding pushy.",
      examples: [
        { jp: "コーヒーを飲みませんか。", romaji: "Koohii o nomimasen ka?", en: "Won't you have some coffee (with me)?" },
        { jp: "映画を見ましょう。", romaji: "Eiga o mimashou.", en: "Let's watch a movie." },
        { jp: "明日喫茶店に行きませんか。", romaji: "Ashita kissaten ni ikimasen ka?", en: "Want to go to a café tomorrow?" },
      ],
      drills: [
        {
          id: "n5-l3-g2-d1",
          prompt: "Which form best invites someone politely?",
          choices: ["飲みませんか", "飲みません", "飲みます", "飲みましょう"],
          correctIndex: 0,
          explanation: "-ませんか is the softest invitation.",
        },
        {
          id: "n5-l3-g2-d2",
          prompt: "What does 'コーヒーを飲みましょう。' mean?",
          choices: [
            "Let's drink coffee.",
            "I drink coffee.",
            "Won't you have coffee?",
            "I don't drink coffee.",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l3-g2-d3",
          prompt: "Translate: 'Want to watch a movie tomorrow?'",
          choices: [
            "明日映画を見ませんか。",
            "明日映画を見ましょう。",
            "明日映画を見ました。",
            "明日映画は見ません。",
          ],
          correctIndex: 0,
          explanation: "-ませんか is the polite invitation form.",
        },
      ],
    },
    {
      id: "n5-l3-g3",
      pattern: "Noun を Verb",
      title: "を — the direct object particle",
      explanation:
        "を (written 'wo' but pronounced 'o') marks the *direct object* — the thing the verb acts on. 'コーヒーを飲みます' = 'I drink coffee'. It always sits between the object and the verb, never before the subject.",
      examples: [
        { jp: "本を読みます。", romaji: "Hon o yomimasu.", en: "I read a book." },
        { jp: "新聞を読みません。", romaji: "Shinbun o yomimasen.", en: "I don't read the newspaper." },
        { jp: "テレビを見ます。", romaji: "Terebi o mimasu.", en: "I watch TV." },
      ],
      drills: [
        {
          id: "n5-l3-g3-d1",
          prompt: "Which particle marks the direct object?",
          choices: ["を", "は", "に", "で"],
          correctIndex: 0,
        },
        {
          id: "n5-l3-g3-d2",
          prompt: "Translate: 'I read a book.'",
          choices: [
            "本を読みます。",
            "本は読みます。",
            "本に読みます。",
            "本で読みます。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l3-g3-d3",
          prompt: "Pick the grammatical sentence.",
          choices: [
            "コーヒーを飲みます。",
            "コーヒーで飲みます。",
            "を飲みますコーヒー。",
            "コーヒー飲みますを。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l3-g4",
      pattern: "Place で Verb",
      title: "で — where an action happens",
      explanation:
        "で marks the *location of an action*. '喫茶店でコーヒーを飲みます' = 'I drink coffee at a café'. Don't confuse it with に, which marks destinations or specific points in time.",
      examples: [
        { jp: "喫茶店でコーヒーを飲みます。", romaji: "Kissaten de koohii o nomimasu.", en: "I drink coffee at a café." },
        { jp: "学校で勉強します。", romaji: "Gakkou de benkyou shimasu.", en: "I study at school." },
        { jp: "家でテレビを見ます。", romaji: "Ie de terebi o mimasu.", en: "I watch TV at home." },
      ],
      drills: [
        {
          id: "n5-l3-g4-d1",
          prompt: "Which particle marks where an action takes place?",
          choices: ["で", "を", "に", "は"],
          correctIndex: 0,
        },
        {
          id: "n5-l3-g4-d2",
          prompt: "Translate: 'I study at school.'",
          choices: [
            "学校で勉強します。",
            "学校に勉強します。",
            "学校を勉強します。",
            "学校は勉強します。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l3-g4-d3",
          prompt: "Pick the most natural sentence.",
          choices: [
            "家でテレビを見ます。",
            "家にテレビを見ます。",
            "家をテレビで見ます。",
            "テレビは家を見ます。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l3-g5",
      pattern: "Time に Verb",
      title: "に — specific points in time",
      explanation:
        "に marks a *specific time*: clock times (七時に, 'at 7'), days, dates. Rule of thumb: if the time has a number in it, attach に. Words like 今日 (today), 明日 (tomorrow), and 毎日 (every day) usually take *no* particle.",
      examples: [
        { jp: "七時に起きます。", romaji: "Shichi-ji ni okimasu.", en: "I get up at 7 o'clock." },
        { jp: "日曜日に喫茶店に行きます。", romaji: "Nichiyoubi ni kissaten ni ikimasu.", en: "I'll go to a café on Sunday." },
        { jp: "明日コーヒーを飲みませんか。", romaji: "Ashita koohii o nomimasen ka?", en: "Want to have coffee tomorrow?" },
      ],
      drills: [
        {
          id: "n5-l3-g5-d1",
          prompt: "Which sentence is correct?",
          choices: [
            "七時に起きます。",
            "七時で起きます。",
            "七時を起きます。",
            "七時は起きます。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l3-g5-d2",
          prompt: "Which time word usually takes NO particle?",
          choices: ["明日", "七時", "日曜日", "三時"],
          correctIndex: 0,
          explanation: "Relative time words (today/tomorrow/every day) skip に.",
        },
        {
          id: "n5-l3-g5-d3",
          prompt: "Translate: 'I'll go to a café on Sunday.'",
          choices: [
            "日曜日に喫茶店に行きます。",
            "日曜日で喫茶店に行きます。",
            "日曜日を喫茶店に行きます。",
            "日曜日喫茶店行きます。",
          ],
          correctIndex: 0,
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l3-v1", kana: "のむ", kanji: "飲む", romaji: "nomu", english: "to drink", partOfSpeech: "verb" },
    { id: "n5-l3-v2", kana: "たべる", kanji: "食べる", romaji: "taberu", english: "to eat", partOfSpeech: "verb" },
    { id: "n5-l3-v3", kana: "みる", kanji: "見る", romaji: "miru", english: "to see, to watch", partOfSpeech: "verb" },
    { id: "n5-l3-v4", kana: "よむ", kanji: "読む", romaji: "yomu", english: "to read", partOfSpeech: "verb" },
    { id: "n5-l3-v5", kana: "かく", kanji: "書く", romaji: "kaku", english: "to write", partOfSpeech: "verb" },
    { id: "n5-l3-v6", kana: "いく", kanji: "行く", romaji: "iku", english: "to go", partOfSpeech: "verb" },
    { id: "n5-l3-v7", kana: "くる", kanji: "来る", romaji: "kuru", english: "to come", partOfSpeech: "verb" },
    { id: "n5-l3-v8", kana: "する", romaji: "suru", english: "to do", partOfSpeech: "verb" },
    { id: "n5-l3-v9", kana: "おきる", kanji: "起きる", romaji: "okiru", english: "to get up, to wake", partOfSpeech: "verb" },
    { id: "n5-l3-v10", kana: "ねる", kanji: "寝る", romaji: "neru", english: "to sleep, to go to bed", partOfSpeech: "verb" },
    { id: "n5-l3-v11", kana: "かえる", kanji: "帰る", romaji: "kaeru", english: "to go home, to return", partOfSpeech: "verb" },
    { id: "n5-l3-v12", kana: "きく", kanji: "聞く", romaji: "kiku", english: "to listen, to ask", partOfSpeech: "verb" },
    { id: "n5-l3-v13", kana: "はなす", kanji: "話す", romaji: "hanasu", english: "to speak, to talk", partOfSpeech: "verb" },
    { id: "n5-l3-v14", kana: "かう", kanji: "買う", romaji: "kau", english: "to buy", partOfSpeech: "verb" },
    { id: "n5-l3-v15", kana: "きょう", kanji: "今日", romaji: "kyou", english: "today", partOfSpeech: "noun" },
    { id: "n5-l3-v16", kana: "あした", kanji: "明日", romaji: "ashita", english: "tomorrow", partOfSpeech: "noun" },
    { id: "n5-l3-v17", kana: "まいにち", kanji: "毎日", romaji: "mainichi", english: "every day", partOfSpeech: "noun" },
    { id: "n5-l3-v18", kana: "なんじ", kanji: "何時", romaji: "nanji", english: "what time", partOfSpeech: "expression" },
    { id: "n5-l3-v19", kana: "いえ", kanji: "家", romaji: "ie", english: "home, house", partOfSpeech: "noun" },
    { id: "n5-l3-v20", kana: "がっこう", kanji: "学校", romaji: "gakkou", english: "school", partOfSpeech: "noun" },
    { id: "n5-l3-v21", kana: "かいしゃ", kanji: "会社", romaji: "kaisha", english: "company, workplace", partOfSpeech: "noun" },
    { id: "n5-l3-v22", kana: "きっさてん", kanji: "喫茶店", romaji: "kissaten", english: "café", partOfSpeech: "noun" },
  ],
  listening: [
    {
      id: "n5-l3-li1",
      jp: "明日喫茶店でコーヒーを飲みませんか。 はい、いいですね。",
      romaji: "Ashita kissaten de koohii o nomimasen ka. Hai, ii desu ne.",
      english: "Want to have coffee at a café tomorrow? Yes, sounds good.",
      question: {
        id: "n5-l3-li1-q",
        prompt: "What did the second speaker do?",
        choices: ["Accepted the invitation", "Refused", "Asked the time", "Suggested a different day"],
        correctIndex: 0,
        explanation: "'はい、いいですね' = 'yes, sounds good' — that's an acceptance.",
      },
    },
    {
      id: "n5-l3-li2",
      jp: "何時に起きますか。 七時に起きます。",
      romaji: "Nan-ji ni okimasu ka. Shichi-ji ni okimasu.",
      english: "What time do you get up? I get up at 7.",
      question: {
        id: "n5-l3-li2-q",
        prompt: "What time does the speaker get up?",
        choices: ["7:00", "1:00", "11:00", "7 in the evening"],
        correctIndex: 0,
        explanation: "七時 (shichi-ji) = 7 o'clock.",
      },
    },
    {
      id: "n5-l3-li3",
      jp: "毎日学校で勉強します。 そして、家でテレビを見ます。",
      romaji: "Mainichi gakkou de benkyou shimasu. Soshite, ie de terebi o mimasu.",
      english: "I study at school every day. And then, I watch TV at home.",
      question: {
        id: "n5-l3-li3-q",
        prompt: "Where does the speaker watch TV?",
        choices: ["At home", "At school", "At a café", "Not stated"],
        correctIndex: 0,
        explanation: "家で = at home (で marks where the action happens).",
      },
    },
    {
      id: "n5-l3-li4",
      jp: "日曜日に何をしますか。 友達と映画を見ます。",
      romaji: "Nichiyoubi ni nani o shimasu ka. Tomodachi to eiga o mimasu.",
      english: "What will you do on Sunday? I'll watch a movie with a friend.",
      question: {
        id: "n5-l3-li4-q",
        prompt: "What is the speaker doing on Sunday?",
        choices: [
          "Watching a movie with a friend",
          "Going to school",
          "Drinking coffee alone",
          "Sleeping all day",
        ],
        correctIndex: 0,
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson 4 — The First Date (Hatsu Deeto)
// ---------------------------------------------------------------------

const N5_L4: LessonContent = {
  lessonId: "n5-l4",
  intro:
    "Lesson 4 is your first taste of past tense. You'll learn to talk about what happened yesterday with -ました, where things and people are with あります / います, and how to describe location using particles like に and の前.",
  grammar: [
    {
      id: "n5-l4-g1",
      pattern: "Verb + ました / ませんでした",
      title: "Polite past tense",
      explanation:
        "Take any -ます verb and swap -ます for -ました (*-mashita*) to get the polite past affirmative. The negative is -ませんでした (*-masen deshita*) — yes, it's a mouthful, but it follows mechanically. No special endings, no helper verbs.",
      examples: [
        { jp: "昨日コーヒーを飲みました。", romaji: "Kinou koohii o nomimashita.", en: "I drank coffee yesterday." },
        { jp: "週末映画を見ました。", romaji: "Shuumatsu eiga o mimashita.", en: "I watched a movie on the weekend." },
        { jp: "肉を食べませんでした。", romaji: "Niku o tabemasen deshita.", en: "I didn't eat meat." },
      ],
      drills: [
        {
          id: "n5-l4-g1-d1",
          prompt: "Polite past of 食べます?",
          choices: ["食べました", "食べませんでした", "食べます", "食べる"],
          correctIndex: 0,
        },
        {
          id: "n5-l4-g1-d2",
          prompt: "Translate: 'I didn't drink coffee.'",
          choices: [
            "コーヒーを飲みませんでした。",
            "コーヒーを飲みました。",
            "コーヒーを飲みません。",
            "コーヒーを飲んだ。",
          ],
          correctIndex: 0,
          explanation: "-ませんでした is the polite past negative.",
        },
        {
          id: "n5-l4-g1-d3",
          prompt: "Which sentence is grammatical?",
          choices: [
            "昨日学校に行きました。",
            "昨日学校に行きます。",
            "昨日学校に行きませんでした行きます。",
            "昨日学校行きませんに。",
          ],
          correctIndex: 0,
          explanation: "Past actions take -ました, not -ます.",
        },
      ],
    },
    {
      id: "n5-l4-g2",
      pattern: "X が あります / います",
      title: "There is / there are",
      explanation:
        "Japanese has two existence verbs. あります (*arimasu*) is for inanimate things — books, buildings, abstract concepts. います (*imasu*) is for animate beings — people, animals, even fish. The thing that exists is marked with が, not は.",
      examples: [
        { jp: "机の上に本があります。", romaji: "Tsukue no ue ni hon ga arimasu.", en: "There is a book on the desk." },
        { jp: "公園に犬がいます。", romaji: "Kouen ni inu ga imasu.", en: "There is a dog in the park." },
        { jp: "アンナさんは図書館にいます。", romaji: "Anna-san wa toshokan ni imasu.", en: "Anna is at the library." },
      ],
      drills: [
        {
          id: "n5-l4-g2-d1",
          prompt: "Which verb describes a *person* existing somewhere?",
          choices: ["います", "あります", "です", "ます"],
          correctIndex: 0,
          explanation: "います = animate (people, animals). あります = inanimate.",
        },
        {
          id: "n5-l4-g2-d2",
          prompt: "Translate: 'There is a book on the desk.'",
          choices: [
            "机の上に本があります。",
            "机の上に本がいます。",
            "本は机の上にいます。",
            "机の上は本があります。",
          ],
          correctIndex: 0,
          explanation: "Books are inanimate — use あります.",
        },
        {
          id: "n5-l4-g2-d3",
          prompt: "Pick the natural sentence.",
          choices: [
            "公園に犬がいます。",
            "公園に犬があります。",
            "公園で犬がいます。",
            "公園を犬がいます。",
          ],
          correctIndex: 0,
          explanation: "に marks the location of existence; います for animate.",
        },
      ],
    },
    {
      id: "n5-l4-g3",
      pattern: "Position + の + 上/下/前/後/中…",
      title: "Locations with positional nouns",
      explanation:
        "Japanese describes positions using a noun + の + position word. 机の上 = 'on top of the desk', 学校の前 = 'in front of the school'. Common position words: 上 (above), 下 (below), 前 (front), 後ろ (behind), 中 (inside), 外 (outside), 横 / となり (next to).",
      examples: [
        { jp: "ねこは椅子の下にいます。", romaji: "Neko wa isu no shita ni imasu.", en: "The cat is under the chair." },
        { jp: "銀行は駅の前にあります。", romaji: "Ginkou wa eki no mae ni arimasu.", en: "The bank is in front of the station." },
        { jp: "本は鞄の中にあります。", romaji: "Hon wa kaban no naka ni arimasu.", en: "The book is inside the bag." },
      ],
      drills: [
        {
          id: "n5-l4-g3-d1",
          prompt: "What does 机の上 mean?",
          choices: ["on top of the desk", "under the desk", "next to the desk", "behind the desk"],
          correctIndex: 0,
        },
        {
          id: "n5-l4-g3-d2",
          prompt: "Translate: 'The cat is under the chair.'",
          choices: [
            "ねこは椅子の下にいます。",
            "ねこは椅子の上にいます。",
            "ねこは椅子の前にいます。",
            "椅子の下はねこです。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l4-g3-d3",
          prompt: "Best translation for 'next to the bank':",
          choices: ["銀行のとなり", "銀行の中", "銀行の上", "銀行の前"],
          correctIndex: 0,
          explanation: "となり (or 横) = next to / beside.",
        },
      ],
    },
    {
      id: "n5-l4-g4",
      pattern: "Time word + に",
      title: "Specific times in the past",
      explanation:
        "Same に as Lesson 3, now used with past tense: 七時に起きました ('I got up at 7'). Days of the week and dates also take に: 月曜日に, 三月に. Words like 昨日 (yesterday), 今朝 (this morning), and 先週 (last week) are *relative* times and take **no** particle.",
      examples: [
        { jp: "昨日六時に起きました。", romaji: "Kinou roku-ji ni okimashita.", en: "I got up at 6 yesterday." },
        { jp: "月曜日に学校に行きました。", romaji: "Getsuyoubi ni gakkou ni ikimashita.", en: "I went to school on Monday." },
        { jp: "先週京都に行きました。", romaji: "Senshuu Kyouto ni ikimashita.", en: "I went to Kyoto last week." },
      ],
      drills: [
        {
          id: "n5-l4-g4-d1",
          prompt: "Which sentence is grammatical?",
          choices: [
            "六時に起きました。",
            "六時で起きました。",
            "六時を起きました。",
            "六時は起きました。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l4-g4-d2",
          prompt: "Which time word does NOT need に?",
          choices: ["昨日", "六時", "月曜日", "三月"],
          correctIndex: 0,
          explanation: "昨日 (yesterday) is a relative time word — no particle.",
        },
        {
          id: "n5-l4-g4-d3",
          prompt: "Translate: 'I went to school on Monday.'",
          choices: [
            "月曜日に学校に行きました。",
            "月曜日で学校に行きました。",
            "月曜日学校に行きませんでした。",
            "月曜日に学校行きました。",
          ],
          correctIndex: 0,
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l4-v1", kana: "きのう", kanji: "昨日", romaji: "kinou", english: "yesterday", partOfSpeech: "noun" },
    { id: "n5-l4-v2", kana: "きょう", kanji: "今日", romaji: "kyou", english: "today", partOfSpeech: "noun" },
    { id: "n5-l4-v3", kana: "せんしゅう", kanji: "先週", romaji: "senshuu", english: "last week", partOfSpeech: "noun" },
    { id: "n5-l4-v4", kana: "しゅうまつ", kanji: "週末", romaji: "shuumatsu", english: "weekend", partOfSpeech: "noun" },
    { id: "n5-l4-v5", kana: "あさ", kanji: "朝", romaji: "asa", english: "morning", partOfSpeech: "noun" },
    { id: "n5-l4-v6", kana: "ばん", kanji: "晩", romaji: "ban", english: "evening, night", partOfSpeech: "noun" },
    { id: "n5-l4-v7", kana: "あさごはん", kanji: "朝ご飯", romaji: "asagohan", english: "breakfast", partOfSpeech: "noun" },
    { id: "n5-l4-v8", kana: "ばんごはん", kanji: "晩ご飯", romaji: "bangohan", english: "dinner", partOfSpeech: "noun" },
    { id: "n5-l4-v9", kana: "こうえん", kanji: "公園", romaji: "kouen", english: "park", partOfSpeech: "noun" },
    { id: "n5-l4-v10", kana: "ぎんこう", kanji: "銀行", romaji: "ginkou", english: "bank", partOfSpeech: "noun" },
    { id: "n5-l4-v11", kana: "びょういん", kanji: "病院", romaji: "byouin", english: "hospital", partOfSpeech: "noun" },
    { id: "n5-l4-v12", kana: "えき", kanji: "駅", romaji: "eki", english: "train station", partOfSpeech: "noun" },
    { id: "n5-l4-v13", kana: "としょかん", kanji: "図書館", romaji: "toshokan", english: "library", partOfSpeech: "noun" },
    { id: "n5-l4-v14", kana: "つくえ", kanji: "机", romaji: "tsukue", english: "desk", partOfSpeech: "noun" },
    { id: "n5-l4-v15", kana: "いす", kanji: "椅子", romaji: "isu", english: "chair", partOfSpeech: "noun" },
    { id: "n5-l4-v16", kana: "ねこ", kanji: "猫", romaji: "neko", english: "cat", partOfSpeech: "noun" },
    { id: "n5-l4-v17", kana: "いぬ", kanji: "犬", romaji: "inu", english: "dog", partOfSpeech: "noun" },
    { id: "n5-l4-v18", kana: "うえ", kanji: "上", romaji: "ue", english: "top, above", partOfSpeech: "noun" },
    { id: "n5-l4-v19", kana: "した", kanji: "下", romaji: "shita", english: "under, below", partOfSpeech: "noun" },
    { id: "n5-l4-v20", kana: "まえ", kanji: "前", romaji: "mae", english: "in front of", partOfSpeech: "noun" },
    { id: "n5-l4-v21", kana: "うしろ", kanji: "後ろ", romaji: "ushiro", english: "behind", partOfSpeech: "noun" },
    { id: "n5-l4-v22", kana: "となり", kanji: "隣", romaji: "tonari", english: "next to", partOfSpeech: "noun" },
  ],
  listening: [
    {
      id: "n5-l4-li1",
      jp: "昨日何をしましたか。 友達と映画を見ました。",
      romaji: "Kinou nani o shimashita ka. Tomodachi to eiga o mimashita.",
      english: "What did you do yesterday? I watched a movie with a friend.",
      question: {
        id: "n5-l4-li1-q",
        prompt: "What did the speaker do yesterday?",
        choices: [
          "Watched a movie with a friend",
          "Studied at the library",
          "Went to the park alone",
          "Worked at a café",
        ],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l4-li2",
      jp: "本はどこにありますか。 鞄の中にあります。",
      romaji: "Hon wa doko ni arimasu ka. Kaban no naka ni arimasu.",
      english: "Where is the book? It's inside the bag.",
      question: {
        id: "n5-l4-li2-q",
        prompt: "Where is the book?",
        choices: ["Inside the bag", "On the desk", "Under the chair", "At the library"],
        correctIndex: 0,
        explanation: "鞄の中 = inside the bag.",
      },
    },
    {
      id: "n5-l4-li3",
      jp: "アンナさんは今どこにいますか。 図書館にいます。",
      romaji: "Anna-san wa ima doko ni imasu ka. Toshokan ni imasu.",
      english: "Where is Anna right now? She's at the library.",
      question: {
        id: "n5-l4-li3-q",
        prompt: "Where is Anna?",
        choices: ["At the library", "At the park", "At home", "At the station"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l4-li4",
      jp: "銀行はどこにありますか。 駅の前にあります。",
      romaji: "Ginkou wa doko ni arimasu ka. Eki no mae ni arimasu.",
      english: "Where is the bank? It's in front of the station.",
      question: {
        id: "n5-l4-li4-q",
        prompt: "Where is the bank?",
        choices: ["In front of the station", "Behind the station", "Inside the station", "Next to the hospital"],
        correctIndex: 0,
        explanation: "駅の前 = in front of the station.",
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson 5 — A Trip to Okinawa (Okinawa Ryokou)
// ---------------------------------------------------------------------

const N5_L5: LessonContent = {
  lessonId: "n5-l5",
  intro:
    "Lesson 5 unlocks descriptions. You'll meet Japanese's two adjective families (い-adjectives and な-adjectives), how to say what you like and dislike with 好き / 嫌い, and how to suggest plans with -ましょう.",
  grammar: [
    {
      id: "n5-l5-g1",
      pattern: "い-adjective + 名詞 / です",
      title: "い-adjectives",
      explanation:
        "い-adjectives end in い in their dictionary form (高い, 安い, 楽しい). Attach them directly to a noun (高い本 = 'an expensive book') or end a sentence with です (この本は高いです). To negate, drop the final い and add くない: 高い → 高くない (or polite 高くないです).",
      examples: [
        { jp: "この本は高いです。", romaji: "Kono hon wa takai desu.", en: "This book is expensive." },
        { jp: "高い本です。", romaji: "Takai hon desu.", en: "It's an expensive book." },
        { jp: "この本は高くないです。", romaji: "Kono hon wa takakunai desu.", en: "This book is not expensive." },
      ],
      drills: [
        {
          id: "n5-l5-g1-d1",
          prompt: "How do you negate 高い?",
          choices: ["高くない", "高いない", "高いではない", "高いじゃない"],
          correctIndex: 0,
          explanation: "Drop い, add くない.",
        },
        {
          id: "n5-l5-g1-d2",
          prompt: "Translate: 'an expensive book'.",
          choices: ["高い本", "本の高い", "本は高い", "高いの本"],
          correctIndex: 0,
          explanation: "い-adj attaches directly — no の.",
        },
        {
          id: "n5-l5-g1-d3",
          prompt: "Which is the correct negative sentence?",
          choices: [
            "この本は高くないです。",
            "この本は高くないでした。",
            "この本は高いじゃないです。",
            "この本は高いません。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l5-g2",
      pattern: "な-adjective + な + 名詞 / です",
      title: "な-adjectives",
      explanation:
        "な-adjectives don't end in い (有名, 静か, 元気, きれい — note: きれい *looks* like an い-adj but isn't). When attaching to a noun, insert な: 静かな町 ('a quiet town'). At the end of a sentence, just use です: この町は静かです. Negate with じゃないです or ではありません.",
      examples: [
        { jp: "京都は静かです。", romaji: "Kyouto wa shizuka desu.", en: "Kyoto is quiet." },
        { jp: "静かな町です。", romaji: "Shizuka na machi desu.", en: "It's a quiet town." },
        { jp: "この町は静かじゃないです。", romaji: "Kono machi wa shizuka janai desu.", en: "This town isn't quiet." },
      ],
      drills: [
        {
          id: "n5-l5-g2-d1",
          prompt: "How do you say 'a quiet town'?",
          choices: ["静かな町", "静か町", "静かい町", "町の静か"],
          correctIndex: 0,
          explanation: "な-adj needs な before the noun.",
        },
        {
          id: "n5-l5-g2-d2",
          prompt: "Which one is a な-adjective?",
          choices: ["きれい", "高い", "楽しい", "新しい"],
          correctIndex: 0,
          explanation: "きれい looks like an い-adj but actually conjugates as a な-adj.",
        },
        {
          id: "n5-l5-g2-d3",
          prompt: "Translate: 'Kyoto isn't quiet.'",
          choices: [
            "京都は静かじゃないです。",
            "京都は静かくないです。",
            "京都は静かないです。",
            "京都の静かじゃないです。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l5-g3",
      pattern: "X が 好きです / 嫌いです",
      title: "Likes and dislikes",
      explanation:
        "好き (*suki*) means 'liked' and 嫌い (*kirai*) means 'disliked'. They behave like な-adjectives: 私はコーヒーが好きです ('I like coffee'). Note the *thing liked* is marked with が, not を — because grammatically you're saying 'as for me, coffee is liked'.",
      examples: [
        { jp: "私はコーヒーが好きです。", romaji: "Watashi wa koohii ga suki desu.", en: "I like coffee." },
        { jp: "アンナさんは納豆が嫌いです。", romaji: "Anna-san wa nattou ga kirai desu.", en: "Anna dislikes natto." },
        { jp: "どんな音楽が好きですか。", romaji: "Donna ongaku ga suki desu ka?", en: "What kind of music do you like?" },
      ],
      drills: [
        {
          id: "n5-l5-g3-d1",
          prompt: "Which particle marks the thing you like?",
          choices: ["が", "を", "に", "で"],
          correctIndex: 0,
          explanation: "好き / 嫌い take が, not を.",
        },
        {
          id: "n5-l5-g3-d2",
          prompt: "Translate: 'I like coffee.'",
          choices: [
            "私はコーヒーが好きです。",
            "私はコーヒーを好きます。",
            "私のコーヒーは好きです。",
            "コーヒーは私を好きです。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l5-g3-d3",
          prompt: "What does どんな mean?",
          choices: ["what kind of", "how much", "where", "when"],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l5-g4",
      pattern: "Verb + ましょう / ましょうか",
      title: "Suggestions: let's…",
      explanation:
        "-ましょう (*-mashou*) means 'let's…' and assumes the listener will agree. -ましょうか (*-mashou ka*) is a softer 'shall we…?' that invites a response. Use either to make plans, offer help, or rally a group.",
      examples: [
        { jp: "映画を見ましょう。", romaji: "Eiga o mimashou.", en: "Let's watch a movie." },
        { jp: "いっしょに昼ご飯を食べましょうか。", romaji: "Issho ni hirugohan o tabemashou ka?", en: "Shall we eat lunch together?" },
        { jp: "コーヒーを飲みましょう。", romaji: "Koohii o nomimashou.", en: "Let's drink coffee." },
      ],
      drills: [
        {
          id: "n5-l5-g4-d1",
          prompt: "Which form means 'let's eat'?",
          choices: ["食べましょう", "食べます", "食べました", "食べてください"],
          correctIndex: 0,
        },
        {
          id: "n5-l5-g4-d2",
          prompt: "What does -ましょうか add to a suggestion?",
          choices: [
            "Softens it into 'shall we…?'",
            "Turns it negative",
            "Makes it past tense",
            "Adds emphasis",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l5-g4-d3",
          prompt: "Translate: 'Let's watch a movie.'",
          choices: [
            "映画を見ましょう。",
            "映画を見ます。",
            "映画を見ませんでした。",
            "映画を見てください。",
          ],
          correctIndex: 0,
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l5-v1", kana: "たかい", kanji: "高い", romaji: "takai", english: "expensive, high", partOfSpeech: "adjective" },
    { id: "n5-l5-v2", kana: "やすい", kanji: "安い", romaji: "yasui", english: "cheap", partOfSpeech: "adjective" },
    { id: "n5-l5-v3", kana: "おおきい", kanji: "大きい", romaji: "ookii", english: "big", partOfSpeech: "adjective" },
    { id: "n5-l5-v4", kana: "ちいさい", kanji: "小さい", romaji: "chiisai", english: "small", partOfSpeech: "adjective" },
    { id: "n5-l5-v5", kana: "あたらしい", kanji: "新しい", romaji: "atarashii", english: "new", partOfSpeech: "adjective" },
    { id: "n5-l5-v6", kana: "ふるい", kanji: "古い", romaji: "furui", english: "old (not for people)", partOfSpeech: "adjective" },
    { id: "n5-l5-v7", kana: "おいしい", romaji: "oishii", english: "delicious", partOfSpeech: "adjective" },
    { id: "n5-l5-v8", kana: "あつい", kanji: "暑い", romaji: "atsui", english: "hot (weather)", partOfSpeech: "adjective" },
    { id: "n5-l5-v9", kana: "さむい", kanji: "寒い", romaji: "samui", english: "cold (weather)", partOfSpeech: "adjective" },
    { id: "n5-l5-v10", kana: "たのしい", kanji: "楽しい", romaji: "tanoshii", english: "fun, enjoyable", partOfSpeech: "adjective" },
    { id: "n5-l5-v11", kana: "おもしろい", kanji: "面白い", romaji: "omoshiroi", english: "interesting, funny", partOfSpeech: "adjective" },
    { id: "n5-l5-v12", kana: "しずか", kanji: "静か", romaji: "shizuka", english: "quiet (na-adj)", partOfSpeech: "adjective" },
    { id: "n5-l5-v13", kana: "きれい", romaji: "kirei", english: "pretty, clean (na-adj)", partOfSpeech: "adjective" },
    { id: "n5-l5-v14", kana: "げんき", kanji: "元気", romaji: "genki", english: "energetic, healthy (na-adj)", partOfSpeech: "adjective" },
    { id: "n5-l5-v15", kana: "ゆうめい", kanji: "有名", romaji: "yuumei", english: "famous (na-adj)", partOfSpeech: "adjective" },
    { id: "n5-l5-v16", kana: "しんせつ", kanji: "親切", romaji: "shinsetsu", english: "kind (na-adj)", partOfSpeech: "adjective" },
    { id: "n5-l5-v17", kana: "すき", kanji: "好き", romaji: "suki", english: "liked (na-adj)", partOfSpeech: "adjective" },
    { id: "n5-l5-v18", kana: "きらい", kanji: "嫌い", romaji: "kirai", english: "disliked (na-adj)", partOfSpeech: "adjective" },
    { id: "n5-l5-v19", kana: "おんがく", kanji: "音楽", romaji: "ongaku", english: "music", partOfSpeech: "noun" },
    { id: "n5-l5-v20", kana: "スポーツ", romaji: "supootsu", english: "sport(s)", partOfSpeech: "noun" },
    { id: "n5-l5-v21", kana: "どんな", romaji: "donna", english: "what kind of", partOfSpeech: "expression" },
    { id: "n5-l5-v22", kana: "いっしょに", kanji: "一緒に", romaji: "issho ni", english: "together", partOfSpeech: "adverb" },
  ],
  listening: [
    {
      id: "n5-l5-li1",
      jp: "どんな音楽が好きですか。 ジャズが好きです。",
      romaji: "Donna ongaku ga suki desu ka. Jazu ga suki desu.",
      english: "What kind of music do you like? I like jazz.",
      question: {
        id: "n5-l5-li1-q",
        prompt: "What kind of music does the speaker like?",
        choices: ["Jazz", "Rock", "Classical", "Pop"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l5-li2",
      jp: "京都は静かですか。 はい、とても静かです。",
      romaji: "Kyouto wa shizuka desu ka. Hai, totemo shizuka desu.",
      english: "Is Kyoto quiet? Yes, very quiet.",
      question: {
        id: "n5-l5-li2-q",
        prompt: "Is Kyoto quiet?",
        choices: ["Yes, very quiet", "No, it's loud", "Sometimes", "Not stated"],
        correctIndex: 0,
        explanation: "とても静かです = very quiet.",
      },
    },
    {
      id: "n5-l5-li3",
      jp: "いっしょに昼ご飯を食べましょうか。 はい、食べましょう。",
      romaji: "Issho ni hirugohan o tabemashou ka. Hai, tabemashou.",
      english: "Shall we eat lunch together? Yes, let's.",
      question: {
        id: "n5-l5-li3-q",
        prompt: "What did the second speaker agree to?",
        choices: ["Eating lunch together", "Going home", "Watching a movie", "Drinking coffee"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l5-li4",
      jp: "この本はどうですか。 高くないです。安いです。",
      romaji: "Kono hon wa dou desu ka. Takakunai desu. Yasui desu.",
      english: "How about this book? It's not expensive. It's cheap.",
      question: {
        id: "n5-l5-li4-q",
        prompt: "What does the speaker say about the book?",
        choices: ["It's cheap", "It's expensive", "It's interesting", "It's small"],
        correctIndex: 0,
        explanation: "高くないです、安いです — not expensive, cheap.",
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson 6 — A Day in Robert's Life (Robaato-san no Ichinichi)
// ---------------------------------------------------------------------

const N5_L6: LessonContent = {
  lessonId: "n5-l6",
  intro:
    "Lesson 6 introduces the て-form — possibly the single most important conjugation in Japanese. Once you have it you can connect actions, ask people to do things politely, and grant or refuse permission.",
  grammar: [
    {
      id: "n5-l6-g1",
      pattern: "Verb (て-form)",
      title: "Forming the て-form",
      explanation:
        "Group 1 (う-verbs) follow sound-change rules from the dictionary form: う/つ/る → って (買う → 買って), む/ぶ/ぬ → んで (飲む → 飲んで), く → いて (書く → 書いて), ぐ → いで (泳ぐ → 泳いで), す → して (話す → 話して). Group 2 (る-verbs) just drops る and adds て: 食べる → 食べて. Irregular: する → して, 来る → 来て.",
      examples: [
        { jp: "飲む → 飲んで", romaji: "nomu → nonde", en: "drink → drinking / drink and..." },
        { jp: "書く → 書いて", romaji: "kaku → kaite", en: "write → writing / write and..." },
        { jp: "食べる → 食べて", romaji: "taberu → tabete", en: "eat → eating / eat and..." },
      ],
      drills: [
        {
          id: "n5-l6-g1-d1",
          prompt: "What is the て-form of 飲む?",
          choices: ["飲んで", "飲って", "飲いて", "飲んて"],
          correctIndex: 0,
          explanation: "む / ぶ / ぬ verbs become んで.",
        },
        {
          id: "n5-l6-g1-d2",
          prompt: "What is the て-form of 食べる?",
          choices: ["食べて", "食べって", "食べんで", "食べいて"],
          correctIndex: 0,
          explanation: "Group 2 (る-verbs) just drops る + て.",
        },
        {
          id: "n5-l6-g1-d3",
          prompt: "What is the て-form of 行く? (irregular!)",
          choices: ["行って", "行いて", "行きて", "行んで"],
          correctIndex: 0,
          explanation: "行く is the lone exception in the く-group — it becomes 行って, not 行いて.",
        },
      ],
    },
    {
      id: "n5-l6-g2",
      pattern: "V(て) + ください",
      title: "Polite requests: please do…",
      explanation:
        "Take any verb's て-form and add ください for a polite 'please do X'. It's the standard way to ask anyone — a teacher, a stranger, a coworker — to do something. Drop the ください for a casual 'please' (more familiar tone).",
      examples: [
        { jp: "ちょっと待ってください。", romaji: "Chotto matte kudasai.", en: "Please wait a moment." },
        { jp: "もう一度言ってください。", romaji: "Mou ichido itte kudasai.", en: "Please say it once more." },
        { jp: "本を見てください。", romaji: "Hon o mite kudasai.", en: "Please look at the book." },
      ],
      drills: [
        {
          id: "n5-l6-g2-d1",
          prompt: "Pick the polite way to say 'please wait'.",
          choices: ["待ってください", "待ちましょう", "待ちます", "待って"],
          correctIndex: 0,
        },
        {
          id: "n5-l6-g2-d2",
          prompt: "What does 'もう一度言ってください' mean?",
          choices: [
            "Please say it once more.",
            "Please don't say it.",
            "I said it once.",
            "Let's say it together.",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l6-g2-d3",
          prompt: "Translate: 'Please look at the book.'",
          choices: [
            "本を見てください。",
            "本を見ましょう。",
            "本を見ます。",
            "本を見ないでください。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l6-g3",
      pattern: "V(て) + も いいです",
      title: "It's OK to do…",
      explanation:
        "て-form + もいいです grants permission: 'it's fine to do X.' To ask for permission, add か: 食べてもいいですか ('Is it OK if I eat?'). To deny it, switch to てはいけません (literally 'doing X won't do').",
      examples: [
        { jp: "ここで食べてもいいです。", romaji: "Koko de tabete mo ii desu.", en: "It's OK to eat here." },
        { jp: "写真を撮ってもいいですか。", romaji: "Shashin o totte mo ii desu ka?", en: "Is it OK to take a photo?" },
        { jp: "ここで食べてはいけません。", romaji: "Koko de tabete wa ikemasen.", en: "You must not eat here." },
      ],
      drills: [
        {
          id: "n5-l6-g3-d1",
          prompt: "How do you ask 'is it OK to take a photo?'",
          choices: [
            "写真を撮ってもいいですか。",
            "写真を撮りましょうか。",
            "写真を撮ってください。",
            "写真を撮ってはいけません。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l6-g3-d2",
          prompt: "What does ここで食べてはいけません mean?",
          choices: [
            "You must not eat here.",
            "It's OK to eat here.",
            "Please eat here.",
            "Let's eat here.",
          ],
          correctIndex: 0,
          explanation: "てはいけません is the prohibition pair to てもいいです.",
        },
        {
          id: "n5-l6-g3-d3",
          prompt: "Translate: 'You may go home.'",
          choices: [
            "帰ってもいいです。",
            "帰ってください。",
            "帰ってはいけません。",
            "帰りましょう。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l6-g4",
      pattern: "V(て), V(て), …",
      title: "Connecting actions",
      explanation:
        "Stack て-forms to chain verbs in sequence: '朝起きて、コーヒーを飲んで、学校に行きます' = 'I get up in the morning, drink coffee, and go to school.' Only the *final* verb takes the tense / politeness marker — the chain inherits it. This is the cleanest way to describe a routine.",
      examples: [
        { jp: "朝起きて、コーヒーを飲みます。", romaji: "Asa okite, koohii o nomimasu.", en: "I get up in the morning and drink coffee." },
        { jp: "うちに帰って、晩ご飯を食べます。", romaji: "Uchi ni kaette, bangohan o tabemasu.", en: "I go home and eat dinner." },
        { jp: "シャワーを浴びて、寝ます。", romaji: "Shawaa o abite, nemasu.", en: "I take a shower and go to bed." },
      ],
      drills: [
        {
          id: "n5-l6-g4-d1",
          prompt: "Which verb in a chain carries the tense?",
          choices: [
            "Only the last one",
            "Every verb",
            "Only the first",
            "It depends on the speaker",
          ],
          correctIndex: 0,
          explanation: "Only the final verb takes tense / politeness — the rest stay in て-form.",
        },
        {
          id: "n5-l6-g4-d2",
          prompt: "Translate: 'I get up in the morning and drink coffee.'",
          choices: [
            "朝起きて、コーヒーを飲みます。",
            "朝起きました、コーヒーを飲みました。",
            "朝起きるとコーヒーを飲みます。",
            "朝起きてコーヒーを飲みません。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l6-g4-d3",
          prompt: "Best translation for 'I go home and eat dinner.':",
          choices: [
            "うちに帰って、晩ご飯を食べます。",
            "うちに帰りました、晩ご飯を食べます。",
            "うちに帰ります、晩ご飯を食べます。",
            "うちに帰りますて、晩ご飯を食べます。",
          ],
          correctIndex: 0,
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l6-v1", kana: "おきる", kanji: "起きる", romaji: "okiru", english: "to get up", partOfSpeech: "verb" },
    { id: "n5-l6-v2", kana: "ねる", kanji: "寝る", romaji: "neru", english: "to sleep, to go to bed", partOfSpeech: "verb" },
    { id: "n5-l6-v3", kana: "あびる", kanji: "浴びる", romaji: "abiru", english: "to take (a shower)", partOfSpeech: "verb" },
    { id: "n5-l6-v4", kana: "つかう", kanji: "使う", romaji: "tsukau", english: "to use", partOfSpeech: "verb" },
    { id: "n5-l6-v5", kana: "まつ", kanji: "待つ", romaji: "matsu", english: "to wait", partOfSpeech: "verb" },
    { id: "n5-l6-v6", kana: "もつ", kanji: "持つ", romaji: "motsu", english: "to hold, to have", partOfSpeech: "verb" },
    { id: "n5-l6-v7", kana: "とる", kanji: "撮る", romaji: "toru", english: "to take (a photo)", partOfSpeech: "verb" },
    { id: "n5-l6-v8", kana: "あける", kanji: "開ける", romaji: "akeru", english: "to open", partOfSpeech: "verb" },
    { id: "n5-l6-v9", kana: "しめる", kanji: "閉める", romaji: "shimeru", english: "to close", partOfSpeech: "verb" },
    { id: "n5-l6-v10", kana: "おしえる", kanji: "教える", romaji: "oshieru", english: "to teach, to tell", partOfSpeech: "verb" },
    { id: "n5-l6-v11", kana: "たすける", kanji: "助ける", romaji: "tasukeru", english: "to help", partOfSpeech: "verb" },
    { id: "n5-l6-v12", kana: "あそぶ", kanji: "遊ぶ", romaji: "asobu", english: "to play, to hang out", partOfSpeech: "verb" },
    { id: "n5-l6-v13", kana: "およぐ", kanji: "泳ぐ", romaji: "oyogu", english: "to swim", partOfSpeech: "verb" },
    { id: "n5-l6-v14", kana: "うち", romaji: "uchi", english: "home, my place", partOfSpeech: "noun" },
    { id: "n5-l6-v15", kana: "シャワー", romaji: "shawaa", english: "shower", partOfSpeech: "noun" },
    { id: "n5-l6-v16", kana: "しゃしん", kanji: "写真", romaji: "shashin", english: "photo", partOfSpeech: "noun" },
    { id: "n5-l6-v17", kana: "ちょっと", romaji: "chotto", english: "a little, just a moment", partOfSpeech: "adverb" },
    { id: "n5-l6-v18", kana: "もういちど", kanji: "もう一度", romaji: "mou ichido", english: "once more", partOfSpeech: "expression" },
    { id: "n5-l6-v19", kana: "ゆっくり", romaji: "yukkuri", english: "slowly", partOfSpeech: "adverb" },
    { id: "n5-l6-v20", kana: "それから", romaji: "sorekara", english: "after that, and then", partOfSpeech: "expression" },
  ],
  listening: [
    {
      id: "n5-l6-li1",
      jp: "ちょっと待ってください。 はい、どうぞ。",
      romaji: "Chotto matte kudasai. Hai, douzo.",
      english: "Please wait a moment. OK, go ahead.",
      question: {
        id: "n5-l6-li1-q",
        prompt: "What did the first speaker ask for?",
        choices: ["Wait a moment", "Help with directions", "A photo", "More coffee"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l6-li2",
      jp: "ここで写真を撮ってもいいですか。 すみません、いけません。",
      romaji: "Koko de shashin o totte mo ii desu ka. Sumimasen, ikemasen.",
      english: "Is it OK to take a photo here? Sorry, you can't.",
      question: {
        id: "n5-l6-li2-q",
        prompt: "Was the speaker allowed to take a photo?",
        choices: ["No", "Yes", "Only outside", "Not stated"],
        correctIndex: 0,
        explanation: "いけません = no, not allowed.",
      },
    },
    {
      id: "n5-l6-li3",
      jp: "朝起きて、シャワーを浴びて、学校に行きます。",
      romaji: "Asa okite, shawaa o abite, gakkou ni ikimasu.",
      english: "I get up in the morning, take a shower, and go to school.",
      question: {
        id: "n5-l6-li3-q",
        prompt: "Which order does the speaker do things in the morning?",
        choices: [
          "Wake up → shower → school",
          "Shower → wake up → school",
          "School → shower → wake up",
          "Wake up → school → shower",
        ],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l6-li4",
      jp: "もう一度ゆっくり言ってください。 はい、わかりました。",
      romaji: "Mou ichido yukkuri itte kudasai. Hai, wakarimashita.",
      english: "Please say it once more, slowly. OK, got it.",
      question: {
        id: "n5-l6-li4-q",
        prompt: "What did the speaker request?",
        choices: [
          "Repeat slowly",
          "Speak louder",
          "Translate to English",
          "Write it down",
        ],
        correctIndex: 0,
        explanation: "もう一度ゆっくり = once more, slowly.",
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson 7 — Family Picture (Kazoku no Shashin)
// ---------------------------------------------------------------------

const N5_L7: LessonContent = {
  lessonId: "n5-l7",
  intro:
    "Lesson 7 builds on the て-form. You'll learn how to describe ongoing actions and lasting states with -ています, navigate Japan's split between *my-family* and *your-family* vocabulary, and describe how people look.",
  grammar: [
    {
      id: "n5-l7-g1",
      pattern: "V(て) + います (action in progress)",
      title: "I am doing… right now",
      explanation:
        "te-form + います describes an action happening right now — the English 'be -ing'. 食べる → 食べています ('I'm eating'). The negative 'not -ing' is -ていません.",
      examples: [
        { jp: "今ご飯を食べています。", romaji: "Ima gohan o tabete imasu.", en: "I'm eating right now." },
        { jp: "アンナさんはテレビを見ています。", romaji: "Anna-san wa terebi o mite imasu.", en: "Anna is watching TV." },
        { jp: "雨が降っています。", romaji: "Ame ga futte imasu.", en: "It's raining." },
      ],
      drills: [
        {
          id: "n5-l7-g1-d1",
          prompt: "Translate: 'I am eating right now.'",
          choices: ["今ご飯を食べています。", "今ご飯を食べます。", "今ご飯を食べました。", "今ご飯を食べてください。"],
          correctIndex: 0,
        },
        {
          id: "n5-l7-g1-d2",
          prompt: "What's the negative of 食べています?",
          choices: ["食べていません", "食べないです", "食べませんでした", "食べてないでした"],
          correctIndex: 0,
        },
        {
          id: "n5-l7-g1-d3",
          prompt: "Best translation: 'It's raining.'",
          choices: ["雨が降っています。", "雨が降ります。", "雨が降りました。", "雨が降りません。"],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l7-g2",
      pattern: "V(て) + います (state)",
      title: "Resulting state",
      explanation:
        "Some verbs use -ています for a *state* that resulted from an action — not an action in progress. 結婚しています is 'is married' (not 'is getting married'). 住んでいます = 'is living', 知っています = 'knows', 持っています = 'has'. The pattern is the same; the meaning depends on the verb.",
      examples: [
        { jp: "兄は結婚しています。", romaji: "Ani wa kekkon shite imasu.", en: "My older brother is married." },
        { jp: "東京に住んでいます。", romaji: "Tokyo ni sunde imasu.", en: "I live in Tokyo." },
        { jp: "山田さんを知っています。", romaji: "Yamada-san o shitte imasu.", en: "I know Mr. Yamada." },
      ],
      drills: [
        {
          id: "n5-l7-g2-d1",
          prompt: "How do you say 'I live in Tokyo'?",
          choices: ["東京に住んでいます。", "東京に住みます。", "東京に住みました。", "東京に住んでください。"],
          correctIndex: 0,
        },
        {
          id: "n5-l7-g2-d2",
          prompt: "What does 結婚しています mean?",
          choices: ["is married", "is getting married right now", "got married yesterday", "wants to marry"],
          correctIndex: 0,
          explanation: "結婚する is a change-of-state verb, so -ています = current state.",
        },
        {
          id: "n5-l7-g2-d3",
          prompt: "Translate: 'I don't know him.' (about Mr. Yamada)",
          choices: [
            "山田さんを知りません。",
            "山田さんを知っていません。",
            "山田さんは知っていません。",
            "山田さんを知ってないでした。",
          ],
          correctIndex: 0,
          explanation: "Curiously, the negative of 知っています is 知りません, not 知っていません.",
        },
      ],
    },
    {
      id: "n5-l7-g3",
      pattern: "Family terms (uchi vs soto)",
      title: "Talking about family",
      explanation:
        "Japanese has two parallel sets: humble forms for *your own* family (兄, 姉, 父, 母) and respectful forms for *someone else's* family (お兄さん, お姉さん, お父さん, お母さん). Mix them up and you'll either insult yourself or refer to your dad way too formally.",
      examples: [
        { jp: "私の兄は会社員です。", romaji: "Watashi no ani wa kaishain desu.", en: "My older brother is a company employee." },
        { jp: "アンナさんのお兄さんは医者です。", romaji: "Anna-san no oniisan wa isha desu.", en: "Anna's older brother is a doctor." },
        { jp: "母は先生です。", romaji: "Haha wa sensei desu.", en: "My mother is a teacher." },
      ],
      drills: [
        {
          id: "n5-l7-g3-d1",
          prompt: "Which word do you use for *your own* older brother?",
          choices: ["兄", "お兄さん", "弟", "おじさん"],
          correctIndex: 0,
        },
        {
          id: "n5-l7-g3-d2",
          prompt: "How do you ask 'is your mother a teacher?'",
          choices: [
            "お母さんは先生ですか。",
            "母は先生ですか。",
            "お母さんは先生ですよ。",
            "お母さんに先生ですか。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l7-g3-d3",
          prompt: "Pick the correct sentence about *your own* father.",
          choices: [
            "父は会社員です。",
            "お父さんは会社員です。",
            "父さんは会社員です。",
            "お父は会社員です。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l7-g4",
      pattern: "Body part + が + adjective",
      title: "Describing people",
      explanation:
        "To describe a feature of someone, use [body part] が [adjective]: 髪が長いです ('hair is long'), 背が高いです ('tall', literally 'back is high'), 目が大きいです ('eyes are big'). Stack them: 兄は背が高くて、髪が短いです ('My brother is tall and has short hair') — note the て-form of い-adj for chaining.",
      examples: [
        { jp: "姉は髪が長いです。", romaji: "Ane wa kami ga nagai desu.", en: "My older sister has long hair." },
        { jp: "兄は背が高いです。", romaji: "Ani wa se ga takai desu.", en: "My older brother is tall." },
        { jp: "父は目が大きいです。", romaji: "Chichi wa me ga ookii desu.", en: "My father has big eyes." },
      ],
      drills: [
        {
          id: "n5-l7-g4-d1",
          prompt: "How do you say 'tall' (of a person)?",
          choices: ["背が高い", "高い", "大きい", "長い"],
          correctIndex: 0,
          explanation: "背が高い — literally 'back is high'.",
        },
        {
          id: "n5-l7-g4-d2",
          prompt: "Translate: 'My older sister has long hair.'",
          choices: [
            "姉は髪が長いです。",
            "姉の髪は長くないです。",
            "姉は髪を長いです。",
            "姉は長い髪です。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l7-g4-d3",
          prompt: "Which particle marks the body feature?",
          choices: ["が", "を", "に", "で"],
          correctIndex: 0,
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l7-v1", kana: "かぞく", kanji: "家族", romaji: "kazoku", english: "family", partOfSpeech: "noun" },
    { id: "n5-l7-v2", kana: "ちち", kanji: "父", romaji: "chichi", english: "(my) father", partOfSpeech: "noun" },
    { id: "n5-l7-v3", kana: "はは", kanji: "母", romaji: "haha", english: "(my) mother", partOfSpeech: "noun" },
    { id: "n5-l7-v4", kana: "あに", kanji: "兄", romaji: "ani", english: "(my) older brother", partOfSpeech: "noun" },
    { id: "n5-l7-v5", kana: "あね", kanji: "姉", romaji: "ane", english: "(my) older sister", partOfSpeech: "noun" },
    { id: "n5-l7-v6", kana: "おとうと", kanji: "弟", romaji: "otouto", english: "(my) younger brother", partOfSpeech: "noun" },
    { id: "n5-l7-v7", kana: "いもうと", kanji: "妹", romaji: "imouto", english: "(my) younger sister", partOfSpeech: "noun" },
    { id: "n5-l7-v8", kana: "おとうさん", kanji: "お父さん", romaji: "otousan", english: "(someone else's) father", partOfSpeech: "noun" },
    { id: "n5-l7-v9", kana: "おかあさん", kanji: "お母さん", romaji: "okaasan", english: "(someone else's) mother", partOfSpeech: "noun" },
    { id: "n5-l7-v10", kana: "おにいさん", kanji: "お兄さん", romaji: "oniisan", english: "(someone else's) older brother", partOfSpeech: "noun" },
    { id: "n5-l7-v11", kana: "おねえさん", kanji: "お姉さん", romaji: "oneesan", english: "(someone else's) older sister", partOfSpeech: "noun" },
    { id: "n5-l7-v12", kana: "けっこんする", kanji: "結婚する", romaji: "kekkon suru", english: "to get married", partOfSpeech: "verb" },
    { id: "n5-l7-v13", kana: "すむ", kanji: "住む", romaji: "sumu", english: "to live (somewhere)", partOfSpeech: "verb" },
    { id: "n5-l7-v14", kana: "しる", kanji: "知る", romaji: "shiru", english: "to know, to find out", partOfSpeech: "verb" },
    { id: "n5-l7-v15", kana: "はたらく", kanji: "働く", romaji: "hataraku", english: "to work", partOfSpeech: "verb" },
    { id: "n5-l7-v16", kana: "せ", kanji: "背", romaji: "se", english: "back, height (of a person)", partOfSpeech: "noun" },
    { id: "n5-l7-v17", kana: "かみ", kanji: "髪", romaji: "kami", english: "hair (on head)", partOfSpeech: "noun" },
    { id: "n5-l7-v18", kana: "め", kanji: "目", romaji: "me", english: "eye(s)", partOfSpeech: "noun" },
    { id: "n5-l7-v19", kana: "ながい", kanji: "長い", romaji: "nagai", english: "long", partOfSpeech: "adjective" },
    { id: "n5-l7-v20", kana: "みじかい", kanji: "短い", romaji: "mijikai", english: "short", partOfSpeech: "adjective" },
    { id: "n5-l7-v21", kana: "かいしゃいん", kanji: "会社員", romaji: "kaishain", english: "company employee", partOfSpeech: "noun" },
    { id: "n5-l7-v22", kana: "いしゃ", kanji: "医者", romaji: "isha", english: "doctor", partOfSpeech: "noun" },
  ],
  listening: [
    {
      id: "n5-l7-li1",
      jp: "今、何をしていますか。 ご飯を食べています。",
      romaji: "Ima, nani o shite imasu ka. Gohan o tabete imasu.",
      english: "What are you doing right now? I'm eating.",
      question: {
        id: "n5-l7-li1-q",
        prompt: "What is the speaker doing right now?",
        choices: ["Eating", "Watching TV", "Sleeping", "Working"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l7-li2",
      jp: "お兄さんは何をしていますか。 銀行で働いています。",
      romaji: "Oniisan wa nani o shite imasu ka. Ginkou de hataraite imasu.",
      english: "What does your older brother do? He works at a bank.",
      question: {
        id: "n5-l7-li2-q",
        prompt: "Where does the brother work?",
        choices: ["At a bank", "At a hospital", "At a school", "At a company"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l7-li3",
      jp: "姉は背が高くて、髪が長いです。",
      romaji: "Ane wa se ga takakute, kami ga nagai desu.",
      english: "My older sister is tall and has long hair.",
      question: {
        id: "n5-l7-li3-q",
        prompt: "How is the sister described?",
        choices: ["Tall, with long hair", "Short, with long hair", "Tall, with short hair", "Short, with short hair"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l7-li4",
      jp: "ご結婚していますか。 はい、結婚しています。",
      romaji: "Go-kekkon shite imasu ka. Hai, kekkon shite imasu.",
      english: "Are you married? Yes, I'm married.",
      question: {
        id: "n5-l7-li4-q",
        prompt: "Is the speaker married?",
        choices: ["Yes", "No", "Engaged", "Divorced"],
        correctIndex: 0,
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson 8 — Barbecue (Baabekyuu)
// ---------------------------------------------------------------------

const N5_L8: LessonContent = {
  lessonId: "n5-l8",
  intro:
    "Lesson 8 introduces the **short / plain forms** — the casual register Japanese friends use with each other, and the foundation for almost every advanced grammar pattern (と思う, ~から, ~ので, modifying clauses…). Master this and the rest of N5 unlocks fast.",
  grammar: [
    {
      id: "n5-l8-g1",
      pattern: "Verb (short form, present)",
      title: "Dictionary form & short negative",
      explanation:
        "The short affirmative present is just the dictionary form: 食べる, 飲む, する. The short negative drops -ます and uses -ない: 食べる → 食べない, 飲む → 飲まない (group 1: stem changes a-row + ない), する → しない, 来る → こない. ある is special — its negative is ない, not あらない.",
      examples: [
        { jp: "コーヒーを飲む。", romaji: "Koohii o nomu.", en: "I drink coffee. (casual)" },
        { jp: "肉を食べない。", romaji: "Niku o tabenai.", en: "I don't eat meat. (casual)" },
        { jp: "時間がない。", romaji: "Jikan ga nai.", en: "I have no time." },
      ],
      drills: [
        {
          id: "n5-l8-g1-d1",
          prompt: "What's the short negative of 飲む?",
          choices: ["飲まない", "飲みない", "飲むない", "飲まなく"],
          correctIndex: 0,
          explanation: "Group 1 verbs: -u → -a + ない.",
        },
        {
          id: "n5-l8-g1-d2",
          prompt: "What's the short negative of する?",
          choices: ["しない", "すない", "しらない", "しまない"],
          correctIndex: 0,
        },
        {
          id: "n5-l8-g1-d3",
          prompt: "Pick the correct short negative for ある.",
          choices: ["ない", "あらない", "ありない", "あるない"],
          correctIndex: 0,
          explanation: "ある is irregular — its negative is just ない.",
        },
      ],
    },
    {
      id: "n5-l8-g2",
      pattern: "Adjective short forms",
      title: "Adjectives in casual speech",
      explanation:
        "い-adjectives drop です in casual speech: 高い (not 高いです). Negative is 高くない. な-adj and nouns use だ in place of です: 静かだ, 学生だ. The negative is じゃない (or ではない): 静かじゃない, 学生じゃない. *Note*: in casual *questions*, drop the だ — 学生? not 学生だ?.",
      examples: [
        { jp: "この本、高い。", romaji: "Kono hon, takai.", en: "This book is expensive. (casual)" },
        { jp: "この町、静かだ。", romaji: "Kono machi, shizuka da.", en: "This town is quiet." },
        { jp: "アンナさんは学生じゃない。", romaji: "Anna-san wa gakusei janai.", en: "Anna isn't a student." },
      ],
      drills: [
        {
          id: "n5-l8-g2-d1",
          prompt: "Casual short form of 静かです?",
          choices: ["静かだ", "静かい", "静かない", "静かのだ"],
          correctIndex: 0,
        },
        {
          id: "n5-l8-g2-d2",
          prompt: "Negative of 学生だ?",
          choices: ["学生じゃない", "学生くない", "学生じゃないだ", "学生ではないだ"],
          correctIndex: 0,
        },
        {
          id: "n5-l8-g2-d3",
          prompt: "Casual negative of 高いです?",
          choices: ["高くない", "高いない", "高いじゃない", "高いではない"],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l8-g3",
      pattern: "[Short form] + と思います",
      title: "I think that…",
      explanation:
        "Wrap a short-form clause with と思います to express opinion: 'I think that…'. The clause inside *must* be short form, even when speaking politely overall. アンナさんは来ると思います = 'I think Anna will come.' The opposite (negative thought) typically negates inside: 来ないと思います = 'I don't think she'll come' — Japanese prefers to negate inside と思う.",
      examples: [
        { jp: "アンナさんは来ると思います。", romaji: "Anna-san wa kuru to omoimasu.", en: "I think Anna will come." },
        { jp: "明日は雨だと思います。", romaji: "Ashita wa ame da to omoimasu.", en: "I think it will rain tomorrow." },
        { jp: "彼は学生じゃないと思います。", romaji: "Kare wa gakusei janai to omoimasu.", en: "I don't think he's a student." },
      ],
      drills: [
        {
          id: "n5-l8-g3-d1",
          prompt: "What form must the clause inside と思います take?",
          choices: ["short / plain form", "polite -ます form", "て-form", "dictionary form only"],
          correctIndex: 0,
        },
        {
          id: "n5-l8-g3-d2",
          prompt: "Translate: 'I think Anna will come.'",
          choices: [
            "アンナさんは来ると思います。",
            "アンナさんは来ますと思います。",
            "アンナさんが来てと思います。",
            "アンナさんは来ましたと思います。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l8-g3-d3",
          prompt: "How do you say 'I think it will rain tomorrow'?",
          choices: [
            "明日は雨だと思います。",
            "明日は雨ですと思います。",
            "明日は雨と思います。",
            "明日は雨であると思いました。",
          ],
          correctIndex: 0,
          explanation: "Nouns + な-adj need だ inside と思います.",
        },
      ],
    },
    {
      id: "n5-l8-g4",
      pattern: "[Clause]、[Clause]から",
      title: "Reasons with から",
      explanation:
        "Append から to the *reason* clause to mean 'because'. The reason clause comes *first*, and can be either short or polite form (though short is more common in casual). 寒いから、ジャケットを着ます = 'Because it's cold, I'll wear a jacket.'",
      examples: [
        { jp: "寒いから、ジャケットを着ます。", romaji: "Samui kara, jaketto o kimasu.", en: "Because it's cold, I'll wear a jacket." },
        { jp: "時間がないから、行きません。", romaji: "Jikan ga nai kara, ikimasen.", en: "Because I have no time, I won't go." },
        { jp: "おいしいから、よく食べます。", romaji: "Oishii kara, yoku tabemasu.", en: "Because it's delicious, I eat it a lot." },
      ],
      drills: [
        {
          id: "n5-l8-g4-d1",
          prompt: "Where does the reason clause go?",
          choices: ["Before から, ahead of the result", "After から, after the result", "It can go anywhere", "Inside と思います"],
          correctIndex: 0,
        },
        {
          id: "n5-l8-g4-d2",
          prompt: "Translate: 'Because I have no time, I won't go.'",
          choices: [
            "時間がないから、行きません。",
            "時間がないので、行きます。",
            "行きませんから、時間がないです。",
            "時間がないから、行きました。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l8-g4-d3",
          prompt: "Pick the natural sentence.",
          choices: [
            "寒いから、ジャケットを着ます。",
            "寒いですから、ジャケットを着ますだ。",
            "ジャケットを着ますから、寒いです。",
            "寒いから着ますジャケットを。",
          ],
          correctIndex: 0,
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l8-v1", kana: "にく", kanji: "肉", romaji: "niku", english: "meat", partOfSpeech: "noun" },
    { id: "n5-l8-v2", kana: "さかな", kanji: "魚", romaji: "sakana", english: "fish", partOfSpeech: "noun" },
    { id: "n5-l8-v3", kana: "やさい", kanji: "野菜", romaji: "yasai", english: "vegetable(s)", partOfSpeech: "noun" },
    { id: "n5-l8-v4", kana: "くだもの", kanji: "果物", romaji: "kudamono", english: "fruit", partOfSpeech: "noun" },
    { id: "n5-l8-v5", kana: "ジャケット", romaji: "jaketto", english: "jacket", partOfSpeech: "noun" },
    { id: "n5-l8-v6", kana: "ふく", kanji: "服", romaji: "fuku", english: "clothes", partOfSpeech: "noun" },
    { id: "n5-l8-v7", kana: "きる", kanji: "着る", romaji: "kiru", english: "to wear (above the waist)", partOfSpeech: "verb" },
    { id: "n5-l8-v8", kana: "はく", kanji: "履く", romaji: "haku", english: "to wear (below the waist)", partOfSpeech: "verb" },
    { id: "n5-l8-v9", kana: "おもう", kanji: "思う", romaji: "omou", english: "to think", partOfSpeech: "verb" },
    { id: "n5-l8-v10", kana: "いう", kanji: "言う", romaji: "iu", english: "to say", partOfSpeech: "verb" },
    { id: "n5-l8-v11", kana: "くる", kanji: "来る", romaji: "kuru", english: "to come", partOfSpeech: "verb" },
    { id: "n5-l8-v12", kana: "あめ", kanji: "雨", romaji: "ame", english: "rain", partOfSpeech: "noun" },
    { id: "n5-l8-v13", kana: "ゆき", kanji: "雪", romaji: "yuki", english: "snow", partOfSpeech: "noun" },
    { id: "n5-l8-v14", kana: "てんき", kanji: "天気", romaji: "tenki", english: "weather", partOfSpeech: "noun" },
    { id: "n5-l8-v15", kana: "たぶん", romaji: "tabun", english: "probably, maybe", partOfSpeech: "adverb" },
    { id: "n5-l8-v16", kana: "よく", romaji: "yoku", english: "often, well", partOfSpeech: "adverb" },
    { id: "n5-l8-v17", kana: "ぜんぜん", kanji: "全然", romaji: "zenzen", english: "not at all (with negative)", partOfSpeech: "adverb" },
    { id: "n5-l8-v18", kana: "あまり", romaji: "amari", english: "not much (with negative)", partOfSpeech: "adverb" },
    { id: "n5-l8-v19", kana: "から", romaji: "kara", english: "because, since", partOfSpeech: "particle" },
    { id: "n5-l8-v20", kana: "けっこう", kanji: "結構", romaji: "kekkou", english: "quite, fairly; no thanks", partOfSpeech: "adverb" },
    { id: "n5-l8-v21", kana: "じかん", kanji: "時間", romaji: "jikan", english: "time", partOfSpeech: "noun" },
    { id: "n5-l8-v22", kana: "おもしろい", kanji: "面白い", romaji: "omoshiroi", english: "interesting, fun", partOfSpeech: "adjective" },
  ],
  listening: [
    {
      id: "n5-l8-li1",
      jp: "明日の天気はどうですか。 たぶん雨だと思います。",
      romaji: "Ashita no tenki wa dou desu ka. Tabun ame da to omoimasu.",
      english: "How's tomorrow's weather? I think it'll probably rain.",
      question: {
        id: "n5-l8-li1-q",
        prompt: "What does the speaker think tomorrow's weather will be?",
        choices: ["Probably rain", "Sunny", "Snow", "Cloudy"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l8-li2",
      jp: "肉を食べますか。 いいえ、肉は食べない。野菜だけ食べる。",
      romaji: "Niku o tabemasu ka. Iie, niku wa tabenai. Yasai dake taberu.",
      english: "Do you eat meat? No, I don't eat meat. I only eat vegetables.",
      question: {
        id: "n5-l8-li2-q",
        prompt: "What does the speaker eat?",
        choices: ["Only vegetables", "Only meat", "Both", "Only fish"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l8-li3",
      jp: "今日は寒いから、ジャケットを着ます。",
      romaji: "Kyou wa samui kara, jaketto o kimasu.",
      english: "Because it's cold today, I'll wear a jacket.",
      question: {
        id: "n5-l8-li3-q",
        prompt: "Why is the speaker wearing a jacket?",
        choices: ["Because it's cold", "Because it's raining", "Because it's a formal event", "Because it's new"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l8-li4",
      jp: "アンナさんは明日来ますか。 来ないと思います。忙しいから。",
      romaji: "Anna-san wa ashita kimasu ka. Konai to omoimasu. Isogashii kara.",
      english: "Will Anna come tomorrow? I don't think she will. Because she's busy.",
      question: {
        id: "n5-l8-li4-q",
        prompt: "Why won't Anna come?",
        choices: ["She's busy", "She's sick", "She's traveling", "She's tired"],
        correctIndex: 0,
        explanation: "忙しいから = because she's busy.",
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson 9 — Kabuki
// ---------------------------------------------------------------------

const N5_L9: LessonContent = {
  lessonId: "n5-l9",
  intro:
    "Lesson 9 extends the short forms into past tense, then uses them to *report what someone said* and to talk about what's already happened (or not yet).",
  grammar: [
    {
      id: "n5-l9-g1",
      pattern: "Verb (short past affirmative / negative)",
      title: "Past short forms",
      explanation:
        "The short past affirmative is the た-form: 食べる → 食べた, 飲む → 飲んだ (same sound changes as the て-form, just た / だ at the end). The short past negative is -なかった: 食べない → 食べなかった, 飲まない → 飲まなかった. For nouns / な-adj: 学生だった / 静かだった (affirmative), 学生じゃなかった / 静かじゃなかった (negative).",
      examples: [
        { jp: "昨日寿司を食べた。", romaji: "Kinou sushi o tabeta.", en: "I ate sushi yesterday. (casual)" },
        { jp: "昨日肉を食べなかった。", romaji: "Kinou niku o tabenakatta.", en: "I didn't eat meat yesterday." },
        { jp: "昔、学生だった。", romaji: "Mukashi, gakusei datta.", en: "I was a student long ago." },
      ],
      drills: [
        {
          id: "n5-l9-g1-d1",
          prompt: "What is the short past of 飲む?",
          choices: ["飲んだ", "飲った", "飲まった", "飲みた"],
          correctIndex: 0,
          explanation: "む / ぶ / ぬ → んだ (mirrors the て-form).",
        },
        {
          id: "n5-l9-g1-d2",
          prompt: "Short past negative of 食べる?",
          choices: ["食べなかった", "食べないだ", "食べませんでした", "食べたなかった"],
          correctIndex: 0,
        },
        {
          id: "n5-l9-g1-d3",
          prompt: "How do you say 'I was a student long ago' (casual)?",
          choices: [
            "昔、学生だった。",
            "昔、学生でした。",
            "昔、学生だ。",
            "昔、学生になった。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l9-g2",
      pattern: "[Short form] + と言っていました",
      title: "Reporting what someone said",
      explanation:
        "Use [short-form clause] + と言っていました to report someone's words. と is the quotation marker, 言う is 'say', and the -ていました form keeps the report soft and reflective. アンナさんは行くと言っていました = 'Anna said she will go.'",
      examples: [
        { jp: "アンナさんは行くと言っていました。", romaji: "Anna-san wa iku to itte imashita.", en: "Anna said she will go." },
        { jp: "山田さんは忙しいと言っていました。", romaji: "Yamada-san wa isogashii to itte imashita.", en: "Mr. Yamada said he is busy." },
        { jp: "母は寒いと言っていました。", romaji: "Haha wa samui to itte imashita.", en: "My mother said it's cold." },
      ],
      drills: [
        {
          id: "n5-l9-g2-d1",
          prompt: "Translate: 'Anna said she will go.'",
          choices: [
            "アンナさんは行くと言っていました。",
            "アンナさんは行きますと言っていました。",
            "アンナさんは行くと思います。",
            "アンナさんは行ってと言っていました。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l9-g2-d2",
          prompt: "What's the role of と here?",
          choices: ["Quotation marker", "Subject marker", "Object marker", "Direction marker"],
          correctIndex: 0,
        },
        {
          id: "n5-l9-g2-d3",
          prompt: "Pick the natural sentence.",
          choices: [
            "山田さんは忙しいと言っていました。",
            "山田さんは忙しいですと言っていました。",
            "山田さんが忙しいって言って。",
            "山田さんは忙しいだと言っていました。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l9-g3",
      pattern: "もう / まだ",
      title: "Already / still / not yet",
      explanation:
        "もう + past = 'already (did)': もう食べました ('I already ate'). まだ + present = 'still (am doing)': まだ食べています ('I'm still eating'). The trickier pair: もう + negative = 'no longer' (もう食べません = 'I don't eat anymore'), and まだ + 〜ていません = 'haven't done yet' (まだ食べていません = 'I haven't eaten yet').",
      examples: [
        { jp: "もう晩ご飯を食べました。", romaji: "Mou bangohan o tabemashita.", en: "I already ate dinner." },
        { jp: "まだ宿題をしていません。", romaji: "Mada shukudai o shite imasen.", en: "I haven't done my homework yet." },
        { jp: "まだ食べています。", romaji: "Mada tabete imasu.", en: "I'm still eating." },
      ],
      drills: [
        {
          id: "n5-l9-g3-d1",
          prompt: "How do you say 'I already ate'?",
          choices: ["もう食べました。", "まだ食べました。", "もう食べていません。", "まだ食べていません。"],
          correctIndex: 0,
        },
        {
          id: "n5-l9-g3-d2",
          prompt: "How do you say 'I haven't done my homework yet'?",
          choices: [
            "まだ宿題をしていません。",
            "もう宿題をしていません。",
            "まだ宿題をしません。",
            "もう宿題をしました。",
          ],
          correctIndex: 0,
          explanation: "'Not yet' = まだ + 〜ていません, *not* まだ + 〜ません.",
        },
        {
          id: "n5-l9-g3-d3",
          prompt: "Pick the right pairing.",
          choices: [
            "もう = already, まだ = still / not yet",
            "もう = not yet, まだ = already",
            "もう = always, まだ = never",
            "もう = sometimes, まだ = often",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l9-g4",
      pattern: "なる",
      title: "Becoming something",
      explanation:
        "なる means 'to become'. With nouns and な-adj, attach に: 学生になる ('become a student'), 静かになる ('become quiet'). With い-adj, drop い and attach く: 大きい → 大きくなる ('to get big'). Often used in past tense to describe change: 寒くなりました ('it got cold').",
      examples: [
        { jp: "寒くなりました。", romaji: "Samuku narimashita.", en: "It got cold." },
        { jp: "彼は医者になりました。", romaji: "Kare wa isha ni narimashita.", en: "He became a doctor." },
        { jp: "町が静かになった。", romaji: "Machi ga shizuka ni natta.", en: "The town became quiet. (casual)" },
      ],
      drills: [
        {
          id: "n5-l9-g4-d1",
          prompt: "How do you say 'it got cold'?",
          choices: ["寒くなりました。", "寒いになりました。", "寒くになりました。", "寒くなった。"],
          correctIndex: 0,
        },
        {
          id: "n5-l9-g4-d2",
          prompt: "What particle goes between a noun and なる?",
          choices: ["に", "を", "が", "の"],
          correctIndex: 0,
        },
        {
          id: "n5-l9-g4-d3",
          prompt: "Translate: 'He became a doctor.'",
          choices: [
            "彼は医者になりました。",
            "彼は医者がなりました。",
            "彼は医者でなりました。",
            "彼は医者くなりました。",
          ],
          correctIndex: 0,
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l9-v1", kana: "むかし", kanji: "昔", romaji: "mukashi", english: "long ago", partOfSpeech: "noun" },
    { id: "n5-l9-v2", kana: "しゅくだい", kanji: "宿題", romaji: "shukudai", english: "homework", partOfSpeech: "noun" },
    { id: "n5-l9-v3", kana: "しけん", kanji: "試験", romaji: "shiken", english: "exam", partOfSpeech: "noun" },
    { id: "n5-l9-v4", kana: "じゅぎょう", kanji: "授業", romaji: "jugyou", english: "class, lesson", partOfSpeech: "noun" },
    { id: "n5-l9-v5", kana: "がくせい", kanji: "学生", romaji: "gakusei", english: "student", partOfSpeech: "noun" },
    { id: "n5-l9-v6", kana: "せんせい", kanji: "先生", romaji: "sensei", english: "teacher", partOfSpeech: "noun" },
    { id: "n5-l9-v7", kana: "いそがしい", kanji: "忙しい", romaji: "isogashii", english: "busy", partOfSpeech: "adjective" },
    { id: "n5-l9-v8", kana: "ひま", kanji: "暇", romaji: "hima", english: "free (na-adj)", partOfSpeech: "adjective" },
    { id: "n5-l9-v9", kana: "むずかしい", kanji: "難しい", romaji: "muzukashii", english: "difficult", partOfSpeech: "adjective" },
    { id: "n5-l9-v10", kana: "やさしい", kanji: "易しい", romaji: "yasashii", english: "easy; kind", partOfSpeech: "adjective" },
    { id: "n5-l9-v11", kana: "なる", romaji: "naru", english: "to become", partOfSpeech: "verb" },
    { id: "n5-l9-v12", kana: "もう", romaji: "mou", english: "already; (with neg.) no longer", partOfSpeech: "adverb" },
    { id: "n5-l9-v13", kana: "まだ", romaji: "mada", english: "still; (with neg.) not yet", partOfSpeech: "adverb" },
    { id: "n5-l9-v14", kana: "かぶき", kanji: "歌舞伎", romaji: "kabuki", english: "kabuki theater", partOfSpeech: "noun" },
    { id: "n5-l9-v15", kana: "チケット", romaji: "chiketto", english: "ticket", partOfSpeech: "noun" },
    { id: "n5-l9-v16", kana: "せき", kanji: "席", romaji: "seki", english: "seat", partOfSpeech: "noun" },
    { id: "n5-l9-v17", kana: "りょこう", kanji: "旅行", romaji: "ryokou", english: "trip, travel", partOfSpeech: "noun" },
    { id: "n5-l9-v18", kana: "やすむ", kanji: "休む", romaji: "yasumu", english: "to rest, to take a day off", partOfSpeech: "verb" },
    { id: "n5-l9-v19", kana: "おわる", kanji: "終わる", romaji: "owaru", english: "to end, to finish (intrans.)", partOfSpeech: "verb" },
    { id: "n5-l9-v20", kana: "はじまる", kanji: "始まる", romaji: "hajimaru", english: "to begin (intrans.)", partOfSpeech: "verb" },
  ],
  listening: [
    {
      id: "n5-l9-li1",
      jp: "もう晩ご飯を食べましたか。 はい、もう食べました。",
      romaji: "Mou bangohan o tabemashita ka. Hai, mou tabemashita.",
      english: "Have you already eaten dinner? Yes, I already ate.",
      question: {
        id: "n5-l9-li1-q",
        prompt: "Has the speaker eaten dinner?",
        choices: ["Yes, already", "No, not yet", "Just starting", "Not stated"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l9-li2",
      jp: "宿題をしましたか。 まだしていません。",
      romaji: "Shukudai o shimashita ka. Mada shite imasen.",
      english: "Did you do your homework? Not yet.",
      question: {
        id: "n5-l9-li2-q",
        prompt: "Has the speaker done their homework?",
        choices: ["Not yet", "Already done", "Half done", "Just starting"],
        correctIndex: 0,
        explanation: "まだしていません = haven't done yet.",
      },
    },
    {
      id: "n5-l9-li3",
      jp: "アンナさんは明日来ますか。 来ないと言っていました。忙しいから。",
      romaji: "Anna-san wa ashita kimasu ka. Konai to itte imashita. Isogashii kara.",
      english: "Will Anna come tomorrow? She said she's not coming. Because she's busy.",
      question: {
        id: "n5-l9-li3-q",
        prompt: "Why isn't Anna coming?",
        choices: ["She's busy", "She's sick", "She's away", "She forgot"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l9-li4",
      jp: "今日は寒くなりましたね。",
      romaji: "Kyou wa samuku narimashita ne.",
      english: "It got cold today, didn't it?",
      question: {
        id: "n5-l9-li4-q",
        prompt: "What change is the speaker noting?",
        choices: ["It got cold", "It got warm", "It started raining", "It cleared up"],
        correctIndex: 0,
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson 10 — Winter Vacation Plans (Fuyu-yasumi no Keikaku)
// ---------------------------------------------------------------------

const N5_L10: LessonContent = {
  lessonId: "n5-l10",
  intro:
    "Lesson 10 is about choices: which is bigger, which is best, and what you intend to do. You'll learn to compare two things, pick the top of a group, and announce future plans with つもり.",
  grammar: [
    {
      id: "n5-l10-g1",
      pattern: "A は B より [adjective]",
      title: "Comparisons (A is more X than B)",
      explanation:
        "より marks the *thing being compared against*. A は B より大きいです = 'A is bigger than B'. To ask 'which is bigger?', use どちらのほうが [adj] ですか or [A] と [B] と どちらが [adj] ですか. The answer commonly takes [thing]のほうが [adj] です ('this side is more X').",
      examples: [
        { jp: "東京は大阪より大きいです。", romaji: "Toukyou wa Oosaka yori ookii desu.", en: "Tokyo is bigger than Osaka." },
        { jp: "コーヒーと紅茶とどちらが好きですか。", romaji: "Koohii to koucha to dochira ga suki desu ka?", en: "Which do you like more, coffee or tea?" },
        { jp: "コーヒーのほうが好きです。", romaji: "Koohii no hou ga suki desu.", en: "I like coffee more." },
      ],
      drills: [
        {
          id: "n5-l10-g1-d1",
          prompt: "Translate: 'Tokyo is bigger than Osaka.'",
          choices: [
            "東京は大阪より大きいです。",
            "東京より大阪は大きいです。",
            "東京は大阪が大きいです。",
            "大阪は東京より大きいです。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l10-g1-d2",
          prompt: "What does より mean here?",
          choices: ["than", "and", "or", "with"],
          correctIndex: 0,
        },
        {
          id: "n5-l10-g1-d3",
          prompt: "How do you ask 'which do you like more, coffee or tea?'",
          choices: [
            "コーヒーと紅茶とどちらが好きですか。",
            "コーヒーや紅茶やどちらが好きですか。",
            "コーヒーの紅茶のどちらは好きですか。",
            "コーヒーは紅茶よりどちらが好きですか。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l10-g2",
      pattern: "[group] の中で [item] が一番 [adj]",
      title: "Superlatives (the most X)",
      explanation:
        "一番 (*ichiban*) literally means 'number one'. Place it in front of an adjective to make a superlative: 一番大きい ('biggest'). To pick from a group, frame it with [group]の中で: クラスの中でアンナさんが一番背が高いです ('Among the class, Anna is the tallest').",
      examples: [
        { jp: "日本で富士山が一番高いです。", romaji: "Nihon de Fujisan ga ichiban takai desu.", en: "Mt. Fuji is the tallest in Japan." },
        { jp: "クラスの中でアンナさんが一番背が高いです。", romaji: "Kurasu no naka de Anna-san ga ichiban se ga takai desu.", en: "Anna is the tallest in the class." },
        { jp: "果物の中でりんごが一番好きです。", romaji: "Kudamono no naka de ringo ga ichiban suki desu.", en: "Among fruits, I like apples best." },
      ],
      drills: [
        {
          id: "n5-l10-g2-d1",
          prompt: "What does 一番 mean?",
          choices: ["the most / number one", "second", "first time", "again"],
          correctIndex: 0,
        },
        {
          id: "n5-l10-g2-d2",
          prompt: "Pick the natural sentence.",
          choices: [
            "クラスの中でアンナさんが一番背が高いです。",
            "クラスの中でアンナさんは背が一番高くないです。",
            "クラスはアンナさんが一番背が高いです中で。",
            "アンナさんが一番中でクラス背が高いです。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l10-g2-d3",
          prompt: "Translate: 'Mt. Fuji is the tallest in Japan.'",
          choices: [
            "日本で富士山が一番高いです。",
            "日本で富士山は一番より高いです。",
            "日本は富士山が一番高くないです。",
            "富士山は日本一番高いです。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l10-g3",
      pattern: "V (dictionary) + つもりです",
      title: "I plan / intend to…",
      explanation:
        "Attach つもりです to a dictionary-form verb to express intention: 'I intend to / am planning to'. The negative is V(short neg.) + つもりです: 行かないつもりです = 'I'm planning *not* to go'. つもり is firmer than 〜たい (just 'want to') — it means you've actually decided.",
      examples: [
        { jp: "夏休みに日本へ行くつもりです。", romaji: "Natsu-yasumi ni Nihon e iku tsumori desu.", en: "I plan to go to Japan during summer break." },
        { jp: "週末は何もしないつもりです。", romaji: "Shuumatsu wa nani mo shinai tsumori desu.", en: "I'm planning to do nothing on the weekend." },
        { jp: "明日勉強するつもりです。", romaji: "Ashita benkyou suru tsumori desu.", en: "I intend to study tomorrow." },
      ],
      drills: [
        {
          id: "n5-l10-g3-d1",
          prompt: "What form does the verb before つもりです take?",
          choices: ["dictionary form (or short negative)", "polite -ます form", "て-form", "past form"],
          correctIndex: 0,
        },
        {
          id: "n5-l10-g3-d2",
          prompt: "Translate: 'I plan to go to Japan during summer break.'",
          choices: [
            "夏休みに日本へ行くつもりです。",
            "夏休みに日本へ行きますつもりです。",
            "夏休みに日本へ行ってつもりです。",
            "夏休みに日本へ行ったつもりです。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l10-g3-d3",
          prompt: "How do you say 'I'm planning *not* to go'?",
          choices: [
            "行かないつもりです。",
            "行かなかったつもりです。",
            "行ってつもりじゃないです。",
            "行きませんつもりです。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l10-g4",
      pattern: "[Adj/N] + なる (review)",
      title: "Becoming X (review + use)",
      explanation:
        "Review from L9: い-adj drops い + く (大きくなる), な-adj/noun + に (静かになる, 学生になる). Combine with comparisons: 寒くなる ('to get cold'), もっと上手になる ('to get more skilled'). Often used in plans: 来年医者になります ('Next year I'll become a doctor').",
      examples: [
        { jp: "もっと上手になりたいです。", romaji: "Motto jouzu ni naritai desu.", en: "I want to get better." },
        { jp: "来年医者になります。", romaji: "Rainen isha ni narimasu.", en: "Next year I'll become a doctor." },
        { jp: "夜になると、寒くなります。", romaji: "Yoru ni naru to, samuku narimasu.", en: "When night comes, it gets cold." },
      ],
      drills: [
        {
          id: "n5-l10-g4-d1",
          prompt: "How do い-adjectives connect to なる?",
          choices: ["Drop い, add く", "Add に", "Add で", "Add と"],
          correctIndex: 0,
        },
        {
          id: "n5-l10-g4-d2",
          prompt: "Translate: 'Next year I'll become a doctor.'",
          choices: [
            "来年医者になります。",
            "来年医者がなります。",
            "来年医者でなります。",
            "来年医者くなります。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l10-g4-d3",
          prompt: "Pick the natural form: 'I want to get better at it.'",
          choices: [
            "もっと上手になりたいです。",
            "もっと上手くなりたいです。",
            "もっと上手のなりたいです。",
            "もっと上手でなりたいです。",
          ],
          correctIndex: 0,
          explanation: "上手 is a な-adjective, so it takes に before なる.",
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l10-v1", kana: "なつやすみ", kanji: "夏休み", romaji: "natsu-yasumi", english: "summer vacation", partOfSpeech: "noun" },
    { id: "n5-l10-v2", kana: "ふゆやすみ", kanji: "冬休み", romaji: "fuyu-yasumi", english: "winter vacation", partOfSpeech: "noun" },
    { id: "n5-l10-v3", kana: "けいかく", kanji: "計画", romaji: "keikaku", english: "plan", partOfSpeech: "noun" },
    { id: "n5-l10-v4", kana: "らいねん", kanji: "来年", romaji: "rainen", english: "next year", partOfSpeech: "noun" },
    { id: "n5-l10-v5", kana: "きょねん", kanji: "去年", romaji: "kyonen", english: "last year", partOfSpeech: "noun" },
    { id: "n5-l10-v6", kana: "らいげつ", kanji: "来月", romaji: "raigetsu", english: "next month", partOfSpeech: "noun" },
    { id: "n5-l10-v7", kana: "ふじさん", kanji: "富士山", romaji: "fujisan", english: "Mt. Fuji", partOfSpeech: "noun" },
    { id: "n5-l10-v8", kana: "やま", kanji: "山", romaji: "yama", english: "mountain", partOfSpeech: "noun" },
    { id: "n5-l10-v9", kana: "うみ", kanji: "海", romaji: "umi", english: "sea, ocean", partOfSpeech: "noun" },
    { id: "n5-l10-v10", kana: "クラス", romaji: "kurasu", english: "class", partOfSpeech: "noun" },
    { id: "n5-l10-v11", kana: "りんご", romaji: "ringo", english: "apple", partOfSpeech: "noun" },
    { id: "n5-l10-v12", kana: "こうちゃ", kanji: "紅茶", romaji: "koucha", english: "black tea", partOfSpeech: "noun" },
    { id: "n5-l10-v13", kana: "より", romaji: "yori", english: "than (comparison)", partOfSpeech: "particle" },
    { id: "n5-l10-v14", kana: "いちばん", kanji: "一番", romaji: "ichiban", english: "the most, number one", partOfSpeech: "adverb" },
    { id: "n5-l10-v15", kana: "どちら", romaji: "dochira", english: "which one (of two)", partOfSpeech: "expression" },
    { id: "n5-l10-v16", kana: "もっと", romaji: "motto", english: "more", partOfSpeech: "adverb" },
    { id: "n5-l10-v17", kana: "じょうず", kanji: "上手", romaji: "jouzu", english: "skilled (na-adj)", partOfSpeech: "adjective" },
    { id: "n5-l10-v18", kana: "へた", kanji: "下手", romaji: "heta", english: "unskilled (na-adj)", partOfSpeech: "adjective" },
    { id: "n5-l10-v19", kana: "つもり", romaji: "tsumori", english: "intention, plan", partOfSpeech: "noun" },
    { id: "n5-l10-v20", kana: "なに", kanji: "何", romaji: "nani", english: "what", partOfSpeech: "expression" },
    { id: "n5-l10-v21", kana: "なにも", kanji: "何も", romaji: "nani mo", english: "(with neg.) nothing", partOfSpeech: "expression" },
    { id: "n5-l10-v22", kana: "ぜんぶ", kanji: "全部", romaji: "zenbu", english: "all, everything", partOfSpeech: "noun" },
  ],
  listening: [
    {
      id: "n5-l10-li1",
      jp: "コーヒーと紅茶とどちらが好きですか。 コーヒーのほうが好きです。",
      romaji: "Koohii to koucha to dochira ga suki desu ka. Koohii no hou ga suki desu.",
      english: "Which do you like more, coffee or tea? I like coffee more.",
      question: {
        id: "n5-l10-li1-q",
        prompt: "Which does the speaker prefer?",
        choices: ["Coffee", "Tea", "Both equally", "Neither"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l10-li2",
      jp: "クラスの中でだれが一番背が高いですか。 アンナさんです。",
      romaji: "Kurasu no naka de dare ga ichiban se ga takai desu ka. Anna-san desu.",
      english: "Who's the tallest in the class? Anna.",
      question: {
        id: "n5-l10-li2-q",
        prompt: "Who is the tallest in the class?",
        choices: ["Anna", "The teacher", "Yamada", "Robert"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l10-li3",
      jp: "夏休みに何をしますか。 日本へ行くつもりです。",
      romaji: "Natsu-yasumi ni nani o shimasu ka. Nihon e iku tsumori desu.",
      english: "What will you do during summer break? I plan to go to Japan.",
      question: {
        id: "n5-l10-li3-q",
        prompt: "What does the speaker plan to do?",
        choices: ["Go to Japan", "Go to Okinawa", "Stay home", "Take a break"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l10-li4",
      jp: "来年は何になりますか。 医者になります。",
      romaji: "Rainen wa nani ni narimasu ka. Isha ni narimasu.",
      english: "What will you become next year? I'll become a doctor.",
      question: {
        id: "n5-l10-li4-q",
        prompt: "What does the speaker want to become?",
        choices: ["A doctor", "A teacher", "A company employee", "A student"],
        correctIndex: 0,
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson 11 — After the Vacation (Yasumi no Ato)
// ---------------------------------------------------------------------

const N5_L11: LessonContent = {
  lessonId: "n5-l11",
  intro:
    "Lesson 11 is about wants and experiences. You'll learn how to say what you *want to do* with -たい, list a sample of activities with -たり…-たり, and brag (or confess) about things you've done before with ことがあります.",
  grammar: [
    {
      id: "n5-l11-g1",
      pattern: "V(stem) + たい",
      title: "Want to do…",
      explanation:
        "Drop -ます from a verb and add たい to express desire: 食べる → 食べたい ('want to eat'), 行く → 行きたい ('want to go'). たい conjugates *like an い-adjective*: negative たくない, past たかった. Note: the object of want can take が *or* を — both are accepted natively.",
      examples: [
        { jp: "寿司を食べたいです。", romaji: "Sushi o tabetai desu.", en: "I want to eat sushi." },
        { jp: "日本へ行きたかったです。", romaji: "Nihon e ikitakatta desu.", en: "I wanted to go to Japan." },
        { jp: "今日は何もしたくないです。", romaji: "Kyou wa nani mo shitakunai desu.", en: "I don't want to do anything today." },
      ],
      drills: [
        {
          id: "n5-l11-g1-d1",
          prompt: "How do you say 'I want to eat'?",
          choices: ["食べたいです。", "食べますたいです。", "食べてたいです。", "食べるたいです。"],
          correctIndex: 0,
          explanation: "Drop -ます, add たい.",
        },
        {
          id: "n5-l11-g1-d2",
          prompt: "What's the past form of 食べたい?",
          choices: ["食べたかった", "食べたかったでした", "食べました", "食べてたかった"],
          correctIndex: 0,
          explanation: "たい conjugates as an い-adjective.",
        },
        {
          id: "n5-l11-g1-d3",
          prompt: "Negative of 行きたい?",
          choices: ["行きたくない", "行きたいない", "行きませんたい", "行きたくありません"],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l11-g2",
      pattern: "V(た) + り、V(た) + り します",
      title: "Listing sample activities",
      explanation:
        "Form the past short form of two (or more) verbs and add り, then close with します: 食べたり、飲んだりします. This means '(among other things) I eat and drink' — it implies a *non-exhaustive* list. Perfect for describing what you did on a vacation. Past version: -たりしました.",
      examples: [
        { jp: "週末は映画を見たり、買い物をしたりします。", romaji: "Shuumatsu wa eiga o mitari, kaimono o shitari shimasu.", en: "On weekends I (for example) watch movies and go shopping." },
        { jp: "夏休みは泳いだり、ハイキングをしたりしました。", romaji: "Natsu-yasumi wa oyoidari, haikingu o shitari shimashita.", en: "Over summer break I swam and hiked, among other things." },
        { jp: "毎日勉強したり、運動したりします。", romaji: "Mainichi benkyou shitari, undou shitari shimasu.", en: "I study, exercise, etc., every day." },
      ],
      drills: [
        {
          id: "n5-l11-g2-d1",
          prompt: "What form do the verbs in -たり take?",
          choices: ["short past (た-form) + り", "dictionary form + り", "て-form + り", "-ます stem + り"],
          correctIndex: 0,
        },
        {
          id: "n5-l11-g2-d2",
          prompt: "What does -たり…-たりします *imply* about the list?",
          choices: [
            "It's a sample, not exhaustive",
            "It's the complete list",
            "Each happened once",
            "The order matters",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l11-g2-d3",
          prompt: "Translate: 'On weekends I watch movies and shop, among other things.'",
          choices: [
            "週末は映画を見たり、買い物をしたりします。",
            "週末は映画を見て、買い物をします。",
            "週末は映画を見ます、買い物もします。",
            "週末は映画を見るし、買い物をするし。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l11-g3",
      pattern: "V(た) + ことがあります",
      title: "Have done before (experience)",
      explanation:
        "Take a short past verb and add ことがあります to mean 'have the experience of doing X'. 日本へ行ったことがあります = 'I have been to Japan.' The negative ことがありません = 'have never'. Don't confuse with simple past — this is about *life experience*.",
      examples: [
        { jp: "日本へ行ったことがあります。", romaji: "Nihon e itta koto ga arimasu.", en: "I have been to Japan." },
        { jp: "寿司を食べたことがありません。", romaji: "Sushi o tabeta koto ga arimasen.", en: "I have never eaten sushi." },
        { jp: "馬に乗ったことがあります。", romaji: "Uma ni notta koto ga arimasu.", en: "I have ridden a horse." },
      ],
      drills: [
        {
          id: "n5-l11-g3-d1",
          prompt: "What form does the verb take before ことがあります?",
          choices: ["short past (た-form)", "dictionary form", "te-form", "-ます stem"],
          correctIndex: 0,
        },
        {
          id: "n5-l11-g3-d2",
          prompt: "Translate: 'I have never eaten sushi.'",
          choices: [
            "寿司を食べたことがありません。",
            "寿司を食べないことがありません。",
            "寿司を食べることがありません。",
            "寿司を食べてないです。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l11-g3-d3",
          prompt: "What's the difference from simple past 食べました?",
          choices: [
            "ことがあります = life experience; past = a specific time",
            "No difference",
            "ことがあります is more polite",
            "ことがあります is future-oriented",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l11-g4",
      pattern: "Noun + や + Noun + (など)",
      title: "Non-exhaustive lists with や",
      explanation:
        "や is the *partial-list* version of と. と lists items exhaustively ('A and B'); や lists examples ('A, B, etc.'). Often paired with など at the end for extra emphasis: りんごやバナナなど ('apples, bananas, and so on'). Common with food, hobbies, places.",
      examples: [
        { jp: "りんごやバナナを買いました。", romaji: "Ringo ya banana o kaimashita.", en: "I bought apples, bananas, and the like." },
        { jp: "京都や大阪などへ行きたいです。", romaji: "Kyouto ya Oosaka nado e ikitai desu.", en: "I want to go to Kyoto, Osaka, etc." },
        { jp: "野菜や果物を食べます。", romaji: "Yasai ya kudamono o tabemasu.", en: "I eat vegetables, fruits, etc." },
      ],
      drills: [
        {
          id: "n5-l11-g4-d1",
          prompt: "Difference between と and や?",
          choices: [
            "と is exhaustive; や is a partial list",
            "や is exhaustive; と is partial",
            "They are interchangeable",
            "や is for verbs, と for nouns",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l11-g4-d2",
          prompt: "Translate: 'I bought apples, bananas, etc.'",
          choices: [
            "りんごやバナナを買いました。",
            "りんごとバナナを買いました。",
            "りんごのバナナを買いました。",
            "りんごやバナナを買って。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l11-g4-d3",
          prompt: "What word often follows や lists for emphasis?",
          choices: ["など", "から", "まで", "より"],
          correctIndex: 0,
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l11-v1", kana: "すし", kanji: "寿司", romaji: "sushi", english: "sushi", partOfSpeech: "noun" },
    { id: "n5-l11-v2", kana: "おにぎり", romaji: "onigiri", english: "rice ball", partOfSpeech: "noun" },
    { id: "n5-l11-v3", kana: "ラーメン", romaji: "raamen", english: "ramen", partOfSpeech: "noun" },
    { id: "n5-l11-v4", kana: "バナナ", romaji: "banana", english: "banana", partOfSpeech: "noun" },
    { id: "n5-l11-v5", kana: "かいもの", kanji: "買い物", romaji: "kaimono", english: "shopping", partOfSpeech: "noun" },
    { id: "n5-l11-v6", kana: "うんどう", kanji: "運動", romaji: "undou", english: "exercise", partOfSpeech: "noun" },
    { id: "n5-l11-v7", kana: "ハイキング", romaji: "haikingu", english: "hiking", partOfSpeech: "noun" },
    { id: "n5-l11-v8", kana: "りょうり", kanji: "料理", romaji: "ryouri", english: "cooking, cuisine", partOfSpeech: "noun" },
    { id: "n5-l11-v9", kana: "つくる", kanji: "作る", romaji: "tsukuru", english: "to make", partOfSpeech: "verb" },
    { id: "n5-l11-v10", kana: "のる", kanji: "乗る", romaji: "noru", english: "to ride, to board", partOfSpeech: "verb" },
    { id: "n5-l11-v11", kana: "うま", kanji: "馬", romaji: "uma", english: "horse", partOfSpeech: "noun" },
    { id: "n5-l11-v12", kana: "や", romaji: "ya", english: "and (partial list)", partOfSpeech: "particle" },
    { id: "n5-l11-v13", kana: "など", romaji: "nado", english: "and so on, etc.", partOfSpeech: "particle" },
    { id: "n5-l11-v14", kana: "ぜひ", romaji: "zehi", english: "by all means, definitely", partOfSpeech: "adverb" },
    { id: "n5-l11-v15", kana: "まいにち", kanji: "毎日", romaji: "mainichi", english: "every day", partOfSpeech: "noun" },
    { id: "n5-l11-v16", kana: "まいしゅう", kanji: "毎週", romaji: "maishuu", english: "every week", partOfSpeech: "noun" },
    { id: "n5-l11-v17", kana: "ほしい", kanji: "欲しい", romaji: "hoshii", english: "want (a thing)", partOfSpeech: "adjective" },
    { id: "n5-l11-v18", kana: "あう", kanji: "会う", romaji: "au", english: "to meet", partOfSpeech: "verb" },
    { id: "n5-l11-v19", kana: "とまる", kanji: "泊まる", romaji: "tomaru", english: "to stay (overnight)", partOfSpeech: "verb" },
    { id: "n5-l11-v20", kana: "ホテル", romaji: "hoteru", english: "hotel", partOfSpeech: "noun" },
  ],
  listening: [
    {
      id: "n5-l11-li1",
      jp: "夏休みに何をしたいですか。 日本へ行きたいです。",
      romaji: "Natsu-yasumi ni nani o shitai desu ka. Nihon e ikitai desu.",
      english: "What do you want to do during summer break? I want to go to Japan.",
      question: {
        id: "n5-l11-li1-q",
        prompt: "What does the speaker want to do?",
        choices: ["Go to Japan", "Go shopping", "Stay home", "Visit family"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l11-li2",
      jp: "週末は何をしますか。 映画を見たり、買い物をしたりします。",
      romaji: "Shuumatsu wa nani o shimasu ka. Eiga o mitari, kaimono o shitari shimasu.",
      english: "What do you do on weekends? I watch movies and go shopping (among other things).",
      question: {
        id: "n5-l11-li2-q",
        prompt: "What does the speaker do on weekends?",
        choices: ["Movies and shopping", "Studies and works", "Sleeps and eats", "Cleans and cooks"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l11-li3",
      jp: "寿司を食べたことがありますか。 いいえ、ありません。",
      romaji: "Sushi o tabeta koto ga arimasu ka. Iie, arimasen.",
      english: "Have you ever eaten sushi? No, I haven't.",
      question: {
        id: "n5-l11-li3-q",
        prompt: "Has the speaker eaten sushi before?",
        choices: ["No, never", "Yes, once", "Yes, many times", "Only at home"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l11-li4",
      jp: "京都や大阪などへ行きたいです。",
      romaji: "Kyouto ya Oosaka nado e ikitai desu.",
      english: "I want to go to Kyoto, Osaka, and other places.",
      question: {
        id: "n5-l11-li4-q",
        prompt: "Where does the speaker want to go?",
        choices: ["Kyoto, Osaka, etc.", "Only Tokyo", "Mt. Fuji and Okinawa", "Anywhere abroad"],
        correctIndex: 0,
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson 12 — Feeling Ill (Byouki)
// ---------------------------------------------------------------------

const N5_L12: LessonContent = {
  lessonId: "n5-l12",
  intro:
    "Lesson 12 closes out N5 with the language of obligation, explanation, and excess — exactly what you need at the doctor's office. You'll learn the must / mustn't pair, how to soften your phrasing with んです, and how to say something is *too* much with すぎる.",
  grammar: [
    {
      id: "n5-l12-g1",
      pattern: "V(short neg.) → -なければいけません",
      title: "Must do…",
      explanation:
        "Take the short negative (e.g. 行かない), drop the final い and add ければいけません: 行かなければいけません = 'I must go.' Casual short version: -なきゃ. Yes, it's a long ending — Japanese makes obligation feel heavy on purpose.",
      examples: [
        { jp: "薬を飲まなければいけません。", romaji: "Kusuri o nomanakereba ikemasen.", en: "I have to take medicine." },
        { jp: "明日早く起きなければいけません。", romaji: "Ashita hayaku okinakereba ikemasen.", en: "I must wake up early tomorrow." },
        { jp: "宿題をしなきゃ。", romaji: "Shukudai o shinakya.", en: "I gotta do my homework. (casual)" },
      ],
      drills: [
        {
          id: "n5-l12-g1-d1",
          prompt: "Build 'must take medicine' from 飲む.",
          choices: [
            "薬を飲まなければいけません。",
            "薬を飲むなければいけません。",
            "薬を飲まないいけません。",
            "薬を飲んでいけません。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l12-g1-d2",
          prompt: "Casual short form of -なければいけません?",
          choices: ["-なきゃ", "-ないと", "-ねば", "-てもいい"],
          correctIndex: 0,
        },
        {
          id: "n5-l12-g1-d3",
          prompt: "Translate: 'I must wake up early tomorrow.'",
          choices: [
            "明日早く起きなければいけません。",
            "明日早く起きてはいけません。",
            "明日早く起きないといけません。",
            "明日早く起きるなければいけません。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l12-g2",
      pattern: "V(short neg.) → -なくてもいいです",
      title: "Don't have to / it's OK not to",
      explanation:
        "Take the short negative (行かない), drop い, add くてもいいです: 行かなくてもいいです = 'You don't have to go.' This is the polite opposite of -なければいけません. Don't confuse with -てはいけません ('must not') — those are opposites.",
      examples: [
        { jp: "明日来なくてもいいです。", romaji: "Ashita konakute mo ii desu.", en: "You don't have to come tomorrow." },
        { jp: "薬を飲まなくてもいいです。", romaji: "Kusuri o nomanakute mo ii desu.", en: "You don't need to take medicine." },
        { jp: "宿題をしなくてもいいです。", romaji: "Shukudai o shinakute mo ii desu.", en: "You don't have to do the homework." },
      ],
      drills: [
        {
          id: "n5-l12-g2-d1",
          prompt: "What's the difference: -なくてもいい vs -てはいけません?",
          choices: [
            "Don't have to vs must not",
            "Must vs may",
            "Want vs don't want",
            "They mean the same",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l12-g2-d2",
          prompt: "Translate: 'You don't have to come tomorrow.'",
          choices: [
            "明日来なくてもいいです。",
            "明日来てはいけません。",
            "明日来てもいいです。",
            "明日来なければいけません。",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l12-g2-d3",
          prompt: "Build: 'You don't have to take medicine.' from 飲む.",
          choices: [
            "薬を飲まなくてもいいです。",
            "薬を飲んでもいいです。",
            "薬を飲んではいけません。",
            "薬を飲まないでください。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l12-g3",
      pattern: "[Short form] + んです",
      title: "Explanatory んです",
      explanation:
        "んです (sometimes のです) attaches to a short-form clause to provide *background or explanation*. 'I'm late, [you see]…' = 遅れました — *because* I missed the train (電車に乗れなかったんです). Use it to explain a situation or to ask for / provide context. It softens questions: どうしたんですか? = 'What's the matter?' (literally 'what is it that happened?').",
      examples: [
        { jp: "頭が痛いんです。", romaji: "Atama ga itai n desu.", en: "(It's that) my head hurts." },
        { jp: "どうしたんですか。", romaji: "Doushita n desu ka?", en: "What's wrong? / What happened?" },
        { jp: "明日休むんです。風邪なんです。", romaji: "Ashita yasumu n desu. Kaze nan desu.", en: "I'm taking tomorrow off — I have a cold (you see)." },
      ],
      drills: [
        {
          id: "n5-l12-g3-d1",
          prompt: "What does んです add to a sentence?",
          choices: [
            "Background / explanation tone",
            "Past tense",
            "Politeness only",
            "Negation",
          ],
          correctIndex: 0,
        },
        {
          id: "n5-l12-g3-d2",
          prompt: "How does んです attach to a noun like 風邪?",
          choices: ["風邪なんです", "風邪んです", "風邪だんです", "風邪のんです"],
          correctIndex: 0,
          explanation: "Nouns / な-adj need な before んです.",
        },
        {
          id: "n5-l12-g3-d3",
          prompt: "Translate: 'My head hurts (you see).'",
          choices: [
            "頭が痛いんです。",
            "頭が痛いです。",
            "頭が痛くんです。",
            "頭が痛いだんです。",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: "n5-l12-g4",
      pattern: "[V-stem / Adj-stem] + すぎる",
      title: "Too much / overly…",
      explanation:
        "Attach すぎる to express excess. For verbs, drop -ます: 食べる → 食べすぎる ('overeat'). For い-adj, drop い: 高い → 高すぎる ('too expensive'). For な-adj, just attach to the stem: 静かすぎる ('too quiet'). すぎる itself is a regular る-verb: past 食べすぎた, polite 食べすぎます.",
      examples: [
        { jp: "昨日食べすぎました。", romaji: "Kinou tabesugimashita.", en: "I ate too much yesterday." },
        { jp: "この本は高すぎます。", romaji: "Kono hon wa takasugimasu.", en: "This book is too expensive." },
        { jp: "この部屋は静かすぎる。", romaji: "Kono heya wa shizuka sugiru.", en: "This room is too quiet." },
      ],
      drills: [
        {
          id: "n5-l12-g4-d1",
          prompt: "How do you say 'too expensive'?",
          choices: ["高すぎる", "高くすぎる", "高いすぎる", "高にすぎる"],
          correctIndex: 0,
          explanation: "い-adj drops い before すぎる.",
        },
        {
          id: "n5-l12-g4-d2",
          prompt: "Translate: 'I ate too much.'",
          choices: ["食べすぎました。", "食べてすぎました。", "食べるすぎました。", "食べくすぎました。"],
          correctIndex: 0,
        },
        {
          id: "n5-l12-g4-d3",
          prompt: "How does な-adj attach?",
          choices: [
            "Just attach すぎる to the stem",
            "Add に before すぎる",
            "Add で before すぎる",
            "Add な before すぎる",
          ],
          correctIndex: 0,
          explanation: "Attach directly: 静か + すぎる.",
        },
      ],
    },
  ],
  vocab: [
    { id: "n5-l12-v1", kana: "びょうき", kanji: "病気", romaji: "byouki", english: "illness", partOfSpeech: "noun" },
    { id: "n5-l12-v2", kana: "かぜ", kanji: "風邪", romaji: "kaze", english: "a cold", partOfSpeech: "noun" },
    { id: "n5-l12-v3", kana: "ねつ", kanji: "熱", romaji: "netsu", english: "a fever", partOfSpeech: "noun" },
    { id: "n5-l12-v4", kana: "くすり", kanji: "薬", romaji: "kusuri", english: "medicine", partOfSpeech: "noun" },
    { id: "n5-l12-v5", kana: "あたま", kanji: "頭", romaji: "atama", english: "head", partOfSpeech: "noun" },
    { id: "n5-l12-v6", kana: "おなか", romaji: "onaka", english: "stomach", partOfSpeech: "noun" },
    { id: "n5-l12-v7", kana: "は", kanji: "歯", romaji: "ha", english: "tooth", partOfSpeech: "noun" },
    { id: "n5-l12-v8", kana: "のど", romaji: "nodo", english: "throat", partOfSpeech: "noun" },
    { id: "n5-l12-v9", kana: "あし", kanji: "足", romaji: "ashi", english: "leg, foot", partOfSpeech: "noun" },
    { id: "n5-l12-v10", kana: "て", kanji: "手", romaji: "te", english: "hand", partOfSpeech: "noun" },
    { id: "n5-l12-v11", kana: "いたい", kanji: "痛い", romaji: "itai", english: "painful, sore", partOfSpeech: "adjective" },
    { id: "n5-l12-v12", kana: "つかれる", kanji: "疲れる", romaji: "tsukareru", english: "to get tired", partOfSpeech: "verb" },
    { id: "n5-l12-v13", kana: "はやく", kanji: "早く", romaji: "hayaku", english: "early, quickly (adv.)", partOfSpeech: "adverb" },
    { id: "n5-l12-v14", kana: "おそく", kanji: "遅く", romaji: "osoku", english: "late (adv.)", partOfSpeech: "adverb" },
    { id: "n5-l12-v15", kana: "おくれる", kanji: "遅れる", romaji: "okureru", english: "to be late", partOfSpeech: "verb" },
    { id: "n5-l12-v16", kana: "いそぐ", kanji: "急ぐ", romaji: "isogu", english: "to hurry", partOfSpeech: "verb" },
    { id: "n5-l12-v17", kana: "へや", kanji: "部屋", romaji: "heya", english: "room", partOfSpeech: "noun" },
    { id: "n5-l12-v18", kana: "どうしたんですか", romaji: "doushita n desu ka", english: "what's wrong?", partOfSpeech: "expression" },
    { id: "n5-l12-v19", kana: "だいじょうぶ", kanji: "大丈夫", romaji: "daijoubu", english: "OK, fine (na-adj)", partOfSpeech: "adjective" },
    { id: "n5-l12-v20", kana: "おだいじに", kanji: "お大事に", romaji: "odaiji ni", english: "take care (when ill)", partOfSpeech: "expression" },
    { id: "n5-l12-v21", kana: "すぎる", kanji: "過ぎる", romaji: "sugiru", english: "to exceed; -too much (suffix)", partOfSpeech: "verb" },
    { id: "n5-l12-v22", kana: "なおる", kanji: "治る", romaji: "naoru", english: "to get better, to heal", partOfSpeech: "verb" },
  ],
  listening: [
    {
      id: "n5-l12-li1",
      jp: "どうしたんですか。 頭が痛いんです。",
      romaji: "Doushita n desu ka. Atama ga itai n desu.",
      english: "What's wrong? My head hurts.",
      question: {
        id: "n5-l12-li1-q",
        prompt: "What is the speaker's problem?",
        choices: ["Headache", "Stomachache", "Sore throat", "Toothache"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l12-li2",
      jp: "明日休まなければいけません。風邪なんです。",
      romaji: "Ashita yasumanakereba ikemasen. Kaze nan desu.",
      english: "I have to take tomorrow off. I have a cold.",
      question: {
        id: "n5-l12-li2-q",
        prompt: "Why is the speaker taking tomorrow off?",
        choices: ["Has a cold", "Is travelling", "Has an exam", "Is too busy"],
        correctIndex: 0,
      },
    },
    {
      id: "n5-l12-li3",
      jp: "薬を飲まなくてもいいですか。 はい、大丈夫です。",
      romaji: "Kusuri o nomanakute mo ii desu ka. Hai, daijoubu desu.",
      english: "Is it OK if I don't take the medicine? Yes, that's fine.",
      question: {
        id: "n5-l12-li3-q",
        prompt: "Does the speaker need to take the medicine?",
        choices: ["No, it's optional", "Yes, definitely", "Only at night", "Only with food"],
        correctIndex: 0,
        explanation: "飲まなくてもいい = don't have to take.",
      },
    },
    {
      id: "n5-l12-li4",
      jp: "昨日食べすぎました。今日はおなかが痛いんです。",
      romaji: "Kinou tabesugimashita. Kyou wa onaka ga itai n desu.",
      english: "I ate too much yesterday. Today my stomach hurts.",
      question: {
        id: "n5-l12-li4-q",
        prompt: "Why does the speaker's stomach hurt?",
        choices: ["Ate too much yesterday", "Caught a cold", "Ate something bad", "Skipped meals"],
        correctIndex: 0,
      },
    },
  ],
}

// ---------------------------------------------------------------------
// Lesson registry
// ---------------------------------------------------------------------

/** All lessons that have full pedagogical content. Lessons NOT in this
 *  map are treated as "coming soon" by the Dojo — their cards still
 *  render (from `dojo.ts`) but the drill UI gates with a placeholder.
 *  Add a new lesson by writing a `LessonContent` constant above and
 *  registering it here. */
const LESSON_CONTENT: Record<string, LessonContent> = {
  "n5-l1": N5_L1,
  "n5-l2": N5_L2,
  "n5-l3": N5_L3,
  "n5-l4": N5_L4,
  "n5-l5": N5_L5,
  "n5-l6": N5_L6,
  "n5-l7": N5_L7,
  "n5-l8": N5_L8,
  "n5-l9": N5_L9,
  "n5-l10": N5_L10,
  "n5-l11": N5_L11,
  "n5-l12": N5_L12,
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

/** Returns the lesson's full content, or null if it hasn't been
 *  authored yet (still a coming-soon stub in `dojo.ts`). */
export function getLessonContent(lessonId: string): LessonContent | null {
  return LESSON_CONTENT[lessonId] ?? null
}

/** True when a lesson has authored content for every section. The
 *  Dojo browser uses this to decide whether a lesson card should
 *  link to drills or render in coming-soon mode. */
export function hasLessonContent(lessonId: string): boolean {
  const lesson = LESSON_CONTENT[lessonId]
  if (!lesson) return false
  return (
    lesson.grammar.length > 0 &&
    lesson.vocab.length > 0 &&
    lesson.listening.length > 0
  )
}

/** Section sizes derived from authored content. Falls back to 0 when
 *  a section hasn't been written. `dojo.ts` reads this so that the
 *  catalog displays *real* counts wherever content exists. */
export function getLessonContentCounts(lessonId: string): {
  grammar: number
  vocab: number
  listening: number
} {
  const lesson = LESSON_CONTENT[lessonId]
  if (!lesson) return { grammar: 0, vocab: 0, listening: 0 }
  return {
    grammar: lesson.grammar.length,
    vocab: lesson.vocab.length,
    listening: lesson.listening.length,
  }
}

/** Listening prompts for a lesson. Returns [] for unauthored lessons.
 *  Used by the listening drill UI which needs the JP / romaji / english
 *  text on top of just the comprehension question. */
export function getListeningPrompts(lessonId: string): readonly ListeningPrompt[] {
  return LESSON_CONTENT[lessonId]?.listening ?? []
}

/** Pulls the drill question pool for a given section. Vocab drills
 *  are derived dynamically (kana → english multiple choice with
 *  same-lesson distractors) since they'd be repetitive to author by
 *  hand. Grammar drills come straight from the grammar points.
 *  Listening drills are the comprehension question on each prompt. */
export function getSectionDrills(
  lessonId: string,
  section: "grammar" | "vocab" | "listening",
): readonly DrillQuestion[] {
  const lesson = LESSON_CONTENT[lessonId]
  if (!lesson) return []
  if (section === "grammar") {
    return lesson.grammar.flatMap((g) => g.drills)
  }
  if (section === "listening") {
    return lesson.listening.map((p) => p.question)
  }
  // Vocab: build one MC question per item (kana/kanji → english).
  // Distractors come from other vocab in the same lesson so they
  // feel related rather than random.
  return lesson.vocab.map<DrillQuestion>((item, idx) => {
    const distractors = lesson.vocab
      .filter((_, i) => i !== idx)
      .map((d) => d.english)
    const sample = pickThree(distractors, item.id)
    const choicesUnordered = [item.english, ...sample]
    const correctIndex = stableShuffleIndex(item.id, choicesUnordered.length)
    const choices = swap(choicesUnordered, 0, correctIndex)
    return {
      id: `${item.id}-drill`,
      prompt: `What does ${item.kanji ?? item.kana} mean?`,
      choices,
      correctIndex,
      explanation: `${item.kana}${item.kanji ? ` (${item.kanji})` : ""} — ${item.english}.`,
    }
  })
}

// Tiny deterministic helpers so vocab drills don't reshuffle on every
// render but still vary across items.
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
function pickThree<T>(pool: readonly T[], seed: string): T[] {
  if (pool.length <= 3) return [...pool]
  const start = hashString(seed) % pool.length
  const out: T[] = []
  for (let i = 0; i < 3; i++) {
    out.push(pool[(start + i * 7) % pool.length])
  }
  return out
}
function stableShuffleIndex(seed: string, length: number): number {
  return hashString(`${seed}:pos`) % length
}
function swap<T>(arr: T[], i: number, j: number): T[] {
  if (i === j) return arr
  const copy = [...arr]
  ;[copy[i], copy[j]] = [copy[j], copy[i]]
  return copy
}
