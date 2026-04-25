# Email & SMS Reminders

> Status: Proposed
> Priority: P2  ·  Est. effort: M  ·  Depends on: 04-in-app-notifications (shares preference surface), 01-onboarding (timezone resolved)

## Why

Streak loss is the single biggest churn event. An opt-in nudge a few hours
before the user's local midnight catches them on the bus home and saves the
streak. Email is a no-brainer (Clerk already has the address); SMS is a
power-user upgrade.

## Goals / non-goals

**In MVP:** Email reminder if (a) user hasn't completed today's daily quiz
+ card goals AND (b) it's within their configured reminder window in their
local timezone. Per-user toggle + reminder time. Plain-text + HTML, with
one-click unsubscribe.

**Out of MVP:** SMS — designed but flagged behind a feature flag, not
launched until Twilio cost + age-verification policy are sorted. Marketing
emails. Re-engagement emails for lapsed users (separate "winback" doc).

## UX flow

- Settings page gains a "Reminders" card: toggle Email reminder · pick time
  (18:00 / 20:00 / 22:00 local) · (Behind flag) toggle SMS + phone field.
- Every email has an `Unsubscribe` link → flips the toggle off, one-click,
  no login required (signed token).

## Architecture

```
Vercel Cron (every 15 min)
  → /api/cron/reminders
    → Find users whose local time ∈ [reminder_time, reminder_time + 15m)
    → For each: check today's progress
    → If incomplete + opted in:
        → enqueue email via Resend
        → write Notification row (kind: "reminder.sent") for audit
    → Idempotency: dedupKey = "reminder:<userId>:<localDay>" stored in ReminderLog
```

## Data model

```prisma
model NotificationPreference {
  // (extends the row from 04-in-app-notifications)
  emailReminders    Boolean   @default(false)
  reminderLocalHour Int       @default(20)        // 0–23, local hour
  smsReminders      Boolean   @default(false)
  smsPhoneE164      String?                       // +639171234567
}

model ReminderLog {
  id       Int      @id @default(autoincrement())
  userId   String
  channel  String                          // "email" | "sms"
  localDay String                          // "YYYY-MM-DD" in user's tz
  sentAt   DateTime @default(now())

  @@unique([userId, channel, localDay])    // hard idempotency guard
  @@index([userId, sentAt])
}
```

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/cron/reminders` | GET | Vercel Cron entry. Verifies `CRON_SECRET`. |
| `/api/profile/reminders` | POST | Update `NotificationPreference`. |
| `/api/unsubscribe` | GET | Signed-token one-click unsubscribe. |

## Source files (planned)

- `src/lib/mail.ts` — Resend wrapper; `sendReminderEmail(user, progress)`.
- `src/lib/sms.ts` — Twilio wrapper, behind `SMS_ENABLED` flag.
- `src/lib/cron-auth.ts` — `requireCronSecret()` for cron endpoints.
- `src/lib/reminders.ts` — windowing logic (`isInReminderWindow`,
  `dueForReminder`).
- `src/emails/StreakReminder.tsx` — React Email template.

## Env vars

- `RESEND_API_KEY`
- `EMAIL_FROM` (e.g. `Tomodachi <reminders@tomodachi.app>`)
- `CRON_SECRET` — random string, also set as Vercel Cron's `Authorization`
  header.
- `UNSUBSCRIBE_SIGNING_SECRET` — for the one-click token.
- `SMS_ENABLED=false` (until launch)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (when SMS
  goes live)

## Open questions

- Should we also email on "streak just broke" (consolation + offer streak
  freeze if available)? Probably yes — single high-empathy email.
- Time zone of users who haven't onboarded yet? Skip — `reminderLocalHour`
  defaults to 20 but the cron also requires `UserProfile.timezone` to be
  set.
- Cost: Resend free tier = 100 emails/day, 3k/month. At 500 users with 50%
  opted in, that's ~250 emails/day — exceeds free. Pro tier ≈ $20/mo.
  Acceptable.
- SMS cost: Twilio ~$0.0075 per SMS in US, ~$0.04 in PH. At 500 × 50% × 30
  days = 7.5k SMS/mo = $60–300/mo. Not viable until there's revenue.

## Done = acceptance checklist

- [ ] Cron runs every 15m and emails only matching opted-in incomplete
      users.
- [ ] `ReminderLog` unique constraint blocks any double-send for a
      user-channel-day.
- [ ] Unsubscribe link works without a login session.
- [ ] Email rendered in dark/light, mobile + desktop tested via React Email
      preview.
- [ ] SMS path implemented but feature-flagged off.
- [ ] `README.md` updated.

## README touchpoints when shipped

- New `### Email & SMS reminders` subsection + TOC.
- `## Data model` — `NotificationPreference` extension, `ReminderLog`.
- `## API surface` — new `/api/cron/reminders`, `/api/profile/reminders`,
  `/api/unsubscribe`.
- `## Local setup` — new env vars.
- `.env.example` — same.
