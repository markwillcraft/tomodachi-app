import { prisma } from "./prisma";

// =====================================================================
// Local-day helpers
// ---------------------------------------------------------------------
// All daily-rollover features (streak, daily quests, "today's earnings")
// must roll over at the user's local midnight, not UTC midnight.
// Otherwise a user in Asia/Manila (UTC+8) sees the day flip at 8 AM local
// time — meaning a 9 PM study session leaves them only 3 hours to
// complete the *next* day's goals.
//
// We compute boundaries via Intl.DateTimeFormat in the user's tz, which
// correctly handles DST and historical offset changes without us having
// to ship a tz database.
// =====================================================================

const DEFAULT_TZ = "UTC";

// Cache so we don't hit the DB on every getStreak()/getCoinSummary() call
// inside the same request lifetime. The cache key is the userId; entries
// are tiny rows and never need eviction during a single Node process —
// we just refresh on profile updates.
type CachedProfile = {
  timezone: string;
  autoFreezeStreak: boolean;
};
const profileCache = new Map<string, CachedProfile>();

const DEFAULT_PROFILE: CachedProfile = {
  timezone: DEFAULT_TZ,
  autoFreezeStreak: true,
};

async function loadProfile(userId: string): Promise<CachedProfile> {
  const cached = profileCache.get(userId);
  if (cached) return cached;
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { timezone: true, autoFreezeStreak: true },
    });
    const value: CachedProfile = profile
      ? {
          timezone: profile.timezone,
          autoFreezeStreak: profile.autoFreezeStreak,
        }
      : DEFAULT_PROFILE;
    profileCache.set(userId, value);
    return value;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function getUserTimezone(userId: string): Promise<string> {
  const p = await loadProfile(userId);
  return p.timezone;
}

export async function getUserPreferences(userId: string): Promise<{
  timezone: string;
  autoFreezeStreak: boolean;
}> {
  return loadProfile(userId);
}

export async function setUserTimezone(
  userId: string,
  timezone: string,
): Promise<void> {
  if (!isValidTimezone(timezone)) return;
  const updated = await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, timezone },
    update: { timezone },
    select: { timezone: true, autoFreezeStreak: true },
  });
  profileCache.set(userId, {
    timezone: updated.timezone,
    autoFreezeStreak: updated.autoFreezeStreak,
  });
}

// Toggle the auto-apply behavior of streak freezes. When `false`, the
// reconcile job stops spending freezes on missed days and the user
// burns them manually from the streak calendar.
//
// We explicitly do *not* use `upsert` with a plain `create: { userId }`
// here. Doing so would fall back to the `timezone` column default
// (`"UTC"`) and clobber a user whose row hasn't been seeded yet by the
// browser's Intl auto-sync — producing streaks / quests that roll over
// at UTC midnight instead of their real local midnight. Instead, we
// update if the row exists and only create with a best-effort timezone
// fallback otherwise.
export async function setAutoFreezeStreak(
  userId: string,
  value: boolean,
  fallbackTimezone?: string,
): Promise<void> {
  const existing = await prisma.userProfile.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  const tz =
    existing?.timezone ??
    (fallbackTimezone && isValidTimezone(fallbackTimezone)
      ? fallbackTimezone
      : DEFAULT_TZ);
  const updated = await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, autoFreezeStreak: value, timezone: tz },
    update: { autoFreezeStreak: value },
    select: { timezone: true, autoFreezeStreak: true },
  });
  profileCache.set(userId, {
    timezone: updated.timezone,
    autoFreezeStreak: updated.autoFreezeStreak,
  });
}

export function isValidTimezone(tz: string): boolean {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// =====================================================================
// Conversion primitives
// =====================================================================

// Returns the wall-clock parts (year/month/day/hour/minute) of a UTC
// instant *as observed in the given timezone*.
function partsInTz(date: Date, tz: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  let hour = get("hour");
  // Some Intl impls emit "24" for midnight in 24-hour mode — normalize.
  if (hour === 24) hour = 0;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
  };
}

// Returns the "YYYY-MM-DD" key for the given instant *in tz*. Used as a
// stable bucket key for daily aggregates and dedup keys (e.g.
// "quest:2026-04-22:first_quiz").
export function localDayKey(date: Date, tz: string): string {
  // en-CA outputs "YYYY-MM-DD" already.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Given a wall-clock local time in tz, return the UTC instant.
// Algorithm: pretend the wall clock is UTC (the "naive" instant), see
// what local time that produces in tz, then shift by the difference.
// Two-pass to handle DST transitions cleanly.
function wallTimeToUtc(
  tz: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  // What does that instant look like in tz?
  const localOfNaive = partsInTz(new Date(naiveUtcMs), tz);
  const localAsUtcMs = Date.UTC(
    localOfNaive.year,
    localOfNaive.month - 1,
    localOfNaive.day,
    localOfNaive.hour,
    localOfNaive.minute,
  );
  // offset = how much "local time" is ahead of "UTC time" at that instant
  const offsetMs = localAsUtcMs - naiveUtcMs;
  let utc = new Date(naiveUtcMs - offsetMs);

  // Sanity pass: re-derive the local time of `utc` and nudge if a DST
  // transition moved us.
  const local2 = partsInTz(utc, tz);
  const got = Date.UTC(
    local2.year,
    local2.month - 1,
    local2.day,
    local2.hour,
    local2.minute,
  );
  const want = Date.UTC(year, month - 1, day, hour, minute);
  if (got !== want) {
    utc = new Date(utc.getTime() - (got - want));
  }
  return utc;
}

// Returns the UTC `Date` that corresponds to the start of `date`'s local
// calendar day in tz. E.g. for now=2026-04-22T13:00Z in Asia/Manila,
// returns 2026-04-21T16:00:00Z (= 2026-04-22 00:00 PHT).
export function localMidnight(date: Date, tz: string): Date {
  const p = partsInTz(date, tz);
  return wallTimeToUtc(tz, p.year, p.month, p.day, 0, 0);
}

// Returns the UTC `Date` for the local midnight that *starts* the given
// local day key in tz.
export function localDayKeyToUtcMidnight(dayKey: string, tz: string): Date {
  const [y, m, d] = dayKey.split("-").map((s) => Number(s));
  return wallTimeToUtc(tz, y, m, d, 0, 0);
}

// Returns the UTC `Date` for the *next* local midnight after `date` in tz.
export function nextLocalMidnight(date: Date, tz: string): Date {
  // Step ahead 25h to be safely inside tomorrow even across DST jumps,
  // then snap back to that day's local midnight.
  const tomorrow = new Date(localMidnight(date, tz).getTime() + 25 * 3600_000);
  return localMidnight(tomorrow, tz);
}

// Convenience: [start, end) of a specific local day key as UTC instants.
export function localDayBoundaries(
  dayKey: string,
  tz: string,
): { start: Date; end: Date } {
  const start = localDayKeyToUtcMidnight(dayKey, tz);
  const end = nextLocalMidnight(start, tz);
  return { start, end };
}

// Step backward one local calendar day from a given key.
export function previousLocalDayKey(dayKey: string, tz: string): string {
  const { start } = localDayBoundaries(dayKey, tz);
  // 2 hours back is safely inside yesterday regardless of DST direction.
  return localDayKey(new Date(start.getTime() - 2 * 3600_000), tz);
}
