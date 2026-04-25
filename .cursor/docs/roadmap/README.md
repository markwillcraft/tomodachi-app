# Roadmap

Living index of features that are designed but not yet shipped. Each doc is a
self-contained proposal: scope, schema, API surface, open questions, and the
`README.md` sections that need to be updated when it ships.

When a feature ships, flip its **Status** at the top to `Shipped` and link to
the `README.md` section it now lives in. Don't delete the doc — it's the
design record.

These docs are NOT covered by `.cursor/rules/readme-maintenance.mdc` (that
rule governs shipped behaviour in `README.md`). Roadmap docs describe
*proposals* — they only become README content when the feature ships.

## Priority order (current)

| # | Feature | Priority | Effort | Status |
|---|---|---|---|---|
| 01 | [Onboarding](./01-onboarding.md) | P0 | M | Proposed |
| 02 | [Roles & Admin](./02-roles-and-admin.md) | P0 | M | Proposed |
| 06 | [Color Themes](./06-color-themes.md) | P1 | S | Proposed |
| 04 | [In-app Notifications](./04-in-app-notifications.md) | P1 | M | Proposed |
| 03 | [Friends & Social](./03-friends-and-social.md) | P1 | L | Proposed |
| 08 | [Membership (Lifetime)](./08-membership.md) | P1 | M | Proposed |
| 09 | [Tiers & Trial](./09-tiers-and-trial.md) | P1 | M | Proposed |
| 05 | [Email/SMS Reminders](./05-email-sms-reminders.md) | P2 | M | Proposed |
| 07 | [Study Buddy (Video)](./07-study-buddy-video.md) | P2 | XL | Proposed |

## Status legend

- **Proposed** — Written down. No code yet.
- **In design** — Owner picked, schema/API being finalised.
- **In progress** — Branch exists, partial implementation.
- **Shipped** — Live in main + reflected in `README.md`.

## Effort scale

- **S** — A few hours, single PR.
- **M** — A weekend, 1–3 PRs.
- **L** — A week+ of focused work, multiple PRs, schema migrations.
- **XL** — Multi-week, third-party services, ongoing operational cost.

## Doc template

Each roadmap doc follows the same shape so an agent can pick one up and
execute with no ambiguity:

```
# <Feature name>

> Status: Proposed | In design | In progress | Shipped (linked to README §)
> Priority: P0/P1/P2  ·  Est. effort: S/M/L/XL  ·  Depends on: <other docs>

## Why
1–2 sentences in user terms. The problem.

## Goals / non-goals
What's in and out of MVP scope.

## UX flow
Bulleted walkthrough of the user-facing journey.

## Data model
Prisma snippets (additions only — no edits to live tables unless called out).

## API surface
New endpoints + auth requirements.

## Source files (planned)
List of new `src/lib/*` and `src/app/*` entries.

## Open questions
The decisions still owed.

## Done = (acceptance checklist)
Concrete checklist that maps to the README's "Done-ness" rule.

## README touchpoints when shipped
Which README sections to update per `.cursor/rules/readme-maintenance.mdc`.
```

## Cross-cutting principles

A handful of patterns to commit to before starting any of these so the docs
stay consistent:

1. **Every roadmap doc graduates by editing `README.md` in the same PR.** The
   "README touchpoints" section in each doc is your pre-built checklist.
2. **Order matters.** Recommended ship order: Onboarding → Roles/Admin →
   Color Themes → In-app Notifications → Friends → Membership → Tiers &
   Trial → Email Reminders → (much later) Study Buddy. Each one unlocks
   the next; Study Buddy depends on almost everything. Membership slots
   in after Friends so the Founder badge has a public profile to live on.
   Tiers & Trial ships right after Membership because both modify the
   same paywall surface.
3. **Don't migrate `userId` away from Clerk's id.** Every doc keeps
   `userId String` as the Clerk id and adds new fields. That preserves all
   existing data and avoids backfills.
4. **`UserProfile` is going to grow.** That's fine — it's a single row per
   user, low write rate. By the end of the roadmap it'll have ~12 fields.
   Still cheaper than 6 separate tables.
