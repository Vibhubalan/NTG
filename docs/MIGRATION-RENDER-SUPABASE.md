# Migrate NTG from Vercel + Neon → Render + Supabase

Zero-deletion migration: keep Vercel and Neon running until Render + Supabase are verified, then cut over DNS.

**What stays the same:** Prisma schema, all API routes, auth, cron endpoints, GitHub Actions leaderboard loop, S3/R2 uploads, Resend email, Henrik rank sync.

**What changes:** hosting (Render), Postgres provider (Supabase), env var hostnames, cron scheduler (Render cron instead of Vercel cron).

---

## Overview (order of operations)

| Phase | Action | Downtime |
|-------|--------|----------|
| 1 | Create Supabase project | None |
| 2 | Copy Neon data → Supabase | None (Neon still live) |
| 3 | Deploy Render web service (preview URL) | None |
| 4 | Smoke-test Render against Supabase | None |
| 5 | Point custom domain to Render | ~minutes (DNS TTL) |
| 6 | Update GitHub `SITE_URL` secret | None |
| 7 | Disable Vercel crons (optional, after verify) | None |
| 8 | Keep Neon as rollback backup 7–14 days | None |

---

## Phase 1 — Create Supabase Postgres

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Choose region closest to users (e.g. **Singapore** or **Mumbai**).
3. Save the **database password** somewhere safe.
4. In **Project Settings → Database**, copy:
   - **Connection string → URI** (direct, port **5432**) → this is `DIRECT_URL`
   - **Connection pooling → Transaction mode** (port **6543**) → this is `DATABASE_URL`

Prisma needs both URLs (already configured in `schema.prisma`):

```env
# Pooled — used by the app at runtime
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct — used by Prisma migrations only
DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

Replace `[PASSWORD]` with your DB password. URL-encode special characters (`@`, `#`, etc.).

> **Do not** enable Supabase Auth, Realtime, or Storage for this migration unless you plan to use them later. This app uses NextAuth + Prisma only.

---

## Phase 2 — Copy Neon data to Supabase (no deletion)

### Option A — pg_dump / pg_restore (recommended)

Install [PostgreSQL client tools](https://www.postgresql.org/download/) if needed.

**1. Dump from Neon (read-only — Neon stays live):**

```bash
# Use your Neon DIRECT_URL (non-pooler) connection string
pg_dump "postgresql://USER:PASS@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" \
  --no-owner --no-acl --format=custom --file=ntg-neon-backup.dump
```

**2. Restore into Supabase:**

```bash
# Use Supabase DIRECT_URL (port 5432, db.xxx.supabase.co)
pg_restore --no-owner --no-acl --clean --if-exists \
  -d "postgresql://postgres.[REF]:[PASS]@db.[REF].supabase.co:5432/postgres" \
  ntg-neon-backup.dump
```

If `pg_restore` warns about existing objects, that is normal on a fresh Supabase DB.

**3. Verify row counts match:**

```bash
# Neon
psql "$NEON_DIRECT_URL" -c "SELECT COUNT(*) FROM \"User\";"

# Supabase
psql "$SUPABASE_DIRECT_URL" -c "SELECT COUNT(*) FROM \"User\";"
```

Repeat for critical tables: `Tournament`, `LeaderboardEntry`, `TournamentRegistration`.

### Option B — Prisma migrate only (empty DB, no data)

Only if this is a **new** environment without production data:

```bash
# Point .env.local at Supabase DIRECT_URL + DATABASE_URL
npm run db:migrate:deploy
npm run db:seed   # optional dev data only — never on prod with real users
```

---

## Phase 3 — Deploy on Render

### 3a. Connect repo

1. [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**.
2. Connect GitHub repo **NTG**.
3. Render reads `render.yaml` and creates:
   - `ntg-lounge` web service
   - `ntg-sync-tournament-status` cron (12:30 AM IST)
   - `ntg-trigger-daily-leaderboard` cron (2:30 AM IST)

### 3b. Set environment variables

In Render → **ntg-lounge → Environment**, copy every var from `.env.example`. Minimum required:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase pooler (6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct (5432) |
| `AUTH_SECRET` | **Same as Vercel** (keeps sessions valid during cutover) |
| `AUTH_URL` | `https://www.ntgesports.com` (or Render preview URL for testing) |
| `NEXTAUTH_URL` | Same as `AUTH_URL` |
| `NEXT_PUBLIC_SITE_URL` | Same as `AUTH_URL` |
| `CRON_SECRET` | **Same as Vercel / GitHub** |
| `ADMIN_EMAILS` | Same as Vercel |
| `HENRIKDEV_API_KEY` | Same as Vercel |
| `VALORANT_CURRENT_ACT` | Same as Vercel |
| `RESEND_API_KEY` | Same as Vercel |
| `EMAIL_FROM` | Same as Vercel |
| `GITHUB_ACTIONS_DISPATCH_TOKEN` | Same as Vercel |
| `UPSTASH_REDIS_REST_URL` | Same as Vercel |
| `UPSTASH_REDIS_REST_TOKEN` | Same as Vercel |
| S3/R2 vars | Same as Vercel |

For **both cron jobs**, set:

| Variable | Value |
|----------|-------|
| `CRON_SECRET` | Same bearer token |
| `SITE_URL` | `https://www.ntgesports.com` (no trailing slash) |

### 3c. Run migrations against Supabase

From your machine (one-time, after data restore):

```bash
# Temporarily point .env.local at Supabase URLs
npm run db:migrate:deploy
```

This ensures `_prisma_migrations` is in sync. Safe to run after pg_restore.

### 3d. First deploy

Render auto-deploys on push to `main`. Watch **Logs** for build success.

Preview URL: `https://ntg-lounge.onrender.com` (or your service name).

---

## Phase 4 — Smoke test (before DNS cutover)

Test against **Render preview URL** first, then custom domain.

```bash
# Health
curl -sS https://ntg-lounge.onrender.com/ | head

# Cron auth (should return JSON, not 401)
curl -sS -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://ntg-lounge.onrender.com/api/cron/sync-tournament-status"
```

**Manual checklist:**

- [ ] Homepage loads
- [ ] Login with existing account works
- [ ] Admin panel loads (`/admin`)
- [ ] Leaderboard shows existing ranks
- [ ] Tournament pages show registrations
- [ ] File upload works (S3/R2)
- [ ] Signup OTP email sends (Resend)

**Daily leaderboard (GHA):**

1. GitHub → Actions → **Daily leaderboard refresh** → Run workflow.
2. Ensure GitHub secret `SITE_URL` points to Render URL (or prod domain after cutover).
3. Confirm admin → Rank sync shows `COMPLETE`.

---

## Phase 5 — DNS cutover (production domain)

1. Render → **ntg-lounge → Settings → Custom Domains** → add `www.ntgesports.com` and apex if used.
2. Update DNS at your registrar (Render shows required CNAME/A records).
3. Update env vars on Render when domain is live:
   - `AUTH_URL=https://www.ntgesports.com`
   - `NEXTAUTH_URL=https://www.ntgesports.com`
   - `NEXT_PUBLIC_SITE_URL=https://www.ntgesports.com`
   - Cron jobs: `SITE_URL=https://www.ntgesports.com`
4. Redeploy (or use **Manual Deploy**).

**Keep Vercel running** until Render is confirmed stable (do not delete Vercel project yet).

---

## Phase 6 — Update GitHub Actions secret

Repo → Settings → Secrets → Actions:

| Secret | New value |
|--------|-----------|
| `SITE_URL` | `https://www.ntgesports.com` (Render, not Vercel) |

The GHA workflow calls `/api/cron/sync-ranks` on whatever `SITE_URL` is set to.

---

## Phase 7 — Post-cutover (after 3–7 days stable)

Optional cleanup — **only after you are confident**:

1. **Pause Vercel crons** — remove or comment crons in `vercel.json` on a branch, or delete Vercel project.
2. **Neon** — keep project paused (not deleted) for 7–14 days as rollback.
3. **Final Neon → Supabase sync** — if any writes happened on Neon during cutover window, run one more `pg_dump`/`pg_restore` or accept small drift.

---

## Rollback plan

If Render fails after DNS cutover:

1. Point DNS back to Vercel (keep Vercel project alive).
2. Point `DATABASE_URL` on Vercel back to Neon (if you switched Vercel env to Supabase).
3. Neon still has data if you did not delete it.

---

## Render vs Vercel — what improves

| Issue | Before (Vercel Hobby) | After (Render) |
|-------|----------------------|----------------|
| Function timeout | 60s hard limit | No 60s serverless wall (persistent Node process) |
| Cron count | 2/day on Hobby | Render cron jobs (separate services) |
| Daily rank sync | GHA continue loop still needed for Henrik rate limits | Same GHA loop works; individual API calls can run longer |
| DB | Neon Postgres | Supabase Postgres (same Prisma code) |

> Supabase Realtime is **not** enabled by this migration. Live UI still uses `router.refresh()` + polling unless you add Realtime later.

---

## Local development after migration

Update `.env.local`:

```env
DATABASE_URL=<supabase pooler 6543>
DIRECT_URL=<supabase direct 5432>
```

Then:

```bash
npm run dev
```

Neon URLs can stay commented in `.env.local` for reference.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Can't reach database` on Render | Check `DATABASE_URL` uses pooler port **6543** with `?pgbouncer=true` |
| Prisma migrate fails | Use `DIRECT_URL` (port 5432); ensure password is URL-encoded |
| `prepared statement already exists` | Add `?pgbouncer=true` to `DATABASE_URL` |
| Cron 401 | `CRON_SECRET` must match on Render cron job + web service |
| Auth redirect loop | `AUTH_URL` / `NEXTAUTH_URL` must match public URL exactly |
| Sessions lost after cutover | Use the **same** `AUTH_SECRET` as Vercel |
| GHA sync hits wrong host | Update GitHub `SITE_URL` secret to Render domain |

---

## Quick reference — your action checklist

```
□ 1. Create Supabase project, save password
□ 2. pg_dump Neon → pg_restore Supabase
□ 3. Verify table row counts match
□ 4. Deploy Render Blueprint from repo
□ 5. Paste all env vars into Render (copy from Vercel)
□ 6. Set SITE_URL on both Render cron jobs
□ 7. npm run db:migrate:deploy against Supabase
□ 8. Smoke test on Render preview URL
□ 9. Run GHA "Daily leaderboard refresh" manually
□ 10. Add custom domain on Render, update DNS
□ 11. Update AUTH_URL / NEXTAUTH_URL / NEXT_PUBLIC_SITE_URL to prod domain
□ 12. Update GitHub SITE_URL secret
□ 13. Monitor 3–7 days, then pause Vercel crons
□ 14. Keep Neon paused (not deleted) for rollback
```
