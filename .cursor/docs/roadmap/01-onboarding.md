# Onboarding

> Status: Proposed
> Priority: P0  ·  Est. effort: M  ·  Depends on: —

## Why

New users land on `/dashboard` with zero context — no Dachi, no language
level, no flag. The app feels generic. A guided 4-step onboarding personalises
the mascot, segments difficulty, and gives the social features (friends,
leaderboards) something to display.

## Goals / non-goals

**In:** Pick a Dachi · pick country flag · pick JLPT level · pick a public
display name. Hard gate: can't reach `/dashboard` until done.

**Out:** Tutorial walkthrough of every feature. Profile photo upload.
Multiple Dachi switching (separate roadmap once Shop ships pet cosmetics).

## UX flow

1. Clerk sign-up completes → redirect to `/onboarding/dachi`.
2. **Step 1 — Dachi**: 6-tile picker (Fox, Capybara, Flamingo, Otter, Tanuki,
   Shiba).
3. **Step 2 — Country**: searchable flag grid (ISO 3166-1 alpha-2).
4. **Step 3 — JLPT level**: Absolute beginner · N5 · N4 · N3+. Sets initial
   Dojo path.
5. **Step 4 — Display name**: 3–20 chars, unique, used for friends +
   leaderboards.
6. Submit → stamp `onboardedAt` → redirect to `/dashboard` with a celebratory
   toast.

Server-component check on `/dashboard` (and middleware for client routes)
redirects users with `onboardedAt: null` back to `/onboarding/dachi`.

## Data model

Additions to existing `UserProfile` (no new tables required):

```prisma
model UserProfile {
  // ...existing fields (userId, timezone, autoFreezeStreak, updatedAt)
  dachi         String?   // catalog id from src/lib/dachi.ts
  countryCode   String?   // ISO 3166-1 alpha-2
  jlptLevel     String?   // "absolute_beginner" | "n5" | "n4" | "n3_plus"
  displayName   String?   @unique  // 3–20 chars
  onboardedAt   DateTime?
}
```

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/profile/onboarding` | POST | Validate + persist all 4 fields, stamp `onboardedAt`. |
| `/api/profile/display-name/check` | GET | Async availability check during typing. |

## Source files (planned)

- `src/lib/dachi.ts` — typed catalog (id, name, image, unlock rule).
- `src/lib/countries.ts` — ISO list + flag emoji helper.
- `src/lib/onboarding.ts` — validation + `requireOnboarded()` guard.
- `src/app/onboarding/layout.tsx` — stepper shell.
- `src/app/onboarding/dachi/page.tsx`, `country/page.tsx`, `level/page.tsx`,
  `name/page.tsx`.
- `src/middleware.ts` — gate non-onboarding authed routes.

## Open questions

- Skip-able? (Recommend **no** — every social feature later assumes name +
  flag.)
- Does picking N4/N3+ unlock the N4 Dojo path immediately, or still gated by
  N5 completion? (Recommend: still gated — JLPT level is *preference*, not
  entitlement.)
- Where does the Dachi appear in the UI today? Dashboard mascot? Sidebar?
  (Coordinate with Shop Phase 2 mascot canvas.)

## Done = acceptance checklist

- [ ] New user redirected from sign-up directly into onboarding.
- [ ] Cannot reach `/dashboard`, `/study`, `/quiz`, `/dojo` with
      `onboardedAt: null`.
- [ ] All 4 fields persisted; `displayName` unique enforced at DB level.
- [ ] Settings page has an "Edit profile" section to change
      Dachi/flag/level/name later.
- [ ] `README.md` updated.

## README touchpoints when shipped

- New `### Onboarding` subsection under `## Feature reference` + TOC entry.
- `## Authentication & multi-tenancy` — note onboarding gate.
- `## Data model` — updated `UserProfile`.
- `## API surface` — new endpoints.
- Bottom-of-README source-of-truth table — add `src/lib/dachi.ts`,
  `src/lib/onboarding.ts`.
