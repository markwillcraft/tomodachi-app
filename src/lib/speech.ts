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

export function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return null;
  const voices = window.speechSynthesis.getVoices();
  const ja = voices.filter((v) => v.lang?.toLowerCase().startsWith("ja"));
  if (ja.length === 0) return null;

  const byName = (needle: string) =>
    ja.find((v) => v.name.toLowerCase().includes(needle));

  for (const f of KNOWN_FEMALE_JA) {
    const m = byName(f);
    if (m) return m;
  }
  const femaleHinted = ja.find((v) => /female|女|joshi/i.test(v.name));
  if (femaleHinted) return femaleHinted;
  const notKnownMale = ja.find(
    (v) => !KNOWN_MALE_JA.some((m) => v.name.toLowerCase().includes(m)),
  );
  return notKnownMale ?? ja[0];
}

export function speakJapanese(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = rate;
  utter.pitch = 1.05; // Tiny lift makes most browser voices sound less flat.
  const voice = pickJapaneseVoice();
  if (voice) utter.voice = voice;
  window.speechSynthesis.speak(utter);
}
