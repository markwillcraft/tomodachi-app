# Membership (One-Time Lifetime)

> Status: Proposed
> Priority: P1  ·  Est. effort: M  ·  Depends on: 01-onboarding, 02-roles-and-admin (admin coin grants reuse same audit hooks)

## Why

Tomodachi has a healthy free tier (kana, vocab, SRS, Dojo N5). A one-time
"Lifetime" membership gives committed learners a way to support the project
and unlock convenience perks, without committing the team to a recurring
subscription's UX, billing edge cases, or churn calculus. Lifetime fits the
vibe of the app — "study buddy you actually own".

## Goals / non-goals

**In:** Single one-time purchase. Tier flag on `UserProfile`. Idempotent
purchase + refund flow via PayMongo webhooks. Founder's Pass discount for
the first 100 buyers. Per-feature gates that read one helper.

**Out of MVP:** Recurring subscriptions. Multi-currency. Gift purchases
(separate doc). Family plans. In-app upsell modals (start with a single
`/shop/membership` page).

## Pricing ladder

| Tier | Price (₱) | Inventory | Notes |
|---|---|---|---|
| **Founder's Pass** | 399 | First 100 buyers | Same perks as Lifetime + exclusive Founder badge + Founder Dachi cosmetic |
| **Lifetime** | 699 | Unlimited | Standard tier after founder cap is hit |
| **Lifetime (post-Study Buddy)** | 999–1,499 | Unlimited | Re-priced once video + advanced social ship |

Anchors: Jollibee meal for 2 (~₱350), Netflix Mobile (₱149/mo), Duolingo
Super (~₱430/mo), LingoDeer Lifetime (~₱9k). ₱699 sits in the sweet spot
of "one nice meal" — impulse-friendly, premium-feeling, well below the
₱1k psychological ceiling.

## What it unlocks

| Perk | Implementation surface |
|---|---|
| Founder badge + exclusive Dachi cosmetic | `src/lib/shop.ts` catalog entries gated by tier |
| Unlimited Gemini AI study tips (free = 3/day) | Quota check in `/api/progress/tips` |
| All Dojo paths unlocked (skip N5→N4 gate) | `src/lib/dojo-server.ts` `isPathPrereqMet` short-circuit |
| 2× coin earnings | Multiplier in `awardCoins` (`src/lib/coins.ts`) |
| 10,000 starter coins on purchase | Single `CoinLedger` row |
| Early access to new features | `src/lib/feature-flags.ts` (new) |
| Custom theme accents (when 06 ships) | Skip per-theme gate |
| Higher Study Buddy minute cap (when 07 ships) | Skip soft cap in `src/lib/study-rooms.ts` |

## Payment processor: PayMongo (with Stripe migration path)

Picked PayMongo over Stripe / Xendit / manual InstaPay for PH-first launch:

- One integration covers cards + GCash + Maya + GrabPay + InstaPay-rail
  bank transfer.
- E-wallet fees ~2.5% (vs Stripe ~3.9%); bank transfer ~1.5%.
- Sole-prop onboarding in days, not weeks.
- Webhooks are HMAC-signed, similar pattern to Stripe — easy to abstract.

**InstaPay clarification:** InstaPay isn't a processor — it's the BSP's
real-time interbank transfer rail. PayMongo (and Xendit) wrap it as a
"bank transfer" payment method with auto-reconciliation. We do NOT do
manual transfer + manual verification — that breaks at ~50 buyers/month
and has zero refund tooling.

**Migration safety:** all payment-gateway code lives in
`src/lib/payments/<gateway>/` behind a `PaymentGateway` interface
(`createCheckout`, `verifyWebhook`, `getReceipt`). Adding Stripe later =
new file, no changes to membership logic.

## Data model

```prisma
model UserProfile {
  // ...existing fields
  membershipTier        String?   // null | "founder" | "lifetime"
  membershipPurchasedAt DateTime?
}

model MembershipPurchase {
  id               Int      @id @default(autoincrement())
  userId           String
  tier             String                              // "founder" | "lifetime"
  amountCents      Int                                 // ₱699.00 → 69900
  currency         String   @default("PHP")
  gateway          String                              // "paymongo" | "stripe" (future)
  gatewayPaymentId String   @unique                    // idempotency anchor
  paymentMethod    String?                             // "card" | "gcash" | "maya" | "grabpay" | "bank"
  status           String                              // "succeeded" | "refunded" | "disputed"
  createdAt        DateTime @default(now())
  refundedAt       DateTime?

  @@index([userId, createdAt])
  @@index([status])
}
```

`CoinLedger` reused as-is for the +10,000 starter grant — `dedupKey:
"membership:<gatewayPaymentId>:starter"`.

## API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/membership/checkout` | POST | Create PayMongo checkout session, return redirect URL. Validates founder cap. |
| `/api/webhooks/paymongo` | POST | HMAC-verify, write `MembershipPurchase`, flip `UserProfile.membershipTier`, grant starter coins. Fully idempotent on `gatewayPaymentId`. |
| `/api/membership/me` | GET | Current tier + perks summary for the dashboard. |
| `/api/admin/membership/refund` | POST | Admin-only manual refund (writes negative ledger row + flips tier to null). |

## Source files (planned)

- `src/lib/membership.ts` — `isMember(userId)`, `getMembershipTier(userId)`,
  `requireMember()` guard. Single source of truth — every gate calls these.
- `src/lib/payments/index.ts` — `PaymentGateway` interface.
- `src/lib/payments/paymongo.ts` — implementation.
- `src/lib/feature-flags.ts` — `isEarlyAccess(userId)` (member + admin gets true).
- `src/app/shop/membership/page.tsx` — pricing page (server-rendered with live founder count).
- `src/app/shop/membership/success/page.tsx` — post-purchase celebration.
- `src/app/api/webhooks/paymongo/route.ts`.

## Env vars

- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_WEBHOOK_SECRET`
- `MEMBERSHIP_FOUNDER_CAP=100`
- `MEMBERSHIP_PRICE_FOUNDER_PHP=399`
- `MEMBERSHIP_PRICE_LIFETIME_PHP=699`
- `NEXT_PUBLIC_APP_URL` (for PayMongo redirect URLs)

## Open questions

- **Refund policy:** 7-day no-questions-asked? PH consumer law doesn't
  mandate one for digital goods, but it builds trust. Recommend yes.
- **VAT registration:** below ₱3M/yr revenue, optional. Above, mandatory
  12% VAT. At ₱699 × 500 = ₱350k/yr — comfortably below threshold for
  year 1.
- **BIR official receipts:** required by law for any business. Even a
  sole-prop on PayMongo needs to issue OR. Use a simple template emailed
  via Resend after webhook fires.
- **Founder cap visibility:** show "X of 100 Founder Passes left" live on
  the page? Adds urgency but adds a query per page-view — cache for 60s.
- **Display Founder badge publicly?** On `/u/[displayName]` once Friends
  ships — yes, that's a perk worth flexing.
- **Re-grading existing top-quizzers as honorary founders?** Optional —
  could grant the badge to top 20 most-active pre-membership users as a
  thank-you.

## Done = acceptance checklist

- [ ] Buying flow works end-to-end via card, GCash, Maya, and bank
      transfer.
- [ ] Webhook is HMAC-verified and idempotent — replay attacks safe.
- [ ] Founder cap enforced server-side (race-safe via DB count or
      unique-constraint trick).
- [ ] Refund flips tier to null AND writes negative `CoinLedger` row.
- [ ] Every paywalled feature uses the single `isMember()` helper — no
      scattered tier checks.
- [ ] PayMongo gateway code lives behind the `PaymentGateway` interface.
- [ ] BIR official receipt emailed after successful purchase.
- [ ] `README.md` updated.

## README touchpoints when shipped

- New `### Membership` subsection under `## Feature reference` + TOC
  entry.
- `## Data model` — `UserProfile` extension, `MembershipPurchase`.
- `## API surface` — new `/api/membership/**` and `/api/webhooks/paymongo`
  rows.
- `## Local setup` — new env vars.
- `.env.example` — same.
- `## Conventions` — note "all paywall checks go through `isMember()`".
- Bottom-of-README source-of-truth table — add `src/lib/membership.ts`,
  `src/lib/payments/`.
