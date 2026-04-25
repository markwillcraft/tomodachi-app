import { prisma } from "./prisma";
import { getUserTimezone, localDayKey } from "./time";

// =====================================================================
// In-app notifications
// ---------------------------------------------------------------------
// The bell-icon system. Every event that should land in the bell goes
// through `notify()` (or one of the typed wrappers below) — never write
// to the `Notification` table directly. The dedupKey contract is what
// makes triggers idempotent, so the same quiz submission or achievement
// unlock can be re-posted without producing duplicate rows. The shape
// of the dedup key is documented per-kind in this file.
//
// The "Welcome back" greeting is intentionally NOT a notification — it
// renders as a transient floating toast on first signed-in mount of a
// browser session (see `src/components/welcome-toast.tsx`) so it
// doesn't clutter the bell with a row the user can never act on.
//
// Roadmap: src/.cursor/docs/roadmap/04-in-app-notifications.md
// =====================================================================

export type NotificationKind =
  // A quiz attempt was submitted — vocab / kana / kanji.
  | "session.quiz"
  // A kana muscle-memory drill was completed.
  | "session.kana_drill"
  // The user crossed a daily card-study tier (25 / 50 / 100).
  | "session.cards_milestone"
  // The user crossed a daily kanji-study tier.
  | "session.kanji_milestone"
  // All three sections of a Dojo lesson are now passed.
  | "lesson.dojo_completed"
  // A new achievement was unlocked.
  | "achievement.unlocked"
  // A daily quest was completed AND its reward was just claimed.
  | "quest.completed";

// Kind → human-friendly title shown in the bell row. Keep these short
// (under ~40 chars) so they fit the dropdown without truncation.
export const KIND_LABEL: Record<NotificationKind, string> = {
  "session.quiz": "Quiz finished",
  "session.kana_drill": "Drill complete",
  "session.cards_milestone": "Vocab milestone",
  "session.kanji_milestone": "Kanji milestone",
  "lesson.dojo_completed": "Lesson complete",
  "achievement.unlocked": "Achievement unlocked",
  "quest.completed": "Quest completed",
};

// Per-kind canonical destination. Click on the bell row → router.push().
// Some payloads override this (e.g. quest.completed could deep-link to
// the quest list); the writer is free to attach `payload.href`.
export const KIND_DEFAULT_HREF: Record<NotificationKind, string> = {
  "session.quiz": "/progress",
  "session.kana_drill": "/study/muscle-memory",
  "session.cards_milestone": "/study/vocab",
  "session.kanji_milestone": "/study/kanji",
  "lesson.dojo_completed": "/dojo",
  "achievement.unlocked": "/achievements",
  "quest.completed": "/dashboard",
};

// Kind-tagged payloads. Type-safe constructors below ensure each
// notify call attaches the right shape.
export type NotificationPayload =
  | { kind: "session.quiz"; mode: string; total: number; correct: number }
  | {
      kind: "session.kana_drill";
      total: number;
      correct: number;
      coinsEarned: number;
    }
  | {
      kind: "session.cards_milestone";
      tier: number;
      tierMax: number;
    }
  | {
      kind: "session.kanji_milestone";
      tier: number;
      tierMax: number;
    }
  | {
      kind: "lesson.dojo_completed";
      lessonId: string;
      lessonTitle: string;
      level: string;
    }
  | {
      kind: "achievement.unlocked";
      achievementId: string;
      title: string;
      icon: string;
    }
  | {
      kind: "quest.completed";
      questId: string;
      title: string;
      reward: number;
    };

// =====================================================================
// Writers
// =====================================================================

type NotifyArgs = {
  userId: string;
  kind: NotificationKind;
  payload: Extract<NotificationPayload, { kind: NotificationKind }>;
  dedupKey: string;
};

/**
 * The single writer. Insert a notification row, idempotent on
 * (userId, dedupKey). Returns the freshly created row (already
 * serialized for the wire) when a new row was inserted, or `null`
 * when the dedupKey already existed (= silent no-op) or any other
 * failure occurred.
 *
 * Trigger routes use the non-null returns to populate
 * `newNotifications` in their JSON response, which the client-side
 * `apiFetch` wrapper auto-dispatches to the toast bus. That's how a
 * single `notify*` call simultaneously lands in the bell history AND
 * pops a toast on the user's screen.
 *
 * Failures are swallowed and logged so a downstream notification
 * outage never breaks the user-facing action that triggered it
 * (quiz submit, dojo lesson complete, etc.).
 */
export async function notify({
  userId,
  kind,
  payload,
  dedupKey,
}: NotifyArgs): Promise<NotificationRow | null> {
  if (payload.kind !== kind) {
    // Programmer error — fail loudly in dev but don't crash prod.
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        `notify() kind/payload mismatch: kind=${kind} payload.kind=${payload.kind}`,
      );
    }
    return null;
  }
  try {
    const row = await prisma.notification.create({
      data: {
        userId,
        kind,
        payload: payload as object,
        dedupKey,
      },
    });
    return {
      id: row.id,
      kind: row.kind as NotificationKind,
      payload: row.payload as unknown as NotificationPayload,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  } catch (err) {
    // P2002 = unique constraint clash on (userId, dedupKey) → already
    // notified, treat as success (no-op).
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return null;
    }
    console.error("[notify] failed to insert notification:", err);
    return null;
  }
}

// =====================================================================
// Typed wrappers — use these from trigger sites instead of `notify()`
// directly. They centralise the dedupKey shape per kind so no two
// call sites can ever disagree on the format.
// =====================================================================

export function notifyQuizFinished(
  userId: string,
  attemptId: number,
  args: { mode: string; total: number; correct: number },
): Promise<NotificationRow | null> {
  return notify({
    userId,
    kind: "session.quiz",
    payload: { kind: "session.quiz", ...args },
    dedupKey: `quiz:${attemptId}`,
  });
}

export function notifyKanaDrillFinished(
  userId: string,
  drillKey: string,
  args: { total: number; correct: number; coinsEarned: number },
): Promise<NotificationRow | null> {
  return notify({
    userId,
    kind: "session.kana_drill",
    payload: { kind: "session.kana_drill", ...args },
    dedupKey: `kana_drill:${drillKey}`,
  });
}

export function notifyCardsMilestone(
  userId: string,
  localDay: string,
  tier: number,
  tierMax: number,
): Promise<NotificationRow | null> {
  return notify({
    userId,
    kind: "session.cards_milestone",
    payload: { kind: "session.cards_milestone", tier, tierMax },
    dedupKey: `vocab_milestone:${userId}:${localDay}:${tier}`,
  });
}

export function notifyKanjiMilestone(
  userId: string,
  localDay: string,
  tier: number,
  tierMax: number,
): Promise<NotificationRow | null> {
  return notify({
    userId,
    kind: "session.kanji_milestone",
    payload: { kind: "session.kanji_milestone", tier, tierMax },
    dedupKey: `kanji_milestone:${userId}:${localDay}:${tier}`,
  });
}

export function notifyDojoLessonCompleted(
  userId: string,
  args: { lessonId: string; lessonTitle: string; level: string },
): Promise<NotificationRow | null> {
  return notify({
    userId,
    kind: "lesson.dojo_completed",
    payload: { kind: "lesson.dojo_completed", ...args },
    dedupKey: `dojo_lesson:${args.lessonId}`,
  });
}

export function notifyAchievementUnlocked(
  userId: string,
  args: { achievementId: string; title: string; icon: string },
): Promise<NotificationRow | null> {
  return notify({
    userId,
    kind: "achievement.unlocked",
    payload: { kind: "achievement.unlocked", ...args },
    dedupKey: `achievement:${userId}:${args.achievementId}`,
  });
}

export function notifyQuestCompleted(
  userId: string,
  localDay: string,
  args: { questId: string; title: string; reward: number },
): Promise<NotificationRow | null> {
  return notify({
    userId,
    kind: "quest.completed",
    payload: { kind: "quest.completed", ...args },
    dedupKey: `quest:${localDay}:${args.questId}`,
  });
}

// =====================================================================
// Card / kanji study milestones
// ---------------------------------------------------------------------
// Used by the cards/view + kanji/view endpoints. Given the count BEFORE
// the current view (i.e. the count of awarded views earlier today),
// figure out whether this view crossed one of the milestone tiers.
// Returns the tier we just crossed (or null if none).
//
// Why "awarded" count vs raw view count? Because the daily cap on
// coin-bearing views (50 in `coins.ts`) is what matters for "did the
// user really study a card today". Cap-bouncing extra views shouldn't
// drive milestones either.
// =====================================================================

export const CARD_MILESTONES = [25, 50, 100] as const;
export const KANJI_MILESTONES = [25, 50, 100] as const;

const CARD_MAX = CARD_MILESTONES[CARD_MILESTONES.length - 1];
const KANJI_MAX = KANJI_MILESTONES[KANJI_MILESTONES.length - 1];

function crossedTier(
  awardedBefore: number,
  awardedAfter: number,
  tiers: readonly number[],
): number | null {
  for (const t of tiers) {
    if (awardedBefore < t && awardedAfter >= t) return t;
  }
  return null;
}

/**
 * Call after `awardForCardView()` if it actually awarded.
 * `awardedBefore` is the count returned by the per-day-cap COUNT that
 * `awardForCardView` already runs, so no extra DB query is needed.
 *
 * Returns the created notification row when this view crossed a tier
 * (so the route can include it in `newNotifications`), or `null` when
 * no tier was crossed / dedup'd.
 */
export async function maybeNotifyCardsMilestone(
  userId: string,
  awardedBefore: number,
): Promise<NotificationRow | null> {
  const tier = crossedTier(awardedBefore, awardedBefore + 1, CARD_MILESTONES);
  if (tier === null) return null;
  const day = localDayKey(new Date(), await getUserTimezone(userId));
  return notifyCardsMilestone(userId, day, tier, CARD_MAX);
}

export async function maybeNotifyKanjiMilestone(
  userId: string,
  awardedBefore: number,
): Promise<NotificationRow | null> {
  const tier = crossedTier(awardedBefore, awardedBefore + 1, KANJI_MILESTONES);
  if (tier === null) return null;
  const day = localDayKey(new Date(), await getUserTimezone(userId));
  return notifyKanjiMilestone(userId, day, tier, KANJI_MAX);
}

// =====================================================================
// Readers
// =====================================================================

export type NotificationRow = {
  id: number;
  kind: NotificationKind;
  payload: NotificationPayload;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListing = {
  notifications: NotificationRow[];
  unreadCount: number;
};

/**
 * Fetch the user's latest notifications + their unread count in one
 * round trip. Used by the bell dropdown (10 most recent).
 *
 * For the full history page that paginates over potentially
 * thousands of rows, use `getNotificationsPage()` instead — it
 * returns a `total` so the UI can render page controls and a
 * "Page X of Y" indicator without a second query.
 */
export async function getNotifications(
  userId: string,
  limit = 10,
): Promise<NotificationListing> {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      select: {
        id: true,
        kind: true,
        payload: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ]);
  return {
    notifications: rows.map((r) => ({
      id: r.id,
      kind: r.kind as NotificationKind,
      payload: r.payload as unknown as NotificationPayload,
      readAt: r.readAt ? r.readAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

// Pagination defaults for the /notifications history page. Kept here
// so the page component, the client island, and the URL helper all
// agree on the same numbers.
export const NOTIFICATIONS_PER_PAGE = 10;
export const NOTIFICATIONS_MAX_PER_PAGE = 50;

export type NotificationPage = {
  notifications: NotificationRow[];
  // 1-indexed page the result is for, after clamping. So if the
  // caller asked for page 9999 but only 3 pages exist, this is `3`.
  page: number;
  perPage: number;
  // Total rows for the user across all pages. Lets the UI render
  // "Showing 21–30 of 247" without a second query.
  total: number;
  totalPages: number;
  unreadCount: number;
};

/**
 * Paginated reader for the /notifications history page. Offset
 * pagination (skip / take) — fine for our row volume since every
 * page lookup is bounded by `(userId, createdAt desc)` which is
 * indexed, and the user's total notification count is naturally
 * capped by their own activity.
 *
 * Clamps page out-of-range to the last available page so a stale
 * URL (e.g. `?page=99` after deleting many rows) still renders
 * something useful instead of a blank screen.
 */
export async function getNotificationsPage(
  userId: string,
  opts: { page?: number; perPage?: number } = {},
): Promise<NotificationPage> {
  const perPage = Math.min(
    NOTIFICATIONS_MAX_PER_PAGE,
    Math.max(1, Math.floor(opts.perPage ?? NOTIFICATIONS_PER_PAGE)),
  );
  const requestedPage = Math.max(1, Math.floor(opts.page ?? 1));

  const [total, unreadCount] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * perPage;

  const rows = total === 0
    ? []
    : await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        select: {
          id: true,
          kind: true,
          payload: true,
          readAt: true,
          createdAt: true,
        },
      });

  return {
    notifications: rows.map((r) => ({
      id: r.id,
      kind: r.kind as NotificationKind,
      payload: r.payload as unknown as NotificationPayload,
      readAt: r.readAt ? r.readAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
    page,
    perPage,
    total,
    totalPages,
    unreadCount,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(
  userId: string,
  id: number,
): Promise<{ ok: true; unreadCount: number } | { ok: false }> {
  const row = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true, readAt: true },
  });
  if (!row) return { ok: false };
  if (!row.readAt) {
    await prisma.notification.update({
      where: { id: row.id },
      data: { readAt: new Date() },
    });
  }
  const unreadCount = await getUnreadCount(userId);
  return { ok: true, unreadCount };
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<{ updated: number }> {
  const res = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}
