"use client";

import { Volume2 } from "lucide-react";
import { speakJapanese } from "@/lib/speech";
import { TOKEN_COLOR_CLASS, type Token } from "@/lib/grammar";
import { cn } from "@/lib/utils";

// Renders a single example sentence as clickable tokens. Tapping any
// Japanese token speaks just that word (so learners can drill individual
// particles, nouns, verbs); a dedicated speaker button on the right plays
// the whole sentence. Romaji sits above each token like furigana so
// beginners can read along even if they haven't learned the kana yet.
export function GrammarExampleLine({ tokens }: { tokens: Token[] }) {
  const fullSentence = tokens.map((t) => t.text).join("");

  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <div className="min-w-0 flex-1 rounded-lg p-2">
        <span className="inline-flex flex-wrap items-end gap-x-1.5 gap-y-3">
          {tokens.map((t, i) => {
            const speakable = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(
              t.text,
            );
            const tokenContent = (
              <span className="inline-flex flex-col items-center leading-tight">
                {t.romaji && (
                  <span className="block text-xs text-muted-foreground sm:text-sm">
                    {t.romaji}
                  </span>
                )}
                <span
                  className={cn(
                    "jp text-2xl sm:text-3xl",
                    TOKEN_COLOR_CLASS[t.color],
                  )}
                >
                  {t.text}
                </span>
              </span>
            );
            if (!speakable) return <span key={i}>{tokenContent}</span>;
            return (
              <button
                key={i}
                type="button"
                onClick={() => speakJapanese(t.text.trim())}
                className="rounded-md px-1 py-0.5 transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Play ${t.text.trim()}`}
              >
                {tokenContent}
              </button>
            );
          })}
        </span>
      </div>

      <button
        type="button"
        onClick={() => speakJapanese(fullSentence)}
        aria-label="Play whole sentence"
        title="Play whole sentence"
        className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:size-11"
      >
        <Volume2 className="size-4 sm:size-5" />
      </button>
    </div>
  );
}
