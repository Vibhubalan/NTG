# Vercel → Render deploy guide (step by step)

Supabase DB migration is done. This guide covers **hosting only** — moving the Next.js app from Vercel to Render.

Keep Vercel running until Render is verified. No deletions until step 12.

---

## What moves where

| Was on Vercel | Moves to Render |
|---------------|-----------------|
| Next.js web app | **Web Service** `ntg-lounge` |
| Cron: tournament status (12:30 AM IST) | **Cron Job** `ntg-sync-tournament-status` |
| Cron: daily leaderboard trigger (2:30 AM IST) | **Cron Job** `ntg-trigger-daily-leaderboard` |
| All env vars | Render Environment (web + cron jobs) |
| Custom domain | Render Custom Domains + DNS update |

| Stays the same | Where |
|----------------|-------|
| GitHub repo | Same repo, `main` branch |
| Supabase Postgres | Already migrated |
| GitHub Actions leaderboard loop | Still calls `/api/cron/sync-ranks` on `SITE_URL` |
| S3/R2, Resend, Upstash, Henrik | Same API keys |

---

## Step 1 — Push Render config to GitHub

These files must be on `main` before Render Blueprint works:

- `render.yaml`
- `docs/MIGRATION-RENDER-SUPABASE.md` (optional)
- `docs/RENDER-DEPLOY.md` (this file)

```bash
git add render.yaml docs/RENDER-DEPLOY.md docs/MIGRATION-RENDER-SUPABASE.md
git commit -m "Add Render Blueprint and deploy docs"
git push origin main
```

---

## Step 2 — Create Render Blueprint

1. Go to [dashboard.render.com](https://dashboard.render.com) → sign up / log in.
2. **New +** → **Blueprint**.
3. Connect GitHub → select repo **NTG**.
4. Render reads `render.yaml` and shows 3 services:
   - `ntg-lounge` (web)
   - `ntg-sync-tournament-status` (cron)
   - `ntg-trigger-daily-leaderboard` (cron)
5. Click **Apply** (do not deploy yet if you want to set env vars first).

---

## Step 3 — Copy env vars from Vercel → Render web service

Open **Vercel** → Project **ntg** → **Settings → Environment Variables**.

Open **Render** → **ntg-lounge** → **Environment**.

Copy **every** production variable. Use this checklist:

### Required (app won't work without these)

| Variable | Render value |
|----------|--------------|
| `DATABASE_URL` | Supabase pooler (6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct (`postgres@db.xxx.supabase.co:5432`) |
| `AUTH_SECRET` | **Same as Vercel** |
| `AUTH_URL` | `https://ntg-lounge.onrender.com` *(preview first; prod domain in step 9)* |
| `NEXTAUTH_URL` | Same as `AUTH_URL` |
| `NEXT_PUBLIC_SITE_URL` | Same as `AUTH_URL` |
| `ADMIN_EMAILS` | Same as Vercel |
| `CRON_SECRET` | Same as Vercel |
| `RESEND_API_KEY` | Same as Vercel |
| `EMAIL_FROM` | Same as Vercel |
| `HENRIKDEV_API_KEY` | Same as Vercel |
| `VALORANT_CURRENT_ACT` | Same as Vercel |
| `GITHUB_ACTIONS_DISPATCH_TOKEN` | Same as Vercel |

### Strongly recommended

| Variable | Notes |
|----------|-------|
| `UPSTASH_REDIS_REST_URL` | Rate limiting + Henrik cap |
| `UPSTASH_REDIS_REST_TOKEN` | Pair with URL |
| `S3_BUCKET`, `S3_*` | Uploads |
| `CHALLONGE_API_KEY` | Bracket sync |
| `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` | Lounge map |
| `YOUTUBE_CHANNEL_ID` | Homepage |
| `LEADERBOARD_SYNC_NOTIFY` | Ops emails |
| `LEADERBOARD_SYNC_NOTIFY_EMAIL` | Ops emails |

### Public (`NEXT_PUBLIC_*`)

Copy all from Vercel — especially:

- `NEXT_PUBLIC_INSTAGRAM_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_GOOGLE_MAPS_*`
- `NEXT_PUBLIC_USE_STATIC_TOURNAMENT_DETAIL=0`

**Tip:** In Vercel, use **⋯ → Download .env** for Production, then paste keys one by one into Render (Render has no bulk import from Vercel).

---

## Step 4 — Configure both Render cron jobs

For **ntg-sync-tournament-status** and **ntg-trigger-daily-leaderboard**:

| Variable | Value |
|----------|-------|
| `CRON_SECRET` | Same bearer token as web service |
| `SITE_URL` | `https://ntg-lounge.onrender.com` *(preview first)* |

No trailing slash on `SITE_URL`.

---

## Step 5 — First deploy

1. Render → **ntg-lounge** → **Manual Deploy → Deploy latest commit**.
2. Watch **Logs** until you see `Build successful` and service **Live**.
3. Open `https://ntg-lounge.onrender.com` (or your service URL).

**If build fails:** common fixes:
- Missing `DATABASE_URL` → add Supabase pooler URL
- Prisma error → ensure `postinstall` runs (`package.json` already has `prisma generate`)

---

## Step 6 — Smoke test on Render preview URL

Replace `YOUR-RENDER-URL` with your actual Render URL.

```bash
# Homepage
curl -sS -o /dev/null -w "%{http_code}" https://YOUR-RENDER-URL.onrender.com/

# Cron auth (should return JSON, not 401)
curl -sS -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://YOUR-RENDER-URL.onrender.com/api/cron/sync-tournament-status"
```

**Browser checklist:**

- [ ] Homepage loads
- [ ] Login with existing account
- [ ] Admin panel (`/admin`)
- [ ] Leaderboard shows data
- [ ] Tournament page loads
- [ ] Signup OTP email (optional)

---

## Step 7 — Update GitHub Actions secret

Repo → **Settings → Secrets and variables → Actions**:

| Secret | New value |
|--------|-----------|
| `SITE_URL` | `https://ntg-lounge.onrender.com` *(preview; prod in step 9)* |
| `CRON_SECRET` | Unchanged (same token) |

**Test:** Actions → **Daily leaderboard refresh** → **Run workflow** → should succeed.

---

## Step 8 — Test Render cron jobs manually

Render → **ntg-sync-tournament-status** → **Trigger Run**.

Check **ntg-lounge** logs for `[cron]` output or errors.

Repeat for **ntg-trigger-daily-leaderboard** — should start a GitHub Actions run.

---

## Step 9 — Custom domain (production cutover)

1. Render → **ntg-lounge** → **Settings → Custom Domains**.
2. Add `www.ntgesports.com` (and apex `ntgesports.com` if you use it).
3. At your DNS registrar, add the CNAME/A records Render shows.
4. Wait for SSL (usually 5–15 min).

**Update env vars everywhere to prod domain:**

| Service | Variables |
|---------|-----------|
| **ntg-lounge** | `AUTH_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL` → `https://www.ntgesports.com` |
| **Both cron jobs** | `SITE_URL` → `https://www.ntgesports.com` |
| **GitHub secret** | `SITE_URL` → `https://www.ntgesports.com` |

Redeploy web service after env change.

---

## Step 10 — Final production verification

- [ ] `https://www.ntgesports.com` loads
- [ ] Login / admin / leaderboard work
- [ ] GHA daily leaderboard workflow succeeds against prod URL
- [ ] Render cron jobs show success in logs

---

## Step 11 — Disable Vercel (stop double crons)

**Important:** Both Vercel and Render crons must not run at the same time.

Option A — Remove crons from Vercel (keep project for rollback):

Edit `vercel.json` and remove the `"crons"` array, push to main. Vercel redeploys without schedules.

Option B — Pause Vercel project:

Vercel → Project → **Settings → General** → pause or disconnect domain only.

Do **not** delete the Vercel project for 7–14 days.

---

## Step 12 — Cleanup (after 1–2 weeks stable)

- [ ] Pause Neon project (rollback backup)
- [ ] Delete Vercel project (optional)
- [ ] Rotate secrets if they were ever exposed in chat/logs
- [ ] Update `docs/DAILY_LEADERBOARD_REFRESH.md` references from Vercel → Render

---

## Hourly leaderboard (staging only)

If you use **cron-job.org** for hourly refresh on staging:

- Update the URL from `*.vercel.app` to your Render staging URL
- Keep `LEADERBOARD_HOURLY_REFRESH_ENABLED=true` only on staging, not production

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on Render | Check logs; usually missing env var or Node version (set `NODE_VERSION=20`) |
| 502 on cold start | Render Starter plan spins down after idle; first request ~30s |
| Auth redirect loop | `AUTH_URL` / `NEXTAUTH_URL` must exactly match browser URL |
| Cron 401 | `CRON_SECRET` mismatch between cron job and web service |
| DB connection error | `DATABASE_URL` must use Supabase pooler port **6543** + `?pgbouncer=true` |
| GHA sync hits Vercel | Update GitHub `SITE_URL` secret |
| Sessions lost | Use **same** `AUTH_SECRET` as Vercel |

---

## Quick checklist

```
□ Push render.yaml to GitHub
□ Render Blueprint → connect repo → Apply
□ Paste all Vercel env vars into ntg-lounge
□ Set CRON_SECRET + SITE_URL on both cron jobs
□ Deploy → smoke test preview URL
□ Update GitHub SITE_URL secret
□ Test GHA daily leaderboard manually
□ Add custom domain → update DNS
□ Update AUTH_URL / NEXTAUTH_URL / NEXT_PUBLIC_SITE_URL / SITE_URL to prod
□ Disable Vercel crons
□ Monitor 1–2 weeks → cleanup
```
