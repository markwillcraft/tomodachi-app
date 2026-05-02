// =====================================================================
// Reading mode seed bank
// ---------------------------------------------------------------------
// Source data for the `ReadingWord` table that powers the Hiragana /
// Katakana quiz Reading mode (see README §Quiz engine and the plan in
// .cursor/docs/roadmap/12-words-transfer-to-database.md for the
// admin-CRUD follow-up that lets ops mutate this without a redeploy).
//
// Layout target: 4 stages × 5 daily-cycle slots × 50 words = 1000 rows.
//
//   stage 1 = 2-mora words   (e.g. いぬ, ねこ, てら, ほん)
//   stage 2 = 3-mora words   (e.g. さかな, がっこう, わたし)
//   stage 3 = 4-mora words   (e.g. ともだち, たべます, コーヒー)
//   stage 4 = 5-mora words   (e.g. ありがとう, すみません, こんにちは)
//
// Authoring contract for the lists below:
//
//   * `display` is the form a learner reads on the card. Native
//     vocabulary is hiragana; loanwords stay in their natural
//     katakana (パソコン, コーヒー).
//   * `romaji` is lowercased Hepburn — what `speakJapanese()` should
//     ultimately produce.
//   * `english` is a short gloss (≤4 words) — what shows under the
//     romaji on reveal.
//   * `kanji` is optional and reserved for a future "show kanji on
//     reveal" toggle. Adding it now is harmless; the play loop
//     ignores it in MVP.
//
// The seed runner (`prisma/seed.ts`) computes
// `splitMora(display).length` and asserts it matches the stage's
// mora bin BEFORE it ever opens a DB connection — so a bad row
// breaks `npx prisma db seed` cleanly instead of silently shipping
// wrong content.
//
// Each per-stage list below holds **exactly 50 unique words**. The
// seed runner expands each list to 250 rows (50 × 5 dayOfCycle
// slots) by reusing the same 50 words across all five weekday sets,
// but with the `sortIndex` rotated per dayOfCycle so a learner who
// plays Monday and then Tuesday doesn't see the cards in the same
// order. This v1 content depth is intentional — the schema, API,
// and play loop fully support 250 unique per stage; growing the
// bank to that depth is left to admin tooling once roadmap 12
// ships, since 1000 hand-curated bilingual rows is a content-team
// effort larger than this PR.
// =====================================================================

export type ReadingWordSeed = {
  /** Form a learner reads on the card. Hiragana for native words,
   *  katakana for loanwords; the seed asserts splitMora(display)
   *  matches the stage's mora bin. */
  display: string;
  /** Hepburn romaji shown on reveal. */
  romaji: string;
  /** Short English gloss shown under the romaji. */
  english: string;
  /** Optional kanji form. Reserved for a future toggle; not rendered
   *  in MVP. */
  kanji?: string;
};

// ---------------------------------------------------------------------
// Stage 1 — 2-mora words (50)
// ---------------------------------------------------------------------
// Mostly single-character kanji nouns plus a handful of high-frequency
// loanwords. Every entry is exactly two mora as counted by splitMora().
export const STAGE_1_BASE: readonly ReadingWordSeed[] = [
  // Animals
  { display: "いぬ", romaji: "inu", english: "dog", kanji: "犬" },
  { display: "ねこ", romaji: "neko", english: "cat", kanji: "猫" },
  { display: "うま", romaji: "uma", english: "horse", kanji: "馬" },
  { display: "うし", romaji: "ushi", english: "cow", kanji: "牛" },
  { display: "ぶた", romaji: "buta", english: "pig", kanji: "豚" },
  { display: "とり", romaji: "tori", english: "bird", kanji: "鳥" },
  { display: "さる", romaji: "saru", english: "monkey", kanji: "猿" },
  { display: "くま", romaji: "kuma", english: "bear", kanji: "熊" },
  { display: "へび", romaji: "hebi", english: "snake", kanji: "蛇" },
  { display: "かに", romaji: "kani", english: "crab", kanji: "蟹" },
  { display: "たこ", romaji: "tako", english: "octopus", kanji: "蛸" },
  { display: "いか", romaji: "ika", english: "squid" },
  { display: "えび", romaji: "ebi", english: "shrimp" },
  { display: "ぞう", romaji: "zou", english: "elephant", kanji: "象" },
  { display: "ちょう", romaji: "chou", english: "butterfly", kanji: "蝶" },

  // Body
  { display: "かお", romaji: "kao", english: "face", kanji: "顔" },
  { display: "くち", romaji: "kuchi", english: "mouth", kanji: "口" },
  { display: "みみ", romaji: "mimi", english: "ear", kanji: "耳" },
  { display: "あし", romaji: "ashi", english: "leg / foot", kanji: "足" },
  { display: "ゆび", romaji: "yubi", english: "finger", kanji: "指" },
  { display: "うで", romaji: "ude", english: "arm", kanji: "腕" },
  { display: "かた", romaji: "kata", english: "shoulder", kanji: "肩" },
  { display: "ひざ", romaji: "hiza", english: "knee", kanji: "膝" },
  { display: "むね", romaji: "mune", english: "chest", kanji: "胸" },
  { display: "ほね", romaji: "hone", english: "bone", kanji: "骨" },

  // Nature
  { display: "やま", romaji: "yama", english: "mountain", kanji: "山" },
  { display: "うみ", romaji: "umi", english: "sea", kanji: "海" },
  { display: "かわ", romaji: "kawa", english: "river", kanji: "川" },
  { display: "そら", romaji: "sora", english: "sky", kanji: "空" },
  { display: "くも", romaji: "kumo", english: "cloud", kanji: "雲" },
  { display: "つき", romaji: "tsuki", english: "moon", kanji: "月" },
  { display: "ほし", romaji: "hoshi", english: "star", kanji: "星" },
  { display: "あめ", romaji: "ame", english: "rain", kanji: "雨" },
  { display: "ゆき", romaji: "yuki", english: "snow", kanji: "雪" },
  { display: "かぜ", romaji: "kaze", english: "wind", kanji: "風" },
  { display: "もり", romaji: "mori", english: "forest", kanji: "森" },
  { display: "いし", romaji: "ishi", english: "stone", kanji: "石" },
  { display: "はな", romaji: "hana", english: "flower / nose", kanji: "花" },
  { display: "くさ", romaji: "kusa", english: "grass", kanji: "草" },
  { display: "みず", romaji: "mizu", english: "water", kanji: "水" },

  // Time / Family
  { display: "あさ", romaji: "asa", english: "morning", kanji: "朝" },
  { display: "ひる", romaji: "hiru", english: "noon", kanji: "昼" },
  { display: "よる", romaji: "yoru", english: "night", kanji: "夜" },
  { display: "ちち", romaji: "chichi", english: "father (humble)", kanji: "父" },
  { display: "はは", romaji: "haha", english: "mother (humble)", kanji: "母" },

  // Misc
  { display: "ほん", romaji: "hon", english: "book", kanji: "本" },
  { display: "いえ", romaji: "ie", english: "house", kanji: "家" },
  { display: "みち", romaji: "michi", english: "road", kanji: "道" },
  { display: "くつ", romaji: "kutsu", english: "shoes", kanji: "靴" },
  { display: "パン", romaji: "pan", english: "bread" },
];

// ---------------------------------------------------------------------
// Stage 2 — 3-mora words (50)
// ---------------------------------------------------------------------
// Common 3-syllable N5 vocabulary — food, places, people, basic
// adjectives, short verbs, time. Every entry is exactly three mora.
export const STAGE_2_BASE: readonly ReadingWordSeed[] = [
  // Food
  { display: "さかな", romaji: "sakana", english: "fish", kanji: "魚" },
  { display: "やさい", romaji: "yasai", english: "vegetable", kanji: "野菜" },
  { display: "りんご", romaji: "ringo", english: "apple" },
  { display: "みかん", romaji: "mikan", english: "mandarin orange" },
  { display: "たまご", romaji: "tamago", english: "egg", kanji: "卵" },
  { display: "ごはん", romaji: "gohan", english: "rice / meal", kanji: "ご飯" },
  { display: "いちご", romaji: "ichigo", english: "strawberry", kanji: "苺" },
  { display: "ぶどう", romaji: "budou", english: "grape" },
  { display: "なすび", romaji: "nasubi", english: "eggplant", kanji: "茄子" },
  { display: "バナナ", romaji: "banana", english: "banana" },
  { display: "メロン", romaji: "meron", english: "melon" },
  { display: "すいか", romaji: "suika", english: "watermelon", kanji: "西瓜" },

  // Places & objects
  { display: "がっこう", romaji: "gakkou", english: "school", kanji: "学校" },
  { display: "かいしゃ", romaji: "kaisha", english: "company", kanji: "会社" },
  { display: "でんしゃ", romaji: "densha", english: "train", kanji: "電車" },
  { display: "くるま", romaji: "kuruma", english: "car", kanji: "車" },
  { display: "ホテル", romaji: "hoteru", english: "hotel" },
  { display: "かばん", romaji: "kaban", english: "bag", kanji: "鞄" },
  { display: "つくえ", romaji: "tsukue", english: "desk", kanji: "机" },
  { display: "うちわ", romaji: "uchiwa", english: "paper fan", kanji: "団扇" },

  // People
  { display: "わたし", romaji: "watashi", english: "I / me", kanji: "私" },
  { display: "あなた", romaji: "anata", english: "you" },
  { display: "かのじょ", romaji: "kanojo", english: "she / girlfriend", kanji: "彼女" },
  { display: "おとこ", romaji: "otoko", english: "man", kanji: "男" },
  { display: "おんな", romaji: "onna", english: "woman", kanji: "女" },
  { display: "こども", romaji: "kodomo", english: "child", kanji: "子供" },

  // Adjectives
  { display: "ちかい", romaji: "chikai", english: "near / close", kanji: "近い" },
  { display: "とおい", romaji: "tooi", english: "far", kanji: "遠い" },
  { display: "おおい", romaji: "ooi", english: "many", kanji: "多い" },
  { display: "あつい", romaji: "atsui", english: "hot", kanji: "暑い" },
  { display: "さむい", romaji: "samui", english: "cold (weather)", kanji: "寒い" },
  { display: "ねむい", romaji: "nemui", english: "sleepy", kanji: "眠い" },
  { display: "つよい", romaji: "tsuyoi", english: "strong", kanji: "強い" },
  { display: "よわい", romaji: "yowai", english: "weak", kanji: "弱い" },
  { display: "あかい", romaji: "akai", english: "red", kanji: "赤い" },
  { display: "あおい", romaji: "aoi", english: "blue", kanji: "青い" },

  // Verbs
  { display: "いそぐ", romaji: "isogu", english: "to hurry", kanji: "急ぐ" },
  { display: "あるく", romaji: "aruku", english: "to walk", kanji: "歩く" },
  { display: "はしる", romaji: "hashiru", english: "to run", kanji: "走る" },
  { display: "あらう", romaji: "arau", english: "to wash", kanji: "洗う" },
  { display: "あそぶ", romaji: "asobu", english: "to play", kanji: "遊ぶ" },
  { display: "およぐ", romaji: "oyogu", english: "to swim", kanji: "泳ぐ" },
  { display: "あける", romaji: "akeru", english: "to open", kanji: "開ける" },
  { display: "しめる", romaji: "shimeru", english: "to close", kanji: "閉める" },

  // Time / Misc
  { display: "あした", romaji: "ashita", english: "tomorrow", kanji: "明日" },
  { display: "きのう", romaji: "kinou", english: "yesterday", kanji: "昨日" },
  { display: "あさって", romaji: "asatte", english: "day after tomorrow", kanji: "明後日" },
  { display: "むかし", romaji: "mukashi", english: "long ago", kanji: "昔" },
  { display: "あたま", romaji: "atama", english: "head", kanji: "頭" },
  { display: "おなか", romaji: "onaka", english: "stomach (polite)", kanji: "お腹" },
];

// ---------------------------------------------------------------------
// Stage 3 — 4-mora words (50)
// ---------------------------------------------------------------------
// Greetings, polite -masu form verbs, common compound nouns. Every
// entry is exactly four mora.
export const STAGE_3_BASE: readonly ReadingWordSeed[] = [
  // Greetings & family
  { display: "ともだち", romaji: "tomodachi", english: "friend", kanji: "友達" },
  { display: "おはよう", romaji: "ohayou", english: "good morning" },
  { display: "おやすみ", romaji: "oyasumi", english: "good night", kanji: "お休み" },
  { display: "ただいま", romaji: "tadaima", english: "I'm home", kanji: "只今" },
  { display: "おかえり", romaji: "okaeri", english: "welcome back", kanji: "お帰り" },
  { display: "おとうと", romaji: "otouto", english: "younger brother", kanji: "弟" },
  { display: "いもうと", romaji: "imouto", english: "younger sister", kanji: "妹" },

  // -masu verbs
  { display: "たべます", romaji: "tabemasu", english: "eat (polite)", kanji: "食べます" },
  { display: "のみます", romaji: "nomimasu", english: "drink (polite)", kanji: "飲みます" },
  { display: "ききます", romaji: "kikimasu", english: "listen (polite)", kanji: "聞きます" },
  { display: "みせます", romaji: "misemasu", english: "show (polite)", kanji: "見せます" },
  { display: "かきます", romaji: "kakimasu", english: "write (polite)", kanji: "書きます" },
  { display: "よみます", romaji: "yomimasu", english: "read (polite)", kanji: "読みます" },
  { display: "あいます", romaji: "aimasu", english: "meet (polite)", kanji: "会います" },
  { display: "かいます", romaji: "kaimasu", english: "buy (polite)", kanji: "買います" },
  { display: "うります", romaji: "urimasu", english: "sell (polite)", kanji: "売ります" },
  { display: "おきます", romaji: "okimasu", english: "wake up (polite)", kanji: "起きます" },
  { display: "いきます", romaji: "ikimasu", english: "go (polite)", kanji: "行きます" },
  { display: "まちます", romaji: "machimasu", english: "wait (polite)", kanji: "待ちます" },
  { display: "たちます", romaji: "tachimasu", english: "stand (polite)", kanji: "立ちます" },
  { display: "もちます", romaji: "mochimasu", english: "hold (polite)", kanji: "持ちます" },
  { display: "とります", romaji: "torimasu", english: "take (polite)", kanji: "取ります" },

  // Places
  { display: "きょうしつ", romaji: "kyoushitsu", english: "classroom", kanji: "教室" },
  { display: "としょかん", romaji: "toshokan", english: "library", kanji: "図書館" },
  { display: "ぎんこう", romaji: "ginkou", english: "bank", kanji: "銀行" },
  { display: "びょういん", romaji: "byouin", english: "hospital", kanji: "病院" },
  { display: "こうえん", romaji: "kouen", english: "park", kanji: "公園" },
  { display: "くうこう", romaji: "kuukou", english: "airport", kanji: "空港" },
  { display: "じてんしゃ", romaji: "jitensha", english: "bicycle", kanji: "自転車" },
  { display: "ひこうき", romaji: "hikouki", english: "airplane", kanji: "飛行機" },

  // People & nature
  { display: "せんせい", romaji: "sensei", english: "teacher", kanji: "先生" },
  { display: "がくせい", romaji: "gakusei", english: "student", kanji: "学生" },
  { display: "どうぶつ", romaji: "doubutsu", english: "animal", kanji: "動物" },
  { display: "しょくぶつ", romaji: "shokubutsu", english: "plant", kanji: "植物" },
  { display: "たいよう", romaji: "taiyou", english: "sun", kanji: "太陽" },
  { display: "たまねぎ", romaji: "tamanegi", english: "onion", kanji: "玉ねぎ" },
  { display: "にんじん", romaji: "ninjin", english: "carrot", kanji: "人参" },

  // Adjectives
  { display: "おいしい", romaji: "oishii", english: "delicious", kanji: "美味しい" },
  { display: "やさしい", romaji: "yasashii", english: "kind / easy", kanji: "優しい" },
  { display: "たのしい", romaji: "tanoshii", english: "fun", kanji: "楽しい" },
  { display: "うれしい", romaji: "ureshii", english: "happy", kanji: "嬉しい" },
  { display: "かなしい", romaji: "kanashii", english: "sad", kanji: "悲しい" },
  { display: "あかるい", romaji: "akarui", english: "bright", kanji: "明るい" },

  // Misc nouns
  { display: "コーヒー", romaji: "koohii", english: "coffee" },
  { display: "ぎゅうにゅう", romaji: "gyuunyuu", english: "milk", kanji: "牛乳" },
  { display: "くだもの", romaji: "kudamono", english: "fruit", kanji: "果物" },
  { display: "たべもの", romaji: "tabemono", english: "food", kanji: "食べ物" },
  { display: "のみもの", romaji: "nomimono", english: "drink (noun)", kanji: "飲み物" },
  { display: "かいもの", romaji: "kaimono", english: "shopping", kanji: "買い物" },
  { display: "たてもの", romaji: "tatemono", english: "building", kanji: "建物" },
];

// ---------------------------------------------------------------------
// Stage 4 — 5-mora words (50)
// ---------------------------------------------------------------------
// Greetings, past-tense -mashita verbs, longer compound nouns,
// adjectives, days of the week, -tai (want-to-do) forms. Every entry
// is exactly five mora.
export const STAGE_4_BASE: readonly ReadingWordSeed[] = [
  // Greetings
  { display: "ありがとう", romaji: "arigatou", english: "thank you" },
  { display: "すみません", romaji: "sumimasen", english: "excuse me / sorry" },
  { display: "こんにちは", romaji: "konnichiwa", english: "hello / good afternoon" },
  { display: "こんばんは", romaji: "konbanwa", english: "good evening" },
  { display: "さようなら", romaji: "sayounara", english: "goodbye" },

  // -mashita past tense
  { display: "たべました", romaji: "tabemashita", english: "ate", kanji: "食べました" },
  { display: "のみました", romaji: "nomimashita", english: "drank", kanji: "飲みました" },
  { display: "ききました", romaji: "kikimashita", english: "listened", kanji: "聞きました" },
  { display: "かきました", romaji: "kakimashita", english: "wrote", kanji: "書きました" },
  { display: "よみました", romaji: "yomimashita", english: "read (past)", kanji: "読みました" },
  { display: "あいました", romaji: "aimashita", english: "met", kanji: "会いました" },
  { display: "かいました", romaji: "kaimashita", english: "bought", kanji: "買いました" },
  { display: "いきました", romaji: "ikimashita", english: "went", kanji: "行きました" },
  { display: "おきました", romaji: "okimashita", english: "woke up", kanji: "起きました" },
  { display: "いいました", romaji: "iimashita", english: "said", kanji: "言いました" },

  // Polite -masu / -mashou
  { display: "いってきます", romaji: "ittekimasu", english: "I'll go and come back" },
  { display: "でかけます", romaji: "dekakemasu", english: "go out (polite)", kanji: "出かけます" },
  { display: "おしえます", romaji: "oshiemasu", english: "teach (polite)", kanji: "教えます" },
  { display: "おぼえます", romaji: "oboemasu", english: "remember (polite)", kanji: "覚えます" },
  { display: "あいましょう", romaji: "aimashou", english: "let's meet", kanji: "会いましょう" },
  { display: "たべましょう", romaji: "tabemashou", english: "let's eat", kanji: "食べましょう" },
  { display: "のみましょう", romaji: "nomimashou", english: "let's drink", kanji: "飲みましょう" },
  { display: "いきましょう", romaji: "ikimashou", english: "let's go", kanji: "行きましょう" },

  // -tai (want to)
  { display: "あそびたい", romaji: "asobitai", english: "want to play", kanji: "遊びたい" },
  { display: "ねむりたい", romaji: "nemuritai", english: "want to sleep", kanji: "眠りたい" },
  { display: "かえりたい", romaji: "kaeritai", english: "want to go home", kanji: "帰りたい" },

  // Adjectives
  { display: "おもしろい", romaji: "omoshiroi", english: "interesting / fun", kanji: "面白い" },
  { display: "うつくしい", romaji: "utsukushii", english: "beautiful", kanji: "美しい" },
  { display: "あたたかい", romaji: "atatakai", english: "warm", kanji: "暖かい" },
  { display: "なつかしい", romaji: "natsukashii", english: "nostalgic", kanji: "懐かしい" },
  { display: "むずかしい", romaji: "muzukashii", english: "difficult", kanji: "難しい" },
  { display: "あたらしい", romaji: "atarashii", english: "new", kanji: "新しい" },

  // Days of week (5-mora ones)
  { display: "にちようび", romaji: "nichiyoubi", english: "Sunday", kanji: "日曜日" },
  { display: "げつようび", romaji: "getsuyoubi", english: "Monday", kanji: "月曜日" },
  { display: "すいようび", romaji: "suiyoubi", english: "Wednesday", kanji: "水曜日" },
  { display: "もくようび", romaji: "mokuyoubi", english: "Thursday", kanji: "木曜日" },
  { display: "きんようび", romaji: "kinyoubi", english: "Friday", kanji: "金曜日" },

  // Verbs (5-mora dictionary forms)
  { display: "かんがえる", romaji: "kangaeru", english: "to think", kanji: "考える" },
  { display: "おもいだす", romaji: "omoidasu", english: "to recall", kanji: "思い出す" },
  { display: "ねむれない", romaji: "nemurenai", english: "can't sleep", kanji: "眠れない" },
  { display: "とおすぎる", romaji: "toosugiru", english: "too far", kanji: "遠すぎる" },
  { display: "たべすぎた", romaji: "tabesugita", english: "ate too much", kanji: "食べすぎた" },

  // Misc compound nouns
  { display: "けっこんしき", romaji: "kekkonshiki", english: "wedding ceremony", kanji: "結婚式" },
  { display: "がくしゅうしゃ", romaji: "gakushuusha", english: "learner", kanji: "学習者" },
  { display: "うんてんしゃ", romaji: "untensha", english: "driver", kanji: "運転者" },
  { display: "まちあわせ", romaji: "machiawase", english: "meeting up", kanji: "待ち合わせ" },
  { display: "せかいじゅう", romaji: "sekaijuu", english: "all over the world", kanji: "世界中" },

  // Common compound phrases
  { display: "またあした", romaji: "mata ashita", english: "see you tomorrow", kanji: "また明日" },
  { display: "こちらこそ", romaji: "kochira koso", english: "likewise" },
  { display: "こうえんで", romaji: "kouen de", english: "at the park", kanji: "公園で" },
];

/** All four stage banks in order, indexed by `stage - 1`. The seed
 *  runner walks this array, asserts mora correctness, and inflates
 *  each list across 5 dayOfCycle slots. */
export const READING_WORD_BANKS: readonly (readonly ReadingWordSeed[])[] = [
  STAGE_1_BASE,
  STAGE_2_BASE,
  STAGE_3_BASE,
  STAGE_4_BASE,
];
