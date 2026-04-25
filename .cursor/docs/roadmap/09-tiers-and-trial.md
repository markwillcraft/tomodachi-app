# Tiers & Trial

> Status: Proposed
> Priority: P1  ·  Est. effort: M  ·  Depends on: 01-onboarding, 08-membership

## Why

Today every authenticated user has identical capabilities. Even after 08
ships, the binary "Free vs Member" model leaves money on the table — most
users never *feel* what membership unlocks, so they don't convert. A 14-day
**Trial** that gives every new user full member access for free, then
gracefully degrades to **Free**, has been the proven shape for one-time
study apps (Anki Mobile, Bear, Things 3). Conversion roughly 2–3× a binary
free/paid split.

This doc formalizes the three-tier model and the single helper every gate
must call: `getEffectiveTier(userId)`.

## Goals / non-goals

**In:** Three tiers (`trial`, `free`, `lifetime` — `founder` is a flavor
of `lifetime`). Trial auto-starts on sign-up, no payment collected. Trial
expires silently to Free; one-time soft prompt the user can dismiss. One
helper resolves a user's effective tier; every gate calls it.

**Out:** Subscriptions. Trial extensions ("invite a friend, get 7 more
days") — separate doc. Mid-trial upsell modals. Re-trials for lapsed users.

## AI Study Tips (hidden; single placement when enabled)

**Current:** The in-app UI for Gemini-powered study tips is **off** — it was
removed from **Progress** (`/progress`) and from **post-quiz results** on
`/quiz/play`. The API `POST /api/progress/tips` and `generateTips()` in
`src/lib/gemini.ts` stay in the codebase (rate-limited) for when we turn the
feature back on.

**When we ship it again:** Expose the feature in **one place only** — e.g. a
single block on **Progress** *or* a panel on the quiz results screen, **not
both**. One surface keeps quota, caching, and membership tier rules
straightforward and avoids double LLM spend if a user opens both. The tier
table in this doc (Free 1/day vs member unlimited) still targets that one
entry point.

## Tier model

| Tier | Source of truth | Lifetime |
|---|---|---|
| `trial` | `UserProfile.trialEndsAt > now` AND `membershipTier IS NULL` | First 14 days from sign-up |
| `free` | `trialEndsAt <= now` AND `membershipTier IS NULL` | Forever |
| `founder` | `membershipTier = "founder"` (set by 08 webhook) | Forever; first 100 buyers |
| `lifetime` | `membershipTier = "lifetime"` | Forever |

**Resolution helper** — single source of truth, used everywhere:

```ts
// src/lib/tiers.ts (sketch)
export type EffectiveTier = "trial" | "free" | "founder" | "lifetime";

export async function getEffectiveTier(userId: string): Promise<EffectiveTier> {
  const p = await prisma.userProfile.findUnique({
    where: { userId },
    select: { membershipTier: true, trialEndsAt: true },
  });
  if (p?.membershipTier === "founder") return "founder";
  if (p?.membershipTier === "lifetime") return "lifetime";
  if (p?.trialEndsAt && p.trialEndsAt > new Date()) return "trial";
  return "free";
}

export async function isMember(userId: string) {
  const t = await getEffectiveTier(userId);
  return t === "founder" || t === "lifetime";
}

export async function hasMemberPerks(userId: string) {
  const t = await getEffectiveTier(userId);
  return t !== "free"; // trial users get member perks during trial
}
```

`isMember()` = "actually paid". `hasMemberPerks()` = "should see premium
features today". The distinction matters for billing reporting + the
Founder badge (which only shows for actual buyers).

## What each tier unlocks

| Feature | Trial (14d) | Free | Member (Founder/Lifetime) |
|---|---|---|---|
| Onboarding (Dachi, flag, level) | ✓ | ✓ | ✓ |
| Kana / vocab / kanji study | ✓ | ✓ | ✓ |
| Dojo N5 (full curriculum) | ✓ | ✓ | ✓ |
| Dojo N4 (gated by N5 completion) | ✓ + skip gate | ✓ | ✓ + skip gate |
| SRS + Quiz engine | ✓ | ✓ | ✓ |
| Streak, daily quests, achievements | ✓ | ✓ | ✓ |
| Coins + Shop | ✓ | ✓ | ✓ + 2× earnings + 10k starter |
| **AI Study Tips** | Unlimited | 1/day | Unlimited |
| **Color themes** | All 6 | Sakura only | All 6 |
| **Friends** (when shipped) | ✓ | 5 friends max | Unlimited |
| **Study Buddy video** (when shipped) | 30 min/day | Not available | 2 hr/day |
| **Founder badge** (public) | — | — | First 100 buyers only |
| **Founder Dachi cosmetic** | — | — | First 100 buyers only |
| **Email reminders** | ✓ | ✓ | ✓ + priority support |

Free is intentionally a **real** product — Tomodachi is fundamentally a
study app, not a content-locked one. The premium perks are convenience,
cosmetics, and limit removal, not core curriculum access.

## Trial mechanics

1. **Sign-up triggers trial.** Onboarding submission stamps
   `trialEndsAt = now + 14 days`. No payment collected. No card required.
2. **Banner on every page during trial.** *"11 days left of full access.
   No payment needed — explore everything!"* Dismissible per-day.
3. **Soft expiry.** When `trialEndsAt` passes, no rows change — the helper
   simply returns `"free"` next time it's called. The trial state is
   ephemeral.
4. **One-time exit modal.** First time a user with expired trial visits
   any page, show: *"Your trial ended. Keep studying for free, or unlock
   everything once for ₱699."* Tracked via `UserProfile.trialEndedSeenAt`
   so it shows exactly once.
5. **No re-trials.** Once `trialEndsAt` is in the past, it stays in the
   past. (Bypass prevention.)

This is intentionally the kindest UX possible — Filipino users especially
distrust "trials" that auto-charge. Tomodachi's trial never asks for a
card, so the worst-case for the user is "the AI tips button got slower".

## Data model

Additions to existing `UserProfile` (no new tables needed):

```prisma
model UserProfile {
  // ...existing fields (userId, timezone, autoFreezeStreak, updatedAt)
  // From 08-membership: membershipTier, membershipPurchasedAt
  trialEndsAt        DateTime?    // null = no trial recorded; backfilled for new users
  trialEndedSeenAt   DateTime?    // null = haven't shown the post-trial modal yet
}
```

**Backfill plan for existing users (pre-launch):**

- Existing users get `trialEndsAt = createdAt + 14 days` if their account
  is younger than 14 days at deploy, else `trialEndsAt = NULL`.
- Existing users older than 14 days fall straight to `free` — no trial
  retroactively. (Could be controversial; alternative is "give everyone a
  fresh 14-day trial on launch day" which is more generous and
  conversion-friendly.) **Recommend the generous option** for goodwill.

## API surface

Mostly internal — no new public endpoints. One small one for the dashboard:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/me/tier` | GET | Returns `{ tier, trialEndsAt, isMember, perks }` for the dashboard banner + locked-feature tooltips. |

## Source files (planned)

- `src/lib/tiers.ts` — `getEffectiveTier`, `isMember`, `hasMemberPerks`,
  `requirePerks(perk)`, `daysLeftInTrial`. **Single source of truth — no
  other file checks `membershipTier` directly.**
- `src/components/trial-banner.tsx` — site-wide top banner during trial.
- `src/components/trial-ended-modal.tsx` — one-time exit modal.
- `src/lib/onboarding.ts` (extends 01) — stamps `trialEndsAt` on submit.

## Open questions

- **Backfill: generous or strict?** Recommend generous (every existing
  user gets a fresh 14-day trial on launch day). Costs nothing, builds
  goodwill.
- **Trial visible in shop page?** During trial, the Membership page should
  highlight: *"You're getting all this free until [date]. Lock it in
  forever for ₱699."* Sells the urgency of trial expiry.
- **Should trial appear in the streak/coin display?** No — keep tier UI
  separate from study UI to avoid clutter.
- **Trial extension via referral?** *"Invite 3 friends, get 7 more days."*
  Defer — needs Friends feature shipped first, and risks devaluing
  membership if too easy.
- **Multiple devices on same Clerk account = one trial?** Yes,
  `trialEndsAt` is per `userId` (Clerk id), not per device. No abuse
  vector here.
- **What about users who paid before trial existed?** They have
  `membershipTier` set, so `getEffectiveTier` returns their paid tier and
  ignores `trialEndsAt`. No conflict.

## Done = acceptance checklist

- [ ] `getEffectiveTier()` is the only function that reads
      `membershipTier` or `trialEndsAt`. Every gate uses it.
- [ ] Onboarding submission stamps `trialEndsAt = now + 14 days`.
- [ ] Trial banner renders on every authed page during trial, dismissible
      per-day.
- [ ] Trial-ended modal shows exactly once after expiry.
- [ ] No fields change when trial expires — purely a time-based check.
- [ ] Existing users backfilled per chosen strategy.
- [ ] All paywalled features (AI tips, themes, friends cap, study buddy
      cap) call `hasMemberPerks()` or feature-specific perk checks.
- [ ] `/api/me/tier` returns accurate state including
      `daysLeftInTrial` for the banner.
- [ ] `README.md` updated.

## README touchpoints when shipped

- New `### Tiers & Trial` subsection under `## Feature reference` + TOC.
- `## Authentication & multi-tenancy` — note "every gate goes through
  `getEffectiveTier()`".
- `## Data model` — `trialEndsAt`, `trialEndedSeenAt` on `UserProfile`.
- `## API surface` — new `/api/me/tier` row.
- `## Conventions` — new convention: "Never read `membershipTier`
  directly. Use `getEffectiveTier()` / `hasMemberPerks()`."
- Bottom-of-README source-of-truth table — add `src/lib/tiers.ts`.
