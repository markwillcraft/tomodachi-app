# Study Buddy (Video Call)

> Status: Proposed
> Priority: P2  ·  Est. effort: XL  ·  Depends on: 03-friends-and-social, 04-in-app-notifications

## Why

Study sessions with a friend keep both people accountable. A scheduled or
ad-hoc video room — share what you're studying, talk through grammar, quiz
each other — turns a solo app into a habit you keep with someone. This is
also our highest-stakes feature: video brings real moderation, privacy, and
cost obligations.

## Goals / non-goals

**In:** 1:1 study room (ad-hoc invite a friend or scheduled). Built on a
managed WebRTC provider (Daily.co or LiveKit Cloud) — we do NOT roll our
own SFU. Side-panel shows what each user is currently studying. Room ends
when both leave or after 2h.

**Out of MVP:** Group rooms (3+). Recording. Public rooms / random matching
(huge moderation surface — defer indefinitely or never). Screen sharing of
arbitrary content. Mobile native — start web-only.

## Hard requirements before this ships

1. **Age verification** — under-18s must be excluded or have parental
   consent. Adds an `ageVerifiedAt` to `UserProfile`. Self-attestation MVP,
   real KYC if we ever go consumer.
2. **Reporting + blocking flow.** Every room has a "Report" button → kicks
   reported user, writes `AbuseReport`, notifies admins.
3. **Privacy banner** before joining first room: "Audio/video is
   peer-to-peer. Tomodachi does not record."
4. **Provider DPA signed** (Daily.co + LiveKit both publish standard ones).

## UX flow

- `/study/buddy` — landing: "Start a room" + list of friends online.
- Click friend → creates room, sends them a `study.invite` notification with
  a 60-second accept window.
- Friend accepts → both land in `/study/buddy/[roomId]`.
- Room shell: video tiles (top), shared "What we're studying" panel (left),
  text chat (bottom-right), shared timer (top-right).
- Either user clicks "End session" → room closes, both get a quick "How did
  it go?" feedback prompt that feeds into achievement: "Studied with a
  friend".

## Provider choice

Recommend **Daily.co**:

- Free tier: 10k participant minutes/month — enough for early users.
- Drop-in React SDK.
- Built-in reporting/abuse tools.
- Predictable pricing as we grow.

Alternative: **LiveKit Cloud** (more flexible, slightly more setup).

We do NOT build signaling, TURN, or SFU ourselves. That's a 6-month detour
and a permanent operational burden.

## Data model

```prisma
model StudyRoom {
  id          String    @id @default(cuid())     // Daily.co room name = our id
  hostUserId  String
  status      String                              // "pending" | "live" | "ended"
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  endedReason String?                             // "completed" | "timeout" | "kicked" | "host_left"

  members     StudyRoomMember[]

  @@index([hostUserId, startedAt])
  @@index([status])
}

model StudyRoomMember {
  id       Int       @id @default(autoincrement())
  roomId   String
  room     StudyRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  userId   String
  joinedAt DateTime  @default(now())
  leftAt   DateTime?

  @@unique([roomId, userId])
  @@index([userId, joinedAt])
}

model AbuseReport {
  id         Int      @id @default(autoincrement())
  reporterId String
  targetId   String
  context    String                          // "study_room"
  contextId  String?                         // roomId
  reason     String
  notes      String?
  status     String   @default("open")       // "open" | "actioned" | "dismissed"
  createdAt  DateTime @default(now())

  @@index([targetId, createdAt])
  @@index([status, createdAt])
}
```

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/study/rooms` | POST | Create room (calls Daily.co), invites a friend, returns roomId + token. |
| `/api/study/rooms/[id]/token` | GET | Mints a Daily.co JWT for the requesting user (must be a member). |
| `/api/study/rooms/[id]/join` | POST | Mark accepted invite, add `StudyRoomMember`. |
| `/api/study/rooms/[id]/leave` | POST | Mark `leftAt`, end room if last member. |
| `/api/study/rooms/[id]/report` | POST | File `AbuseReport`, notify admins. |

## Source files (planned)

- `src/lib/study-rooms.ts` — provider-agnostic room logic.
- `src/lib/daily.ts` — Daily.co REST + token signing.
- `src/app/study/buddy/page.tsx` — landing.
- `src/app/study/buddy/[roomId]/page.tsx` — room shell (Daily React).
- `src/app/admin/abuse/page.tsx` — admin queue (depends on
  02-roles-and-admin).

## Env vars

- `DAILY_API_KEY`
- `DAILY_DOMAIN` (e.g. `tomodachi.daily.co`)

## Open questions

- Cost ceiling alarm: at what monthly minute count do we cap free use?
  (Recommend 30 min/user/day soft cap.)
- Should rooms count toward streak? (Probably not — easy to abuse. But a
  separate "studied with friend" achievement is fair.)
- Recording for "watch later"? (Hard no in MVP — moderation + storage cost.)
- Mobile browser support is patchy for WebRTC — communicate "desktop
  recommended" prominently.
- Are minors allowed at all? **Strongly recommend 18+ for video** until you
  have proper trust & safety tooling.

## Done = acceptance checklist

- [ ] Age gate enforced before first room creation.
- [ ] Cannot create room with non-friend.
- [ ] Daily.co tokens are short-lived and per-user (no long-lived shared
      secrets in client).
- [ ] Reporting flow works end-to-end and routes to the admin queue.
- [ ] Soft cap on minutes per user per day.
- [ ] Privacy banner shown on first join, dismissible afterward.
- [ ] `README.md` updated.

## README touchpoints when shipped

- New `### Study Buddy (Video)` subsection + TOC entry.
- `## Data model` — `StudyRoom`, `StudyRoomMember`, `AbuseReport`.
- `## API surface` — new endpoints.
- `## Local setup` — `DAILY_API_KEY`, `DAILY_DOMAIN`, age policy note.
- `.env.example` — same.
- `## Conventions` — note "managed video provider, never roll your own
  SFU".
