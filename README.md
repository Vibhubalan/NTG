# NTG Lounge

**Namma Tulunad Gaming** — Mangaluru esports lounge: marketing site, membership, tournaments, leaderboard, and admin.

## Architecture (simple)

```
Browser
  → Next.js 16 (App Router) on Vercel
  → Neon Postgres (Prisma)
  → S3/R2 uploads · Resend email · Henrik.dev (Valorant ranks)
```

| Area | Path / tech |
|------|-------------|
| Marketing | `/` — lounge, arena, tournament vault |
| Esports | `/esports/*` — cups, rankings, registration |
| Auth | `/login`, `/signup` — NextAuth + email OTP |
| Profile | `/profile` — account, game links, ranks |
| Admin | `/admin/*` — cups, members, registrations, uploads |
| Cron | Daily 12 AM IST rank sync, tournament status, reel covers |

**Auth model:** No edge middleware. Protected routes use server layouts (`requireAdmin`) and API guards (`auth-guard.ts`).

**Leaderboard:** Ranks stored in `LeaderboardEntry` (DB). Nightly cron refreshes from Riot; page reads DB only.

## Local development

```bash
npm install
cp .env.example .env.local   # fill DATABASE_URL, AUTH_SECRET, etc.
npm run db:push              # or db:migrate:deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (runs `prisma generate` first) |
| `npm test` | Unit + smoke tests |
| `npm run test:unit` | Domain/logic tests only |
| `npm run test:smoke` | HTTP smoke (needs dev server) |
| `npm run test:load` | Progressive load test until break |
| `npm run build` | Production build |
| `npm run db:seed` | Seed cups from static data |

## Deploy (Vercel)

1. Push to GitHub
2. Import on Vercel — framework: Next.js
3. Set env vars from `.env.example` (especially `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `ADMIN_EMAILS`)
4. Run `npm run db:migrate:deploy` against production DB
5. Smoke: signup, login, admin, cup registration

See `docs/PRODUCTION.md` for DR checklist and `docs/ADR-001-architecture.md` for decisions.

## CI

GitHub Actions runs on PRs: `lint`, unit tests, `npm audit` (high+). Dependabot opens weekly dependency PRs.

## Load testing

With dev or preview running:

```bash
npm run test:load
# or: node scripts/load-test.mjs https://your-preview.vercel.app
```

Ramps concurrency (5 → 100) until error rate or p95 latency exceeds threshold. See script output for break point.

## Privacy

`/privacy` — data we collect and account deletion via Profile.
