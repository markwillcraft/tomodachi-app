import { toHiragana, toKatakana } from "wanakana";

export type WordExample = {
  jp: string;
  romaji: string;
  english: string;
};

export type CatalogWord = {
  romaji: string;
  hiragana: string;
  katakana: string;
  english: string;
  examples?: WordExample[];
};

export type CatalogCategory = {
  slug: string;
  name: string;
  description: string;
  level: "N5";
  // Words are written as { romaji, english } pairs and the kana are derived
  // automatically from romaji via wanakana so we never get them out of sync.
  words: CatalogWord[];
};

// Hand-written N5 example sentences keyed by romaji. Each example shows
// the word in real grammar (は・を・に・が・です/ます forms) so learners
// see how to *use* the word, not just what it means. Hiragana / katakana
// only — kanji is intentionally avoided to stay readable for absolute
// beginners.
const EXAMPLES: Record<string, WordExample[]> = {
  // Greetings
  ohayou: [
    { jp: "おはよう、たなかさん。", romaji: "Ohayou, Tanaka-san.", english: "Good morning, Tanaka." },
  ],
  konnichiwa: [
    { jp: "こんにちは、げんき ですか。", romaji: "Konnichiwa, genki desu ka.", english: "Hello, how are you?" },
  ],
  konbanwa: [
    { jp: "こんばんは、おかあさん。", romaji: "Konbanwa, okaasan.", english: "Good evening, mom." },
  ],
  oyasumi: [
    { jp: "おやすみなさい。", romaji: "Oyasumi nasai.", english: "Good night." },
  ],
  sayounara: [
    { jp: "さようなら、また あした。", romaji: "Sayounara, mata ashita.", english: "Goodbye, see you tomorrow." },
  ],
  arigatou: [
    { jp: "どうも ありがとう ございます。", romaji: "Doumo arigatou gozaimasu.", english: "Thank you very much." },
  ],
  sumimasen: [
    { jp: "すみません、みず を ください。", romaji: "Sumimasen, mizu o kudasai.", english: "Excuse me, water please." },
  ],
  gomennasai: [
    { jp: "おそく なって、ごめんなさい。", romaji: "Osoku natte, gomennasai.", english: "Sorry for being late." },
  ],
  hajimemashite: [
    { jp: "はじめまして、ローズ です。", romaji: "Hajimemashite, Rouzu desu.", english: "Nice to meet you, I'm Rose." },
  ],
  yoroshiku: [
    { jp: "どうぞ よろしく おねがいします。", romaji: "Douzo yoroshiku onegaishimasu.", english: "Please treat me well." },
  ],
  ittekimasu: [
    { jp: "がっこう に いってきます。", romaji: "Gakkou ni ittekimasu.", english: "I'm off to school." },
  ],
  itterasshai: [
    { jp: "き を つけて、いってらっしゃい。", romaji: "Ki o tsukete, itterasshai.", english: "Take care, see you later." },
  ],
  tadaima: [
    { jp: "ただいま、おかあさん。", romaji: "Tadaima, okaasan.", english: "I'm home, mom." },
  ],
  okaeri: [
    { jp: "おかえりなさい、おとうさん。", romaji: "Okaerinasai, otousan.", english: "Welcome back, dad." },
  ],
  itadakimasu: [
    { jp: "ごはん の まえ に、いただきます。", romaji: "Gohan no mae ni, itadakimasu.", english: "Before the meal, 'let's eat'." },
  ],
  gochisousama: [
    { jp: "おいしかった、ごちそうさま でした。", romaji: "Oishikatta, gochisousama deshita.", english: "It was delicious, thanks for the meal." },
  ],

  // Numbers
  ichi: [
    { jp: "わたし は いち ねんせい です。", romaji: "Watashi wa ichi-nensei desu.", english: "I am a 1st-year student." },
  ],
  ni: [
    { jp: "ねこ が に ひき います。", romaji: "Neko ga ni-hiki imasu.", english: "There are 2 cats." },
  ],
  san: [
    { jp: "さん じ に きます。", romaji: "San-ji ni kimasu.", english: "I'll come at 3 o'clock." },
  ],
  yon: [
    { jp: "よ にん の かぞく です。", romaji: "Yo-nin no kazoku desu.", english: "We are a family of 4." },
  ],
  go: [
    { jp: "ご さい です。", romaji: "Go-sai desu.", english: "I am 5 years old." },
  ],
  roku: [
    { jp: "ろく じ に おきます。", romaji: "Roku-ji ni okimasu.", english: "I wake up at 6 o'clock." },
  ],
  nana: [
    { jp: "なな にん います。", romaji: "Nana-nin imasu.", english: "There are 7 people." },
  ],
  hachi: [
    { jp: "はち じ に ねます。", romaji: "Hachi-ji ni nemasu.", english: "I sleep at 8 o'clock." },
  ],
  kyuu: [
    { jp: "きゅう ひゃく えん です。", romaji: "Kyuu-hyaku en desu.", english: "It's 900 yen." },
  ],
  juu: [
    { jp: "じゅっぷん まちます。", romaji: "Juppun machimasu.", english: "I'll wait 10 minutes." },
  ],
  juuichi: [
    { jp: "じゅういち じ に かえります。", romaji: "Juuichi-ji ni kaerimasu.", english: "I return at 11 o'clock." },
  ],
  juuni: [
    { jp: "じゅうに がつ は さむい です。", romaji: "Juuni-gatsu wa samui desu.", english: "December is cold." },
  ],
  nijuu: [
    { jp: "にじゅっさい です。", romaji: "Nijussai desu.", english: "I am 20 years old." },
  ],
  sanjuu: [
    { jp: "さんじゅっぷん かかります。", romaji: "Sanjuppun kakarimasu.", english: "It takes 30 minutes." },
  ],
  yonjuu: [
    { jp: "よんじゅう にん の クラス です。", romaji: "Yonjuu-nin no kurasu desu.", english: "It's a class of 40." },
  ],
  gojuu: [
    { jp: "ごじゅう えん の あめ です。", romaji: "Gojuu-en no ame desu.", english: "It's a 50-yen candy." },
  ],
  hyaku: [
    { jp: "ひゃく えん あります。", romaji: "Hyaku-en arimasu.", english: "I have 100 yen." },
  ],
  sen: [
    { jp: "せん えん を ください。", romaji: "Sen-en o kudasai.", english: "Please give me 1000 yen." },
  ],
  man: [
    { jp: "いち まん えん の ほん です。", romaji: "Ichi-man-en no hon desu.", english: "It's a 10,000-yen book." },
  ],
  zero: [
    { jp: "ぜろ から はじめます。", romaji: "Zero kara hajimemasu.", english: "I'll start from zero." },
  ],

  // Days & Time
  getsuyoubi: [
    { jp: "げつようび に がっこう に いきます。", romaji: "Getsuyoubi ni gakkou ni ikimasu.", english: "I go to school on Monday." },
  ],
  kayoubi: [
    { jp: "かようび は やすみ です。", romaji: "Kayoubi wa yasumi desu.", english: "Tuesday is a day off." },
  ],
  suiyoubi: [
    { jp: "すいようび に かいぎ が あります。", romaji: "Suiyoubi ni kaigi ga arimasu.", english: "There is a meeting on Wednesday." },
  ],
  mokuyoubi: [
    { jp: "もくようび に ともだち と あいます。", romaji: "Mokuyoubi ni tomodachi to aimasu.", english: "I meet my friend on Thursday." },
  ],
  kinyoubi: [
    { jp: "きんようび は たのしい です。", romaji: "Kinyoubi wa tanoshii desu.", english: "Friday is fun." },
  ],
  doyoubi: [
    { jp: "どようび に かいもの を します。", romaji: "Doyoubi ni kaimono o shimasu.", english: "I go shopping on Saturday." },
  ],
  nichiyoubi: [
    { jp: "にちようび に やすみます。", romaji: "Nichiyoubi ni yasumimasu.", english: "I rest on Sunday." },
  ],
  kyou: [
    { jp: "きょう は いい てんき です。", romaji: "Kyou wa ii tenki desu.", english: "Today is nice weather." },
  ],
  kinou: [
    { jp: "きのう えいが を みました。", romaji: "Kinou eiga o mimashita.", english: "I watched a movie yesterday." },
  ],
  ashita: [
    { jp: "あした、また あいましょう。", romaji: "Ashita, mata aimashou.", english: "Let's meet again tomorrow." },
  ],
  asa: [
    { jp: "あさ コーヒー を のみます。", romaji: "Asa koohii o nomimasu.", english: "I drink coffee in the morning." },
  ],
  hiru: [
    { jp: "ひる は あつい です。", romaji: "Hiru wa atsui desu.", english: "Daytime is hot." },
  ],
  yoru: [
    { jp: "よる に ほん を よみます。", romaji: "Yoru ni hon o yomimasu.", english: "I read books at night." },
  ],
  ima: [
    { jp: "いま なんじ ですか。", romaji: "Ima nan-ji desu ka.", english: "What time is it now?" },
  ],
  jikan: [
    { jp: "じかん が ありません。", romaji: "Jikan ga arimasen.", english: "I don't have time." },
  ],
  fun: [
    { jp: "ご ふん まって ください。", romaji: "Go-fun matte kudasai.", english: "Please wait 5 minutes." },
  ],
  byou: [
    { jp: "じゅう びょう です。", romaji: "Juu-byou desu.", english: "It's 10 seconds." },
  ],

  // Family
  kazoku: [
    { jp: "わたし の かぞく は よ にん です。", romaji: "Watashi no kazoku wa yo-nin desu.", english: "My family is 4 people." },
  ],
  chichi: [
    { jp: "ちち は せんせい です。", romaji: "Chichi wa sensei desu.", english: "My father is a teacher." },
  ],
  haha: [
    { jp: "はは は やさしい です。", romaji: "Haha wa yasashii desu.", english: "My mother is kind." },
  ],
  otousan: [
    { jp: "たなかさん の おとうさん です。", romaji: "Tanaka-san no otousan desu.", english: "It's Tanaka's father." },
  ],
  okaasan: [
    { jp: "おかあさん、ありがとう。", romaji: "Okaasan, arigatou.", english: "Mom, thank you." },
  ],
  ani: [
    { jp: "あに は がくせい です。", romaji: "Ani wa gakusei desu.", english: "My older brother is a student." },
  ],
  ane: [
    { jp: "あね は やさしい です。", romaji: "Ane wa yasashii desu.", english: "My older sister is kind." },
  ],
  oniisan: [
    { jp: "おにいさん は どこ ですか。", romaji: "Oniisan wa doko desu ka.", english: "Where is your older brother?" },
  ],
  oneesan: [
    { jp: "おねえさん は きれい です。", romaji: "Oneesan wa kirei desu.", english: "Your older sister is pretty." },
  ],
  otouto: [
    { jp: "おとうと は しょうがくせい です。", romaji: "Otouto wa shougakusei desu.", english: "My younger brother is in elementary school." },
  ],
  imouto: [
    { jp: "いもうと と あそびます。", romaji: "Imouto to asobimasu.", english: "I play with my younger sister." },
  ],
  sofu: [
    { jp: "そふ は はちじゅっさい です。", romaji: "Sofu wa hachijussai desu.", english: "My grandfather is 80 years old." },
  ],
  sobo: [
    { jp: "そぼ は げんき です。", romaji: "Sobo wa genki desu.", english: "My grandmother is well." },
  ],
  ojiisan: [
    { jp: "おじいさん は ほん を よみます。", romaji: "Ojiisan wa hon o yomimasu.", english: "Grandfather reads books." },
  ],
  obaasan: [
    { jp: "おばあさん は やさしい です。", romaji: "Obaasan wa yasashii desu.", english: "Grandmother is kind." },
  ],
  kodomo: [
    { jp: "こども が さん にん います。", romaji: "Kodomo ga san-nin imasu.", english: "There are 3 children." },
  ],
  musuko: [
    { jp: "わたし の むすこ です。", romaji: "Watashi no musuko desu.", english: "This is my son." },
  ],
  musume: [
    { jp: "むすめ は ちいさい です。", romaji: "Musume wa chiisai desu.", english: "My daughter is small." },
  ],

  // Colors
  aka: [
    { jp: "あか の くるま が すき です。", romaji: "Aka no kuruma ga suki desu.", english: "I like red cars." },
  ],
  ao: [
    { jp: "あお の そら が きれい です。", romaji: "Ao no sora ga kirei desu.", english: "The blue sky is beautiful." },
  ],
  kiiro: [
    { jp: "きいろ の はな です。", romaji: "Kiiro no hana desu.", english: "It's a yellow flower." },
  ],
  midori: [
    { jp: "みどり の ノート を かいます。", romaji: "Midori no nooto o kaimasu.", english: "I'll buy a green notebook." },
  ],
  kuro: [
    { jp: "くろ の くつ を はきます。", romaji: "Kuro no kutsu o hakimasu.", english: "I wear black shoes." },
  ],
  shiro: [
    { jp: "しろ の シャツ です。", romaji: "Shiro no shatsu desu.", english: "It's a white shirt." },
  ],
  chairo: [
    { jp: "ちゃいろ の かばん です。", romaji: "Chairo no kaban desu.", english: "It's a brown bag." },
  ],
  murasaki: [
    { jp: "むらさき の はな が すき です。", romaji: "Murasaki no hana ga suki desu.", english: "I like purple flowers." },
  ],
  pinku: [
    { jp: "ピンク の ドレス です。", romaji: "Pinku no doresu desu.", english: "It's a pink dress." },
  ],
  orenji: [
    { jp: "オレンジ ジュース を のみます。", romaji: "Orenji juusu o nomimasu.", english: "I drink orange juice." },
  ],
  haiiro: [
    { jp: "はいいろ の そら です。", romaji: "Haiiro no sora desu.", english: "It's a gray sky." },
  ],
  kin: [
    { jp: "きん の とけい です。", romaji: "Kin no tokei desu.", english: "It's a gold watch." },
  ],
  gin: [
    { jp: "ぎん の リング です。", romaji: "Gin no ringu desu.", english: "It's a silver ring." },
  ],

  // Food & Drink
  mizu: [
    { jp: "みず を ください。", romaji: "Mizu o kudasai.", english: "Water please." },
  ],
  ocha: [
    { jp: "おちゃ を のみます。", romaji: "Ocha o nomimasu.", english: "I drink green tea." },
  ],
  koohii: [
    { jp: "あさ コーヒー を のみます。", romaji: "Asa koohii o nomimasu.", english: "I drink coffee in the morning." },
  ],
  gyuunyuu: [
    { jp: "ぎゅうにゅう が すき です。", romaji: "Gyuunyuu ga suki desu.", english: "I like milk." },
  ],
  juusu: [
    { jp: "ジュース を ふたつ ください。", romaji: "Juusu o futatsu kudasai.", english: "Two juices please." },
  ],
  biiru: [
    { jp: "ビール は つめたい です。", romaji: "Biiru wa tsumetai desu.", english: "Beer is cold." },
  ],
  sake: [
    { jp: "さけ を のみません。", romaji: "Sake o nomimasen.", english: "I don't drink alcohol." },
  ],
  gohan: [
    { jp: "ばんごはん を たべます。", romaji: "Bangohan o tabemasu.", english: "I eat dinner." },
  ],
  pan: [
    { jp: "あさごはん に パン を たべます。", romaji: "Asagohan ni pan o tabemasu.", english: "I eat bread for breakfast." },
  ],
  niku: [
    { jp: "にく が すき です。", romaji: "Niku ga suki desu.", english: "I like meat." },
  ],
  sakana: [
    { jp: "さかな は おいしい です。", romaji: "Sakana wa oishii desu.", english: "Fish is delicious." },
  ],
  yasai: [
    { jp: "やさい を たべます。", romaji: "Yasai o tabemasu.", english: "I eat vegetables." },
  ],
  kudamono: [
    { jp: "くだもの を かいます。", romaji: "Kudamono o kaimasu.", english: "I'll buy fruit." },
  ],
  ringo: [
    { jp: "りんご を ひとつ ください。", romaji: "Ringo o hitotsu kudasai.", english: "One apple please." },
  ],
  mikan: [
    { jp: "みかん は あまい です。", romaji: "Mikan wa amai desu.", english: "Mandarin oranges are sweet." },
  ],
  tamago: [
    { jp: "たまご を ふたつ かいます。", romaji: "Tamago o futatsu kaimasu.", english: "I'll buy two eggs." },
  ],
  asagohan: [
    { jp: "まいあさ あさごはん を たべます。", romaji: "Maiasa asagohan o tabemasu.", english: "I eat breakfast every morning." },
  ],
  hirugohan: [
    { jp: "ひるごはん は なん ですか。", romaji: "Hirugohan wa nan desu ka.", english: "What's for lunch?" },
  ],
  bangohan: [
    { jp: "ばんごはん を いっしょ に たべましょう。", romaji: "Bangohan o issho ni tabemashou.", english: "Let's eat dinner together." },
  ],

  // Places
  ie: [
    { jp: "いえ に かえります。", romaji: "Ie ni kaerimasu.", english: "I go home." },
  ],
  uchi: [
    { jp: "うち で べんきょう します。", romaji: "Uchi de benkyou shimasu.", english: "I study at home." },
  ],
  gakkou: [
    { jp: "がっこう に いきます。", romaji: "Gakkou ni ikimasu.", english: "I go to school." },
  ],
  kaisha: [
    { jp: "かいしゃ は とおい です。", romaji: "Kaisha wa tooi desu.", english: "The company is far." },
  ],
  mise: [
    { jp: "みせ で パン を かいます。", romaji: "Mise de pan o kaimasu.", english: "I buy bread at the shop." },
  ],
  depaato: [
    { jp: "デパート で かいもの します。", romaji: "Depaato de kaimono shimasu.", english: "I shop at the department store." },
  ],
  resutoran: [
    { jp: "レストラン で たべます。", romaji: "Resutoran de tabemasu.", english: "I eat at a restaurant." },
  ],
  ginkou: [
    { jp: "ぎんこう に いきます。", romaji: "Ginkou ni ikimasu.", english: "I go to the bank." },
  ],
  yuubinkyoku: [
    { jp: "ゆうびんきょく は どこ ですか。", romaji: "Yuubinkyoku wa doko desu ka.", english: "Where is the post office?" },
  ],
  byouin: [
    { jp: "びょういん に いきます。", romaji: "Byouin ni ikimasu.", english: "I go to the hospital." },
  ],
  eki: [
    { jp: "えき で あいましょう。", romaji: "Eki de aimashou.", english: "Let's meet at the station." },
  ],
  kuukou: [
    { jp: "くうこう まで くるま で いきます。", romaji: "Kuukou made kuruma de ikimasu.", english: "I go to the airport by car." },
  ],
  toshokan: [
    { jp: "としょかん で ほん を よみます。", romaji: "Toshokan de hon o yomimasu.", english: "I read books at the library." },
  ],
  kouen: [
    { jp: "こうえん で あそびます。", romaji: "Kouen de asobimasu.", english: "I play in the park." },
  ],
  machi: [
    { jp: "この まち は しずか です。", romaji: "Kono machi wa shizuka desu.", english: "This town is quiet." },
  ],
  kuni: [
    { jp: "にほん は いい くに です。", romaji: "Nihon wa ii kuni desu.", english: "Japan is a good country." },
  ],
  heya: [
    { jp: "わたし の へや は ちいさい です。", romaji: "Watashi no heya wa chiisai desu.", english: "My room is small." },
  ],
  toire: [
    { jp: "トイレ は どこ ですか。", romaji: "Toire wa doko desu ka.", english: "Where is the toilet?" },
  ],

  // Verbs
  iku: [
    { jp: "がっこう に いきます。", romaji: "Gakkou ni ikimasu.", english: "I go to school." },
  ],
  kuru: [
    { jp: "ともだち が きます。", romaji: "Tomodachi ga kimasu.", english: "My friend is coming." },
  ],
  kaeru: [
    { jp: "いえ に かえります。", romaji: "Ie ni kaerimasu.", english: "I return home." },
  ],
  taberu: [
    { jp: "ごはん を たべます。", romaji: "Gohan o tabemasu.", english: "I eat rice." },
  ],
  nomu: [
    { jp: "みず を のみます。", romaji: "Mizu o nomimasu.", english: "I drink water." },
  ],
  miru: [
    { jp: "テレビ を みます。", romaji: "Terebi o mimasu.", english: "I watch TV." },
  ],
  kiku: [
    { jp: "おんがく を ききます。", romaji: "Ongaku o kikimasu.", english: "I listen to music." },
  ],
  hanasu: [
    { jp: "にほんご を はなします。", romaji: "Nihongo o hanashimasu.", english: "I speak Japanese." },
  ],
  yomu: [
    { jp: "ほん を よみます。", romaji: "Hon o yomimasu.", english: "I read a book." },
  ],
  kaku: [
    { jp: "てがみ を かきます。", romaji: "Tegami o kakimasu.", english: "I write a letter." },
  ],
  kau: [
    { jp: "パン を かいます。", romaji: "Pan o kaimasu.", english: "I buy bread." },
  ],
  suru: [
    { jp: "しゅくだい を します。", romaji: "Shukudai o shimasu.", english: "I do homework." },
  ],
  aru: [
    { jp: "つくえ の うえ に ほん が あります。", romaji: "Tsukue no ue ni hon ga arimasu.", english: "There is a book on the desk." },
  ],
  iru: [
    { jp: "へや に ねこ が います。", romaji: "Heya ni neko ga imasu.", english: "There is a cat in the room." },
  ],
  neru: [
    { jp: "じゅうじ に ねます。", romaji: "Juu-ji ni nemasu.", english: "I sleep at 10 o'clock." },
  ],
  okiru: [
    { jp: "ろくじ に おきます。", romaji: "Roku-ji ni okimasu.", english: "I wake up at 6 o'clock." },
  ],
  benkyousuru: [
    { jp: "にほんご を べんきょう します。", romaji: "Nihongo o benkyou shimasu.", english: "I study Japanese." },
  ],
  wakaru: [
    { jp: "いみ が わかります。", romaji: "Imi ga wakarimasu.", english: "I understand the meaning." },
  ],
  matsu: [
    { jp: "バス を まちます。", romaji: "Basu o machimasu.", english: "I wait for the bus." },
  ],
  asobu: [
    { jp: "こうえん で あそびます。", romaji: "Kouen de asobimasu.", english: "I play in the park." },
  ],

  // Adjectives
  ookii: [
    { jp: "おおきい いえ です。", romaji: "Ookii ie desu.", english: "It's a big house." },
  ],
  chiisai: [
    { jp: "ちいさい ねこ です。", romaji: "Chiisai neko desu.", english: "It's a small cat." },
  ],
  atarashii: [
    { jp: "あたらしい くるま を かいます。", romaji: "Atarashii kuruma o kaimasu.", english: "I'll buy a new car." },
  ],
  furui: [
    { jp: "ふるい ほん を よみます。", romaji: "Furui hon o yomimasu.", english: "I read an old book." },
  ],
  takai: [
    { jp: "この とけい は たかい です。", romaji: "Kono tokei wa takai desu.", english: "This watch is expensive." },
  ],
  yasui: [
    { jp: "この みせ は やすい です。", romaji: "Kono mise wa yasui desu.", english: "This shop is cheap." },
  ],
  hikui: [
    { jp: "ひくい いす です。", romaji: "Hikui isu desu.", english: "It's a low chair." },
  ],
  atsui: [
    { jp: "きょう は あつい です。", romaji: "Kyou wa atsui desu.", english: "Today is hot." },
  ],
  samui: [
    { jp: "ふゆ は さむい です。", romaji: "Fuyu wa samui desu.", english: "Winter is cold." },
  ],
  tsumetai: [
    { jp: "つめたい みず を のみます。", romaji: "Tsumetai mizu o nomimasu.", english: "I drink cold water." },
  ],
  ii: [
    { jp: "この ほん は いい です。", romaji: "Kono hon wa ii desu.", english: "This book is good." },
  ],
  warui: [
    { jp: "わるい こども です。", romaji: "Warui kodomo desu.", english: "It's a bad child." },
  ],
  omoshiroi: [
    { jp: "この えいが は おもしろい です。", romaji: "Kono eiga wa omoshiroi desu.", english: "This movie is interesting." },
  ],
  tsumaranai: [
    { jp: "この ほん は つまらない です。", romaji: "Kono hon wa tsumaranai desu.", english: "This book is boring." },
  ],
  isogashii: [
    { jp: "きょう は いそがしい です。", romaji: "Kyou wa isogashii desu.", english: "Today is busy." },
  ],
  hima: [
    { jp: "あした は ひま です。", romaji: "Ashita wa hima desu.", english: "Tomorrow I'm free." },
  ],
  genki: [
    { jp: "げんき ですか。", romaji: "Genki desu ka.", english: "Are you well?" },
  ],
  kirei: [
    { jp: "この はな は きれい です。", romaji: "Kono hana wa kirei desu.", english: "This flower is pretty." },
  ],
  shizuka: [
    { jp: "としょかん は しずか です。", romaji: "Toshokan wa shizuka desu.", english: "The library is quiet." },
  ],
  nigiyaka: [
    { jp: "この まち は にぎやか です。", romaji: "Kono machi wa nigiyaka desu.", english: "This town is lively." },
  ],

  // Pronouns & People
  watashi: [
    { jp: "わたし は がくせい です。", romaji: "Watashi wa gakusei desu.", english: "I am a student." },
  ],
  anata: [
    { jp: "あなた の なまえ は なん ですか。", romaji: "Anata no namae wa nan desu ka.", english: "What is your name?" },
  ],
  kare: [
    { jp: "かれ は せんせい です。", romaji: "Kare wa sensei desu.", english: "He is a teacher." },
  ],
  kanojo: [
    { jp: "かのじょ は きれい です。", romaji: "Kanojo wa kirei desu.", english: "She is pretty." },
  ],
  watashitachi: [
    { jp: "わたしたち は ともだち です。", romaji: "Watashitachi wa tomodachi desu.", english: "We are friends." },
  ],
  minasan: [
    { jp: "みなさん、こんにちは。", romaji: "Minasan, konnichiwa.", english: "Hello, everyone." },
  ],
  sensei: [
    { jp: "せんせい は やさしい です。", romaji: "Sensei wa yasashii desu.", english: "The teacher is kind." },
  ],
  gakusei: [
    { jp: "わたし は がくせい です。", romaji: "Watashi wa gakusei desu.", english: "I am a student." },
  ],
  tomodachi: [
    { jp: "ともだち と あそびます。", romaji: "Tomodachi to asobimasu.", english: "I play with my friend." },
  ],
  hito: [
    { jp: "ここ に ひと が います。", romaji: "Koko ni hito ga imasu.", english: "There is a person here." },
  ],
  otoko: [
    { jp: "あの ひと は おとこ の ひと です。", romaji: "Ano hito wa otoko no hito desu.", english: "That person is a man." },
  ],
  onna: [
    { jp: "あの ひと は おんな の ひと です。", romaji: "Ano hito wa onna no hito desu.", english: "That person is a woman." },
  ],
  otokonoko: [
    { jp: "おとこのこ が あそんで います。", romaji: "Otokonoko ga asonde imasu.", english: "The boy is playing." },
  ],
  onnanoko: [
    { jp: "おんなのこ は ほん を よみます。", romaji: "Onnanoko wa hon o yomimasu.", english: "The girl reads a book." },
  ],
};

function w(romaji: string, english: string): CatalogWord {
  const examples = EXAMPLES[romaji];
  return {
    romaji,
    hiragana: toHiragana(romaji),
    katakana: toKatakana(romaji),
    english,
    ...(examples && examples.length > 0 ? { examples } : {}),
  };
}

// Hand-curated JLPT N5 vocabulary, grouped into common beginner topics.
// Pronunciations use Hepburn romaji that wanakana converts cleanly.
const RAW: Array<Omit<CatalogCategory, "words"> & { words: Array<[string, string]> }> = [
  {
    slug: "n5-greetings",
    name: "Greetings",
    level: "N5",
    description: "Everyday hellos, goodbyes, and polite phrases.",
    words: [
      ["ohayou", "good morning"],
      ["konnichiwa", "hello / good afternoon"],
      ["konbanwa", "good evening"],
      ["oyasumi", "good night"],
      ["sayounara", "goodbye"],
      ["arigatou", "thank you"],
      ["sumimasen", "excuse me / sorry"],
      ["gomennasai", "I'm sorry"],
      ["hajimemashite", "nice to meet you"],
      ["yoroshiku", "please treat me well"],
      ["ittekimasu", "I'm leaving (going and coming back)"],
      ["itterasshai", "take care (said to one leaving)"],
      ["tadaima", "I'm home"],
      ["okaeri", "welcome back"],
      ["itadakimasu", "thanks for the meal (before eating)"],
      ["gochisousama", "thanks for the meal (after eating)"],
    ],
  },
  {
    slug: "n5-numbers",
    name: "Numbers",
    level: "N5",
    description: "Counting from one to one hundred.",
    words: [
      ["ichi", "one"],
      ["ni", "two"],
      ["san", "three"],
      ["yon", "four"],
      ["go", "five"],
      ["roku", "six"],
      ["nana", "seven"],
      ["hachi", "eight"],
      ["kyuu", "nine"],
      ["juu", "ten"],
      ["juuichi", "eleven"],
      ["juuni", "twelve"],
      ["nijuu", "twenty"],
      ["sanjuu", "thirty"],
      ["yonjuu", "forty"],
      ["gojuu", "fifty"],
      ["hyaku", "one hundred"],
      ["sen", "one thousand"],
      ["man", "ten thousand"],
      ["zero", "zero"],
    ],
  },
  {
    slug: "n5-days-and-time",
    name: "Days & Time",
    level: "N5",
    description: "Days of the week and basic time words.",
    words: [
      ["getsuyoubi", "Monday"],
      ["kayoubi", "Tuesday"],
      ["suiyoubi", "Wednesday"],
      ["mokuyoubi", "Thursday"],
      ["kinyoubi", "Friday"],
      ["doyoubi", "Saturday"],
      ["nichiyoubi", "Sunday"],
      ["kyou", "today"],
      ["kinou", "yesterday"],
      ["ashita", "tomorrow"],
      ["asa", "morning"],
      ["hiru", "noon / daytime"],
      ["yoru", "night"],
      ["ima", "now"],
      ["jikan", "time / hour"],
      ["fun", "minute"],
      ["byou", "second"],
    ],
  },
  {
    slug: "n5-family",
    name: "Family",
    level: "N5",
    description: "Words for family members (humble form).",
    words: [
      ["kazoku", "family"],
      ["chichi", "father (humble)"],
      ["haha", "mother (humble)"],
      ["otousan", "father (polite)"],
      ["okaasan", "mother (polite)"],
      ["ani", "older brother (humble)"],
      ["ane", "older sister (humble)"],
      ["oniisan", "older brother (polite)"],
      ["oneesan", "older sister (polite)"],
      ["otouto", "younger brother"],
      ["imouto", "younger sister"],
      ["sofu", "grandfather (humble)"],
      ["sobo", "grandmother (humble)"],
      ["ojiisan", "grandfather (polite)"],
      ["obaasan", "grandmother (polite)"],
      ["kodomo", "child"],
      ["musuko", "son"],
      ["musume", "daughter"],
    ],
  },
  {
    slug: "n5-colors",
    name: "Colors",
    level: "N5",
    description: "Basic colors as nouns.",
    words: [
      ["aka", "red"],
      ["ao", "blue"],
      ["kiiro", "yellow"],
      ["midori", "green"],
      ["kuro", "black"],
      ["shiro", "white"],
      ["chairo", "brown"],
      ["murasaki", "purple"],
      ["pinku", "pink"],
      ["orenji", "orange"],
      ["haiiro", "gray"],
      ["kin", "gold"],
      ["gin", "silver"],
    ],
  },
  {
    slug: "n5-food-and-drink",
    name: "Food & Drink",
    level: "N5",
    description: "Common food and drink vocabulary.",
    words: [
      ["mizu", "water"],
      ["ocha", "green tea"],
      ["koohii", "coffee"],
      ["gyuunyuu", "milk"],
      ["juusu", "juice"],
      ["biiru", "beer"],
      ["sake", "sake / alcohol"],
      ["gohan", "rice / meal"],
      ["pan", "bread"],
      ["niku", "meat"],
      ["sakana", "fish"],
      ["yasai", "vegetable"],
      ["kudamono", "fruit"],
      ["ringo", "apple"],
      ["mikan", "mandarin orange"],
      ["tamago", "egg"],
      ["asagohan", "breakfast"],
      ["hirugohan", "lunch"],
      ["bangohan", "dinner"],
    ],
  },
  {
    slug: "n5-places",
    name: "Places",
    level: "N5",
    description: "Everyday places and locations.",
    words: [
      ["ie", "house / home"],
      ["uchi", "home / inside"],
      ["gakkou", "school"],
      ["kaisha", "company / office"],
      ["mise", "shop / store"],
      ["depaato", "department store"],
      ["resutoran", "restaurant"],
      ["ginkou", "bank"],
      ["yuubinkyoku", "post office"],
      ["byouin", "hospital"],
      ["eki", "train station"],
      ["kuukou", "airport"],
      ["toshokan", "library"],
      ["kouen", "park"],
      ["machi", "town"],
      ["kuni", "country"],
      ["heya", "room"],
      ["toire", "toilet"],
    ],
  },
  {
    slug: "n5-verbs",
    name: "Common Verbs",
    level: "N5",
    description: "Frequently used N5 verbs in dictionary form.",
    words: [
      ["iku", "to go"],
      ["kuru", "to come"],
      ["kaeru", "to return"],
      ["taberu", "to eat"],
      ["nomu", "to drink"],
      ["miru", "to see / watch"],
      ["kiku", "to listen / ask"],
      ["hanasu", "to speak"],
      ["yomu", "to read"],
      ["kaku", "to write"],
      ["kau", "to buy"],
      ["suru", "to do"],
      ["aru", "to exist (objects)"],
      ["iru", "to exist (people/animals)"],
      ["neru", "to sleep"],
      ["okiru", "to wake up"],
      ["benkyousuru", "to study"],
      ["wakaru", "to understand"],
      ["matsu", "to wait"],
      ["asobu", "to play"],
    ],
  },
  {
    slug: "n5-adjectives",
    name: "Common Adjectives",
    level: "N5",
    description: "Beginner i- and na-adjectives.",
    words: [
      ["ookii", "big"],
      ["chiisai", "small"],
      ["atarashii", "new"],
      ["furui", "old (things)"],
      ["takai", "tall / expensive"],
      ["yasui", "cheap"],
      ["hikui", "low / short"],
      ["atsui", "hot"],
      ["samui", "cold (weather)"],
      ["tsumetai", "cold (touch)"],
      ["ii", "good"],
      ["warui", "bad"],
      ["omoshiroi", "interesting / fun"],
      ["tsumaranai", "boring"],
      ["isogashii", "busy"],
      ["hima", "free (time)"],
      ["genki", "energetic / well"],
      ["kirei", "pretty / clean"],
      ["shizuka", "quiet"],
      ["nigiyaka", "lively"],
    ],
  },
  {
    slug: "n5-pronouns-and-people",
    name: "Pronouns & People",
    level: "N5",
    description: "Pronouns and basic words for people.",
    words: [
      ["watashi", "I / me"],
      ["anata", "you"],
      ["kare", "he"],
      ["kanojo", "she"],
      ["watashitachi", "we"],
      ["minasan", "everyone"],
      ["sensei", "teacher"],
      ["gakusei", "student"],
      ["tomodachi", "friend"],
      ["hito", "person"],
      ["otoko", "man"],
      ["onna", "woman"],
      ["otokonoko", "boy"],
      ["onnanoko", "girl"],
    ],
  },
];

export const CATEGORIES: CatalogCategory[] = RAW.map((c) => ({
  slug: c.slug,
  name: c.name,
  level: c.level,
  description: c.description,
  words: c.words.map(([romaji, english]) => w(romaji, english)),
}));

export function getCategoryBySlug(slug: string): CatalogCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoriesByLevel(level: "N5"): CatalogCategory[] {
  return CATEGORIES.filter((c) => c.level === level);
}
