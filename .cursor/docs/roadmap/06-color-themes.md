# Color Themes

> Status: Proposed
> Priority: P1  ·  Est. effort: S  ·  Depends on: —

## Why

Dark mode already exists via `next-themes`. The next personalization win is
letting users pick an *accent* — sakura pink, matcha green, indigo, sunset
orange — that flows through buttons, progress bars, achievement glows, and
the Dachi card. It's a 1-day feature with outsized perceived value,
especially combined with onboarding.

## Goals / non-goals

**In:** 5–6 named accent themes mapped to CSS custom properties. Picker in
Settings + as the optional last step of Onboarding. Persisted in
`UserProfile.themeAccent` and applied at server-render time so there's no
flash.

**Out:** Fully custom hex picker. Per-page themes. Light/dark toggle (already
exists via `next-themes`, this layers on top).

## Themes

| Id | Name | Primary HSL | Accent HSL | Vibe |
|---|---|---|---|---|
| `sakura` | Sakura | 340 80% 65% | 350 90% 80% | Soft pink — default for new users |
| `matcha` | Matcha | 130 40% 45% | 140 50% 70% | Earthy green |
| `indigo` | Indigo | 240 70% 55% | 250 80% 75% | Cool blue |
| `sunset` | Sunset | 25 90% 55% | 35 95% 70% | Warm orange |
| `lavender` | Lavender | 270 50% 60% | 280 60% 80% | Calm purple |
| `monochrome` | Monochrome | 0 0% 30% | 0 0% 50% | Neutral, accessible |

## Data model

```prisma
model UserProfile {
  // ...existing fields
  themeAccent String @default("sakura")     // catalog id from src/lib/themes.ts
}
```

## Implementation sketch

- `src/lib/themes.ts` — typed `THEMES` const + `getThemeById`.
- `src/app/layout.tsx` — server component reads `UserProfile.themeAccent` and
  emits `<html data-accent="sakura">` on first paint. No flash.
- `src/app/globals.css` — extend Tailwind theme to use CSS vars
  (`--accent-primary`, `--accent-foreground`) and add a block per accent:
  `[data-accent="matcha"] { --accent-primary: 130 40% 45%; ... }`.
- shadcn components already consume CSS vars — most components inherit for
  free.
- Persist via `POST /api/profile/theme` and re-render the layout.

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/profile/theme` | POST | Validate + persist accent id. |

## Open questions

- Lock some themes behind cosmetics shop (e.g. `lavender` is a 250-coin
  unlock)? Cute idea, but adds a UserInventory dependency — defer to Shop
  Phase 2.
- Auto-suggest theme based on country flag colors? Cute but probably overkill.

## Done = acceptance checklist

- [ ] All 6 themes render correctly in light + dark.
- [ ] No flash of wrong accent on first paint (theme resolved server-side).
- [ ] Achievement card glows, buttons, progress bars, mascot card all reflect
      accent.
- [ ] WCAG contrast passes on all `accent-foreground` combinations.
- [ ] `README.md` updated.

## README touchpoints when shipped

- New `### Color themes` subsection under `## Feature reference` + TOC.
- `## Data model` — `themeAccent` on `UserProfile`.
- `## API surface` — `/api/profile/theme`.
- New `src/lib/themes.ts` in source-of-truth table.
