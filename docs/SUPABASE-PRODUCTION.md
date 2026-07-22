# Supabase production cutover (stay on Vercel)

Move production Postgres from **Neon → Supabase** while keeping **Vercel** hosting. No Render required.

**Already done locally:**
- Supabase schema (34 migrations)
- Neon prod data copied to Supabase
- `.env.local` points at Supabase

**You only need:** update 2 env vars on Vercel + redeploy.

---

## Step 1 — Confirm Supabase has your data

Already verified: **1 user** in Supabase after `pg_restore`.

Optional re-check (PowerShell):

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"
psql "YOUR_SUPABASE_DIRECT_URL" -c 'SELECT COUNT(*) FROM "User";'
```

---

## Step 2 — Update Vercel production env vars

1. Open [vercel.com](https://vercel.com) → project **ntg** → **Settings → Environment Variables**
2. Edit **Production** for these two variables:

| Variable | New value |
|----------|-----------|
| `DATABASE_URL` | Supabase **pooler** — port **6543**, `?pgbouncer=true` |
| `DIRECT_URL` | Supabase **direct** — `postgres@db.xxx.supabase.co:5432` |

Copy exact values from your `.env.local` lines 30–31:

```
DATABASE_URL → pooler (6543)
DIRECT_URL   → db.qweicbbfcgwmcefhbaub.supabase.co (5432, user postgres)
```

3. **Do not change** any other env vars (`AUTH_SECRET`, `CRON_SECRET`, etc.)
4. Save both variables

> **Important:** `DATABASE_URL` must use the **pooler** (6543). `DIRECT_URL` is for Prisma migrations only; Vercel runtime uses `DATABASE_URL`.

---

## Step 3 — Redeploy Vercel

1. **Deployments** tab → latest production deployment → **⋯ → Redeploy**
2. Or push any commit to `main` to trigger auto-deploy

Wait until status is **Ready**.

---

## Step 4 — Smoke test production

Visit [https://www.ntgesports.com](https://www.ntgesports.com):

- [ ] Homepage loads
- [ ] Login with existing account
- [ ] Admin panel works
- [ ] Leaderboard shows ranks
- [ ] Tournament pages load

Test cron still works (optional):

```powershell
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://www.ntgesports.com/api/cron/sync-tournament-status"
```

---

## Step 5 — Keep Neon as rollback (do not delete)

- Leave Neon project **paused or idle** for 7–14 days
- Rollback: set Vercel `DATABASE_URL` / `DIRECT_URL` back to Neon prod URLs and redeploy

---

## Rollback (if something breaks)

Vercel → Environment Variables → Production:

```
DATABASE_URL = Neon pooler (ep-frosty-field-aod7z5rt...)
DIRECT_URL   = Neon direct (same host, non-pooler)
```

Redeploy. Site reads Neon again within minutes.

---

## What does NOT change

| Stays on Vercel | Unchanged |
|-----------------|-----------|
| Hosting | Same |
| `vercel.json` crons | Same schedules |
| GitHub Actions leaderboard | Same |
| Domain DNS | Same |
| Auth, email, S3, Henrik | Same keys |

---

## Checklist

```
□ Supabase has prod data (done)
□ Vercel DATABASE_URL → Supabase pooler 6543
□ Vercel DIRECT_URL → Supabase direct 5432
□ Redeploy production
□ Smoke test ntgesports.com
□ Keep Neon for rollback 7–14 days
```

Render migration: **skipped** — ignore `render.yaml` and `docs/RENDER-DEPLOY.md` for now.
