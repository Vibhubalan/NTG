# NTG production readiness

What matters for **NTG Lounge** (single org, Mangaluru) vs enterprise SaaS.

## Not required (N/A)

| Item | Why |
|------|-----|
| **Multi-tenancy** | One org, one database — no tenant isolation needed |
| **HIPAA** | Not a healthcare product |
| **Load / chaos testing** | Revisit if traffic exceeds ~1k concurrent or cups sell out in seconds |
| **Full WCAG certification** | Incremental a11y improvements ongoing; formal audit optional pre-launch |

## Implemented in repo

| Item | Where |
|------|--------|
| Auth, roles, sessions | NextAuth, `auth-guard`, admin layout |
| Rate limiting | `src/lib/rate-limit.ts`, auth/register routes |
| Input validation | Zod schemas, upload validators |
| Unit + smoke tests | `npm test` |
| Dependency scanning | `.github/workflows/ci.yml`, Dependabot |
| Admin audit trail | `AdminAuditLog` + `logAdminAction()` |
| Privacy + account deletion | `/privacy`, `DELETE /api/profile/account` |
| Code review | PR template, CI on PRs |

## Disaster recovery (lite)

| | Target |
|--|--------|
| **RPO** (max data loss) | ~24h — Neon daily backups (verify in Neon dashboard) |
| **RTO** (time to restore) | ~1–2h — redeploy from main + `db:migrate:deploy` |
| **Secrets** | Vercel env + local `.env.local`; rotate `AUTH_SECRET` and `CRON_SECRET` if leaked |

**Recovery steps:** restore Neon backup if needed → deploy last good Vercel build → run migrations → smoke test signup/login/admin/cups.

## Before each production deploy

1. `npm test` and `npm run build` locally
2. `db:migrate:deploy` against prod DATABASE_URL
3. Mirror env vars on Vercel (see `.env.example`)
4. Smoke: login, admin, FC26 reg, leaderboard, cron secrets set

## Code review process

1. Feature branch → PR to `main`
2. CI must pass (lint + unit tests; audit reported)
3. One human review for auth, payments, or schema changes
4. Merge → Vercel preview/prod deploy
