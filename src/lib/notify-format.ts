import type { NotificationKind, NotificationPayload } from "./notify";

// =====================================================================
// Notification row formatting
// ---------------------------------------------------------------------
// Single source of truth for how a Notification row renders in the UI.
// Both the bell dropdown and the /notifications history page call
// `formatNotification()` so the copy stays consistent.
//
// Lives in its own module (no React, no DB) so it can be imported by
// both Server Components and Client Components without forcing either
// to pull in the other's runtime.
// =====================================================================

export type FormattedNotification = {
  // Short headline ("Quiz finished", "Achievement unlocked").
  title: string;
  // One-line body with the specifics.
  body: string;
  // Where to navigate when the user clicks the row.
  href: string;
  // Optional emoji / single-glyph for the row's icon slot. Falls back
  // to the kind's tone color when absent.
  glyph: string;
  // Visual tone for the row badge.
  tone: NotificationTone;
};

export type NotificationTone =
  | "violet"
  | "amber"
  | "emerald"
  | "rose"
  | "sky"
  | "neutral";

export function formatNotification(
  kind: NotificationKind,
  payload: NotificationPayload,
): FormattedNotification {
  switch (payload.kind) {
    case "session.quiz": {
      const pct =
        payload.total > 0
          ? Math.round((payload.correct / payload.total) * 100)
          : 0;
      const modeLabel = formatQuizModeLabel(payload.mode);
      const isDojo = payload.mode.startsWith("dojo_");
      return {
        title: isDojo ? "Dojo section finished" : "Quiz finished",
        body: `${modeLabel} · ${payload.correct} / ${payload.total} correct · ${pct}%`,
        href: isDojo ? "/dojo" : "/progress",
        glyph: isDojo ? "🥋" : "📝",
        tone: pct >= 90 ? "emerald" : pct >= 60 ? "violet" : "rose",
      };
    }

    case "session.kana_drill": {
      const pct =
        payload.total > 0
          ? Math.round((payload.correct / payload.total) * 100)
          : 0;
      return {
        title: "Drill complete",
        body: `${payload.correct} / ${payload.total} kana · +${payload.coinsEarned} coins`,
        href: "/study/muscle-memory",
        glyph: "⌨️",
        tone: pct === 100 ? "emerald" : "violet",
      };
    }

    case "session.cards_milestone":
      return {
        title: "Vocab milestone",
        body: `Studied ${payload.tier} cards today${payload.tier >= payload.tierMax ? " — wow!" : ""}`,
        href: "/study/vocab",
        glyph: "📚",
        tone: payload.tier >= payload.tierMax ? "emerald" : "amber",
      };

    case "session.kanji_milestone":
      return {
        title: "Kanji milestone",
        body: `Studied ${payload.tier} kanji today${payload.tier >= payload.tierMax ? " — wow!" : ""}`,
        href: "/study/kanji",
        glyph: "字",
        tone: payload.tier >= payload.tierMax ? "emerald" : "amber",
      };

    case "lesson.dojo_completed":
      return {
        title: "Lesson complete",
        body: payload.lessonTitle,
        href: `/dojo/${payload.level}/${payload.lessonId}`,
        glyph: "🎓",
        tone: "emerald",
      };

    case "achievement.unlocked":
      return {
        title: "Achievement unlocked",
        body: payload.title,
        href: "/achievements",
        glyph: payload.icon || "🏆",
        tone: "amber",
      };

    case "quest.completed":
      return {
        title: "Daily quest done",
        body: `${payload.title} · +${payload.reward} coins`,
        href: "/dashboard",
        glyph: "✅",
        tone: "emerald",
      };

    default: {
      // Unknown kind (data migrated from a future deploy?) — degrade
      // gracefully instead of crashing.
      const _exhaustive: never = payload;
      void _exhaustive;
      return {
        title: kind,
        body: "",
        href: "/dashboard",
        glyph: "🔔",
        tone: "neutral",
      };
    }
  }
}

function formatQuizModeLabel(mode: string): string {
  const normalized = mode.trim().toLowerCase();
  if (normalized === "vocab") return "Vocab quiz";
  if (normalized === "kana") return "Kana quiz";
  if (normalized === "kanji") return "Kanji quiz";
  if (normalized === "mixed") return "Mixed quiz";

  if (normalized.startsWith("dojo_")) {
    const section = normalized.slice("dojo_".length);
    if (section === "grammar") return "Dojo grammar";
    if (section === "vocab") return "Dojo vocab";
    if (section === "listening") return "Dojo listening";
    return "Dojo section";
  }

  // Unknown/future modes degrade cleanly to title case.
  const cleaned = normalized.replace(/[_-]+/g, " ").trim();
  if (!cleaned) return "Quiz";
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)} quiz`;
}

// Tone → tailwind classes for the icon bubble. Kept here so the bell
// and history page render the same colors.
export const TONE_CLASSES: Record<NotificationTone, string> = {
  violet:
    "bg-violet-500/15 text-violet-700 ring-violet-500/30 dark:text-violet-200",
  amber:
    "bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-200",
  emerald:
    "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-200",
  rose: "bg-rose-500/15 text-rose-700 ring-rose-500/30 dark:text-rose-200",
  sky: "bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-200",
  neutral:
    "bg-muted text-muted-foreground ring-border",
};
