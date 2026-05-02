"use client";

import { useState } from "react";

import {
  KanaQuizModeSwitcher,
  type KanaQuizMode,
} from "@/components/kana-quiz-mode-switcher";
import { ReadingStagePicker } from "@/components/reading-stage-picker";
import type { ReadingSet } from "@/lib/reading";

import { KanaGuessingForm } from "./guessing-form";

// Wires the top-level mode switcher to either the existing Guessing
// form or the new Reading Session stage picker. Holds the mode choice
// so the user can flick between them without losing the other side's
// in-progress configuration (each child manages its own state).
export function KanaQuizSetup({
  weekdayLabel,
  autoSet,
}: {
  weekdayLabel: string;
  autoSet: ReadingSet | null;
}) {
  const [mode, setMode] = useState<KanaQuizMode>("guessing");

  return (
    <div className="space-y-8">
      <KanaQuizModeSwitcher value={mode} onChange={setMode} />
      {mode === "guessing" ? (
        <KanaGuessingForm />
      ) : (
        <ReadingStagePicker weekdayLabel={weekdayLabel} autoSet={autoSet} />
      )}
    </div>
  );
}
