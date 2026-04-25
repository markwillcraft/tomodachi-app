# In-app Notifications

> Status: Proposed
> Priority: P1  ·  Est. effort: M  ·  Depends on: —  (deepens with 03-friends, 02-admin)

## Why

Users miss meaningful events: a friend accepted their request, a streak is
about to break, a new achievement unlocked while they were offline, an admin
posted an announcement. A bell icon with a small unread badge centralises
those signals without spamming email.

## Goals / non-goals

**In:** Bell icon in topbar with unread count. Dropdown panel showing the
most recent 20. Full page at `/notifications` for history. Mark single / mark
all read. Per-type opt-out in settings.

**Out:** Realtime push (start with poll-on-focus + 30s poll while tab open).
Browser push notifications (separate doc — needs PWA + service worker).
Grouping ("3 friends accepted your request") — v2.

## Notification kinds (initial)

| Kind | Trigger | CTA |
|---|---|---|
| `friend.request.received` | Friend sent request | `/friends/requests` |
| `friend.request.accepted` | Your request was accepted | `/u/[displayName]` |
| `friend.achievement` | Friend unlocked a milestone | their profile |
| `streak.at_risk` | Today incomplete + < 4h to local midnight | `/dashboard` |
| `streak.frozen` | Auto-freeze burned overnight | `/dashboard` |
| `quest.almost_done` | 1 of 3 quests left, < 4h left | `/dashboard` |
| `achievement.unlocked` | (mirror of in-quiz toast for offline users) | `/achievements` |
| `admin.announcement` | Admin posted | content link |

## Data model

```prisma
model Notification {
  id        Int       @id @default(autoincrement())
  userId    String
  kind      String                          // see table above
  payload   Json                            // kind-specific {actorId, displayName, achievementId, ...}
  readAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId, readAt, createdAt])
  @@index([userId, createdAt])
}

model NotificationPreference {
  userId    String   @id
  // JSON map: { "friend.request.received": true, "streak.at_risk": false, ... }
  inApp     Json     @default("{}")
  updatedAt DateTime @updatedAt
}
```

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/notifications` | GET | Latest 50, includes unread count in headers. |
| `/api/notifications/unread-count` | GET | Lightweight badge poll. |
| `/api/notifications/[id]/read` | POST | Mark one read. |
| `/api/notifications/read-all` | POST | Mark all read. |
| `/api/notifications/preferences` | POST | Update opt-outs. |

## Source files (planned)

- `src/lib/notify.ts` — `notify(userId, kind, payload)` — the only writer;
  checks per-user opt-out before insert.
- `src/components/notification-bell.tsx` — topbar bell + dropdown.
- `src/app/notifications/page.tsx` — full history.
- Cron-style Vercel function `/api/cron/streak-warnings` runs every 30 min,
  finds users in their 8pm–11pm local window who haven't completed today,
  calls `notify()`.

## Open questions

- Cap retention? (Recommend: prune `readAt < now - 90d` via cron.)
- One bell per browser tab polling = 500 users × every 30s = ~17 QPS at peak.
  Use a shared `BroadcastChannel` so multiple tabs share a poll, OR move to
  Server-Sent Events when scale demands.
- Should notifications themselves count for an achievement (e.g. "10 friends
  made")? Probably not — keeps the catalog clean.

## Done = acceptance checklist

- [ ] Bell shows accurate unread count within 30s of a new notification.
- [ ] Marking read is idempotent and returns updated count.
- [ ] Per-kind opt-out is respected by `notify()` BEFORE insert (no row
      created if opted out).
- [ ] Cron prunes >90-day-old read notifications.
- [ ] `README.md` updated.

## README touchpoints when shipped

- New `### In-app notifications` subsection + TOC.
- `## Data model` — `Notification`, `NotificationPreference`.
- `## API surface` — new `/api/notifications/**` rows.
- `## Performance notes` — note the polling cadence and SSE upgrade path.
