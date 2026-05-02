# Words transfer to database

> **Status:** Proposed  
> **Priority:** P1 · **Effort:** L · **Depends on:** [02-roles-and-admin.md](./02-roles-and-admin.md)

## Why

Today's vocab, kanji, kana, grammar, and lesson content all live in version-controlled TypeScript files (`src/lib/categories.ts`, `src/lib/dojo-content.ts`, `src/lib/kana.ts`, the catalogs in `src/lib/n5-paths.ts`). A typo, a tweaked English gloss, or a new N5 word means a code change, a PR review, a deploy. That's fine when content is rare — but as the catalog grows and contributors who don't write TypeScript want to participate, every edit becomes a developer-time tax.

The Reading mode shipped with `ReadingWord` as a first DB-resident catalog (see README §Quiz engine → Reading mode). This roadmap captures the broader plan to move every other hardcoded content surface to the same pattern, with admin/system-admin CRUD UIs gated by Roles & Admin (roadmap 02).

## Goals / non-goals

**In (MVP):**

- A Prisma table per content surface (`CatalogWord`, `CatalogCategory`, `KanaCharacter`, `KanjiCharacter`, `DojoVocab`, `DojoGrammarPoint`, `DojoListening`, `DojoDrillQuestion`, `GrammarKeyKanji`).
- A bilingual TS-file ↔ DB seed pipeline (mirroring `prisma/seed/reading-words.ts` + `prisma/seed.ts`) so fresh installs reach feature parity with today's hardcoded content via `npx prisma db seed`.
- Read-side helpers in `src/lib/<surface>-server.ts` that fetch from Prisma and return the shape today's call sites already expect — no consumer rewrite per migration.
- Admin CRUD pages under `/admin/*`, gated by `role: "admin" | "system_admin"` from roadmap 02.
- An audit trail on every admin write (who, when, before, after) so a regression is debuggable.

**Out of MVP:**

- Per-user word edits — those already live on `Word` / `ImportBatch`, owned by the user, separate from the global catalog.
- Machine translation — admins author English glosses by hand. Gemini is not in this loop.
- Multi-language English — single English column for now.
- Collaborative live editing or real-time sync. Last-write-wins; the audit trail is the safety net.
- A migration UI for end users. Content authors only.

## Inventory of hardcoded content surfaces

| Today | Approx volume | Target table(s) | Priority |
|---|---:|---|---|
| `[src/lib/categories.ts](src/lib/categories.ts)` (N5 vocab in 11 categories + per-word example sentences) | ~250 words, ~250 examples | `CatalogWord`, `CatalogCategory`, `CatalogExample` | High |
| `[src/lib/dojo-content.ts](src/lib/dojo-content.ts)` (Genki I + II lessons: vocab, grammar points, listening, drill questions, key kanji) | ~6300 lines, 23 lessons | `DojoVocab`, `DojoGrammarPoint`, `DojoExampleSentence`, `DojoDrillQuestion`, `DojoListening`, `DojoGrammarKeyKanji` | High (most lines, most editing pain) |
| `[src/lib/kana.ts](src/lib/kana.ts)` (hiragana + katakana tables) | 2 × ~46 chars | `KanaCharacter` | Low (rarely changes) |
| `[src/lib/kanji.ts](src/lib/kanji.ts)` (N5 kanji catalog) | ~80 chars + readings | `KanjiCharacter`, `KanjiReading` | Medium |
| `[src/lib/n5-paths.ts](src/lib/n5-paths.ts)` (KANA_CATALOG, KANJI_CATALOG, VOCAB_CATALOG, GRAMMAR_CATALOG, LISTENING_CATALOG) | derived | refactor to thin aggregator over the new tables | Last (after the four above land) |
| `ReadingWord` ✓ | 1000 rows | already DB-resident — reference implementation for the rest |

## Migration pattern (per surface)

Every surface follows the same sequence so reviewers don't relearn the recipe each time:

1. **Author the Prisma model.** Mirror today's TS shape one-to-one. Add `updatedAt`/`createdAt` columns and a stable `(domainKey)` unique constraint so seed re-runs are idempotent.
2. **Write `prisma/seed/<surface>.ts`.** Copy today's hardcoded array verbatim (or import from the existing TS file if it stays in the codebase as the seed source). Same shape; no transformations.
3. **Update `prisma/seed.ts`.** Append a `seed<Surface>` async function and call it from `main()`. Use `createMany({ skipDuplicates: true })` keyed on the unique constraint so admin edits in prod survive future re-seeds — same property `ReadingWord` already enjoys.
4. **Add `src/lib/<surface>-server.ts`.** Fetches from Prisma; returns the *exact* shape today's `src/lib/<surface>.ts` exports. Existing call sites import from the new server file with a 1-line change.
5. **Delete (or shrink) `src/lib/<surface>.ts`.** Once consumers all point at the server helper, the original file becomes either empty or a typed re-export shim, then disappears.
6. **Add `/admin/<surface>` CRUD UI.** Gated by `role: "admin" | "system_admin"` from roadmap 02. Single index page (table view), single edit page, single new page. No bespoke UX per surface — one shadcn `<Table>` + `<Form>` pattern reused across all of them.
7. **Wire the audit trail.** Every POST/PUT/DELETE writes a `ContentAuditLog` row (see Data model below).

## Data model (additions)

Sketch of the additions, written so all four high-priority surfaces fit the same shape. Field-by-field is intentionally not exhaustive — that gets fleshed out per-PR.

```prisma
model CatalogCategory {
  id          Int           @id @default(autoincrement())
  slug        String        @unique
  name        String
  description String
  level       String        // "N5" today; widen to "N4"/"N3" later
  sortIndex   Int
  words       CatalogWord[]
  updatedAt   DateTime      @updatedAt
  createdAt   DateTime      @default(now())
}

model CatalogWord {
  id         Int                @id @default(autoincrement())
  categoryId Int
  category   CatalogCategory    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  romaji     String
  hiragana   String
  katakana   String
  english    String
  sortIndex  Int
  examples   CatalogExample[]
  updatedAt  DateTime           @updatedAt
  createdAt  DateTime           @default(now())
  @@unique([categoryId, romaji])
}

model CatalogExample {
  id       Int          @id @default(autoincrement())
  wordId   Int
  word     CatalogWord  @relation(fields: [wordId], references: [id], onDelete: Cascade)
  jp       String
  romaji   String
  english  String
  sortIndex Int
  @@unique([wordId, sortIndex])
}

// Repeat the same shape for the Dojo content tree, kana, and kanji.
// Each lesson section becomes its own table; nothing nests in JSON
// because admins need column-level edits.

// Cross-cutting audit trail. Every admin write goes here so an oops
// is recoverable without database forensics.
model ContentAuditLog {
  id         Int      @id @default(autoincrement())
  actorId    String   // Clerk userId of the admin who acted
  surface    String   // "catalog_word", "dojo_vocab", …
  recordId   Int
  action     String   // "create" | "update" | "delete"
  before     Json?    // null on create
  after      Json?    // null on delete
  createdAt  DateTime @default(now())
  @@index([surface, createdAt])
  @@index([actorId, createdAt])
}
```

## API surface

Read endpoints stay where they are (RSCs reach into `src/lib/<surface>-server.ts` directly). The write surface is admin-only and lives under `/api/admin/`:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/catalog/categories` | `GET` `POST` | List / create N5 vocab categories. |
| `/api/admin/catalog/categories/[id]` | `PUT` `DELETE` | Edit / delete a category. |
| `/api/admin/catalog/words` | `GET` `POST` | List / create vocab words (paged). |
| `/api/admin/catalog/words/[id]` | `PUT` `DELETE` | Edit / delete a word. |
| `/api/admin/dojo/vocab` | `GET` `POST` | List / create Dojo vocab rows. |
| `/api/admin/dojo/vocab/[id]` | `PUT` `DELETE` | Edit / delete a Dojo vocab row. |
| `/api/admin/dojo/grammar` etc. | parallel | Same shape, per Dojo subtype. |
| `/api/admin/kana/[char]` | `PUT` | Edit a kana row's metadata (very rare). |
| `/api/admin/kanji/[char]` | `GET` `PUT` `DELETE` | Edit / delete a kanji row. |
| `/api/admin/reading/words` | `GET` `POST` | Already part of this roadmap — extends `ReadingWord`. |
| `/api/admin/reading/words/[id]` | `PUT` `DELETE` | Edit / delete a Reading mode word. |
| `/api/admin/audit` | `GET` | Paginated admin audit log. |

All admin routes go through:

1. `requireUserId()` for auth.
2. `requireRole("admin" \| "system_admin")` (lives in roadmap 02; this roadmap adopts it).
3. `enforceRateLimit("write", userId)` per the README's universal rule.
4. Audit-log write inside the same Prisma transaction as the mutation so a partial failure rolls back both.

## Planned source files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | All new models above. |
| `prisma/seed/categories.ts`, `prisma/seed/dojo.ts`, `prisma/seed/kana.ts`, `prisma/seed/kanji.ts` | Canonical content arrays per surface. |
| `prisma/seed.ts` | Append a `seed<Surface>` per surface; orchestrates them all. |
| `src/lib/categories-server.ts`, `src/lib/dojo-content-server.ts`, `src/lib/kana-server.ts`, `src/lib/kanji-server.ts` | Server-side fetchers returning today's existing shapes. |
| `src/lib/admin-roles.ts` | (from roadmap 02) `requireRole()` helper. |
| `src/lib/content-audit.ts` | `recordContentEdit({ actorId, surface, recordId, action, before, after })` wrapper used by every admin route. |
| `src/app/admin/page.tsx` | Admin dashboard — links to each surface table view. |
| `src/app/admin/catalog/**` | Categories + words CRUD UI. |
| `src/app/admin/dojo/**` | Dojo content CRUD UI. |
| `src/app/admin/reading/**` | Reading mode CRUD UI (the first surface to land — already DB-resident). |
| `src/app/admin/audit/page.tsx` | Audit log viewer. |
| `src/app/api/admin/**/route.ts` | All POST/PUT/DELETE endpoints listed above. |

## Caching strategy

Content reads are vastly more frequent than writes. Two complementary layers:

- **In-process LRU** at `src/lib/<surface>-server.ts` keyed by `(surface, version)`. `version` bumps on every admin write via `recordContentEdit()` so reads invalidate without a TTL.
- **Vercel data cache** via `revalidateTag(<surface>)` after every admin mutation. Combined with `unstable_cache(loader, [surface], { tags: [<surface>] })` on the read path, this avoids hot-loading the same 250-row `CatalogWord` table on every dashboard render.

The Reading mode's read path already opts out of caching because daily-set rotation depends on the user's local weekday — so it stays as-is.

## Open questions

- **Versioning** — do we keep more than the audit trail (e.g. a `ContentVersion` snapshot per edit)? Audit log alone is enough for "undo last change" but not "roll back to last week's state."
- **Authoring locale** — staying English-only is fine for v1 but a roadmap entry to support `ja-JP` / `pt-BR` translations might land soon. Schema can pre-emptively model `english` as `glosses Json` (`{ "en": "...", "ja": "..." }`) at the cost of extra typing now.
- **Live previews** — should the admin edit page render the affected user-facing surface live (a vocab card preview, a Dojo flashcard preview)? Likely yes, but adds complexity per surface.
- **Bulk import** — admins will eventually want CSV / spreadsheet uploads, especially for `CatalogWord`. Out of MVP but worth designing tables that enforce uniqueness so imports can dedupe cleanly.
- **Admin-only seed re-runs** — should `npx prisma db seed` ever overwrite admin edits, e.g. when an authoritative content fix needs to ship in code? Probably not by default; gate behind `--force` if needed.

## Done = (acceptance checklist)

- [ ] Every hardcoded content surface in the inventory above has a Prisma model, a `prisma/seed/<surface>.ts` source array, and a `src/lib/<surface>-server.ts` fetcher.
- [ ] Existing call sites import from the server helper instead of the original TS file.
- [ ] `npx prisma db seed` populates a fresh DB to feature-parity with today's TS files.
- [ ] Admin CRUD pages exist at `/admin/<surface>`, gated by `requireRole("admin" \| "system_admin")`.
- [ ] Every admin write writes a `ContentAuditLog` row in the same transaction.
- [ ] README's `## Data model` lists every new table.
- [ ] README's `## API surface` lists the admin endpoints.

## When this ships: README touchpoints

Per `.cursor/rules/readme-maintenance.mdc`:

- `## Data model` — list every new content table.
- `## API surface` — list `/api/admin/*` endpoints.
- `## Feature reference` — new `### Admin content tools` subsection describing the surfaces an admin can edit.
- `## Conventions` — note that hardcoded vocab / kanji / kana / grammar files were the *legacy* pattern; new content goes through the admin CRUD or via `prisma/seed/*.ts`.
- Bottom-of-README source-of-truth table — append every new `src/lib/<surface>-server.ts`.
- `## Local setup` — note that `npx prisma db seed` is required after `prisma migrate deploy` on first install.
