// Shared client-side helpers for Japanese text-to-speech via the browser's
// Web Speech API. Keep these separate from any one component so vocab,
// kanji, and grammar pages all use the same voice picker.

const KNOWN_FEMALE_JA = [
  "kyoko",
  "nanami",
  "haruka",
  "ayumi",
  "sayaka",
  "naoko",
  "misaki",
  "mizuki",
  "o-ren",
  "google 日本語",
  "google japanese",
];
const KNOWN_MALE_JA = ["otoya", "ichiro", "takumi"];

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesReadyPromise: Promise<void> | null = null;

/**
 * Some browsers (notably Chrome) populate `getVoices()` asynchronously on
 * first page load. If the list is empty we wait for the `voiceschanged`
 * event — capped at ~1.5s so a missing API never blocks audio forever.
 */
function ensureVoicesLoaded(): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve();
  }
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve();
  if (voicesReadyPromise) return voicesReadyPromise;
  voicesReadyPromise = new Promise<void>((resolve) => {
    const t = setTimeout(() => resolve(), 1500);
    const handler = () => {
      clearTimeout(t);
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
  });
  return voicesReadyPromise;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  const ja = voices.filter((v) => v.lang?.toLowerCase().startsWith("ja"));
  if (ja.length === 0) return null;

  const byName = (needle: string) =>
    ja.find((v) => v.name.toLowerCase().includes(needle));

  for (const f of KNOWN_FEMALE_JA) {
    const m = byName(f);
    if (m) {
      cachedVoice = m;
      return m;
    }
  }
  const femaleHinted = ja.find((v) => /female|女|joshi/i.test(v.name));
  if (femaleHinted) {
    cachedVoice = femaleHinted;
    return femaleHinted;
  }
  const notKnownMale = ja.find(
    (v) => !KNOWN_MALE_JA.some((m) => v.name.toLowerCase().includes(m)),
  );
  cachedVoice = notKnownMale ?? ja[0];
  return cachedVoice;
}

export function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  return pickVoice();
}

export function hasJapaneseVoiceInstalled(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return false;
  return window.speechSynthesis
    .getVoices()
    .some((v) => v.lang?.toLowerCase().startsWith("ja"));
}

export function speakJapanese(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!text) return;
  // Kick off voice loading in case this is the very first audio click.
  ensureVoicesLoaded().then(() => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ja-JP";
    utter.rate = rate;
    utter.pitch = 1.05;
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  });
}
