# Friends & Social

> Status: Proposed
> Priority: P1  ·  Est. effort: L  ·  Depends on: 01-onboarding (needs `displayName`)

## Why

Solo learning loses momentum. Adding friends — even a small handful — gives
users (a) a reason to keep their streak so it shows up on someone's feed, and
(b) a low-pressure rivalry surface (whose XP this week, whose N5 mastery is
higher). Pre-requisite for the leaderboard, study buddy room, and the "your
friend just unlocked Mastered N5" notification.

## Goals / non-goals

**In:** Friend requests (send/accept/reject/cancel). Friends list. Public
profile page (`/u/[displayName]`) showing Dachi, flag, current streak, total
coins, N5 mastery %, recent achievements. Privacy toggle (profile public vs
friends-only). Block list.

**Out:** Group chat, DMs (defer indefinitely — moderation cost too high).
Public global leaderboard (separate doc once we have enough users).
Comments/reactions on activity.

## UX flow

- `/friends` — list of accepted friends, sortable by streak / mastery / recent
  activity.
- `/friends/requests` — pending in/out, with accept/reject/cancel buttons.
- `/friends/add` — search by displayName (debounced, exact-match-first).
- `/u/[displayName]` — public profile, with "Add friend" / "Pending" /
  "Friends since" CTA based on relationship.
- Friend's row in `/friends` shows their Dachi avatar + flag + streak number
  — quick glance who's keeping pace.

## Data model

```prisma
model Friendship {
  id          Int       @id @default(autoincrement())
  // Always store the lower userId in `userAId` to make the unique constraint trivial.
  userAId     String
  userBId     String
  // Role of the *requester* — the user who hit "Add friend".
  requestedBy String                              // "A" | "B" — references the side
  status      String    @default("pending")      // "pending" | "accepted" | "blocked"
  createdAt   DateTime  @default(now())
  acceptedAt  DateTime?

  @@unique([userAId, userBId])
  @@index([userAId, status])
  @@index([userBId, status])
}

model UserPrivacy {
  userId         String   @id
  profileVisible String   @default("friends")    // "public" | "friends" | "private"
  shareStreak    Boolean  @default(true)
  shareMastery   Boolean  @default(true)
  shareCoins     Boolean  @default(false)
  updatedAt      DateTime @updatedAt
}
```

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/friends` | GET | List accepted friendships. |
| `/api/friends/requests` | GET | Pending in + out. |
| `/api/friends/requests` | POST | Send a friend request `{ toDisplayName }`. |
| `/api/friends/requests/[id]` | PATCH | Accept / reject. |
| `/api/friends/requests/[id]` | DELETE | Cancel pending out-request. |
| `/api/friends/[id]` | DELETE | Unfriend. |
| `/api/friends/block` | POST | Block a user (also removes friendship). |
| `/api/profile/[displayName]` | GET | Public profile (respects `UserPrivacy`). |
| `/api/profile/privacy` | POST | Update `UserPrivacy`. |

## Source files (planned)

- `src/lib/friends.ts` — `sendRequest`, `acceptRequest`, `getFriendsList`,
  `getRelationship`.
- `src/lib/privacy.ts` — `canSeeProfile(viewerId, targetId)`.
- `src/app/friends/page.tsx`, `friends/requests/page.tsx`,
  `friends/add/page.tsx`.
- `src/app/u/[displayName]/page.tsx` — public profile (server component).

## Open questions

- Friend cap? (Recommend 100 — keeps fan-out cheap for notifications.)
- Should sending a friend request itself trigger an in-app notification +
  optional email? (Yes — depends on Notifications doc.)
- Do blocked users know they're blocked? (No — show "Profile not found" —
  standard pattern.)
- Friend recommendations (same JLPT level, same country)? (Defer — needs
  enough users to be useful.)

## Done = acceptance checklist

- [ ] Cannot send a request to yourself or to a blocked user.
- [ ] Cannot send duplicate requests (DB unique enforces).
- [ ] Public profile respects `UserPrivacy` per-field.
- [ ] Unfriending is symmetric — drops both sides immediately.
- [ ] All friend lookups are O(index) — no scans on `Friendship`.
- [ ] `README.md` updated.

## README touchpoints when shipped

- New `### Friends & Social` subsection + TOC entry.
- `## Data model` — `Friendship`, `UserPrivacy`.
- `## API surface` — new `/api/friends/**` and `/api/profile/**` rows.
- New source-of-truth files in bottom table (`src/lib/friends.ts`,
  `src/lib/privacy.ts`).
