# Roles & Admin

> Status: Proposed
> Priority: P0  ·  Est. effort: M  ·  Depends on: 01-onboarding

## Why

Today every authenticated user has identical capabilities. We need a way to
(a) bootstrap a system administrator, (b) grant operational access for content
edits and user support, and (c) audit privileged actions.

## Goals / non-goals

**In:** Three roles (`user`, `admin`, `system_admin`). Server-side
`requireRole()` guard. Admin dashboard at `/admin`. Audit log of role changes
+ admin actions.

**Out:** Per-resource fine-grained permissions. UI-only role gating
(everything must enforce server-side too). Customer-support tooling beyond a
user lookup.

## Roles

| Role | Capabilities |
|---|---|
| `user` | Default. All learner features. |
| `admin` | View any user's profile + progress. Grant/revoke coins. Lock/unlock accounts. Edit Dojo content flags (e.g. mark a lesson as live/coming-soon). View audit log. |
| `system_admin` | Everything `admin` can do, plus: grant/revoke `admin` role, configure feature flags, view system metrics. |

`system_admin` is bootstrapped via env var (`SYSTEM_ADMIN_USER_IDS`) on first
boot — a startup script upserts those Clerk ids to `role: "system_admin"`.

## Data model

```prisma
model UserProfile {
  // ...existing fields
  role       String    @default("user")  // "user" | "admin" | "system_admin"
  lockedAt   DateTime?                   // non-null = account locked
  lockReason String?
}

model AuditLog {
  id         Int      @id @default(autoincrement())
  actorId    String                       // userId who performed the action
  targetId   String?                      // userId affected (if any)
  action     String                       // "role.grant" | "coins.adjust" | "user.lock" | ...
  payload    Json                         // arbitrary action-specific context
  createdAt  DateTime @default(now())

  @@index([actorId, createdAt])
  @@index([targetId, createdAt])
  @@index([action, createdAt])
}
```

## API surface

| Endpoint | Method | Role | Purpose |
|---|---|---|---|
| `/api/admin/users` | GET | admin | Search users by displayName / email / userId. |
| `/api/admin/users/[id]` | GET | admin | Profile, progress snapshot, recent audit entries. |
| `/api/admin/users/[id]/coins` | POST | admin | Grant/revoke coins (writes to `CoinLedger` with `dedupKey: "admin:<auditLogId>"`). |
| `/api/admin/users/[id]/lock` | POST | admin | Set/clear `lockedAt`. |
| `/api/admin/users/[id]/role` | POST | system_admin | Change role. |
| `/api/admin/audit` | GET | admin | Paginated audit log. |

## Source files (planned)

- `src/lib/auth-utils.ts` — add `requireRole(role)` and `requireAdmin()`.
- `src/lib/audit.ts` — `recordAudit({ actorId, targetId, action, payload })`.
- `src/middleware.ts` — block `/admin/**` for non-admins (defense-in-depth,
  real check is server-side).
- `src/app/admin/page.tsx` — dashboard (user search, recent audit).
- `src/app/admin/users/[id]/page.tsx` — user detail + actions.
- `scripts/bootstrap-admins.ts` — reads `SYSTEM_ADMIN_USER_IDS`, upserts
  roles.

## Open questions

- Should locked users see a friendly explanation page or just sign-out?
- Per-action rate limit on coin grants by admins? (Recommend: yes —
  `Ratelimit` table or Upstash.)
- Should `admin` see PII (email)? Clerk owns email — only fetch on demand
  via Clerk SDK, never cache in our DB.

## Done = acceptance checklist

- [ ] `requireRole()` helper exists and is used in every `/api/admin/**`
      handler.
- [ ] Bootstrap script grants `system_admin` to env-listed Clerk ids on
      deploy.
- [ ] Every privileged action writes one `AuditLog` row.
- [ ] Audit log paginated, searchable by actor/target/action.
- [ ] Locked account cannot read or write any `/api/**` endpoint.
- [ ] `README.md` updated.

## README touchpoints when shipped

- New `### Roles & Admin` subsection.
- `## Authentication & multi-tenancy` — note role column + admin guard.
- `## Data model` — updated `UserProfile`, new `AuditLog`.
- `## API surface` — new admin endpoints.
- `## Local setup` — new `SYSTEM_ADMIN_USER_IDS` env var.
- `.env.example` — same.
