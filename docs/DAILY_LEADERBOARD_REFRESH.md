# Daily leaderboard refresh (production)

Nightly full refresh of all linked Valorant players (rank, MMR, player cards).  
**Schedule:** Vercel cron at **2:30 AM IST** (+ backup at 3:00 AM IST) → dispatches GitHub Actions.  
GHA native schedule backup at **2:35 AM IST**.  
**Sync API:** `GET /api/cron/sync-ranks?mode=start|continue`

## Why Vercel cron + GitHub Actions

Vercel Hobby limits each function to **60 seconds**. A full refresh takes **~6–10 minutes** for ~45 players (Henrik rate limit).  
GHA loops `mode=continue` until `complete: true`.

**GitHub’s native `schedule` trigger is unreliable** (first run often skipped, delays at peak).  
We use **Vercel cron** (`0 21 * * *` UTC = 2:30 AM IST) to call `/api/cron/trigger-daily-leaderboard`, which dispatches the GHA workflow via the GitHub API. A **backup** cron runs at 3:00 AM IST if the refresh did not complete.

## Before first deploy

### 1. Database migration

```bash
npm run db:migrate:deploy
```

Requires migrations through `20250626120000_leaderboard_refresh_run_kind` (adds `kind` on `LeaderboardRefreshRun`).

### 2. Vercel production env

| Variable | Required | Notes |
|----------|----------|--------|
| `CRON_SECRET` | Yes | Long random string; same value in GitHub secrets |
| `VALORANT_CURRENT_ACT` | Yes | e.g. `e11a3` |
| `HENRIKDEV_API_KEY` | Yes | Henrik API key |
| `DATABASE_URL` | Yes | Neon production |
| `UPSTASH_REDIS_REST_URL` | Strongly recommended | Global 26 req/min Henrik cap |
| `UPSTASH_REDIS_REST_TOKEN` | Strongly recommended | Pair with URL |
| `LEADERBOARD_SYNC_NOTIFY` | Optional | `1` for start/finish emails |
| `LEADERBOARD_SYNC_NOTIFY_EMAIL` | Optional | Your ops email |
| `RESEND_API_KEY` + `EMAIL_FROM` | If notify on | Resend |
| `GITHUB_ACTIONS_DISPATCH_TOKEN` | Yes | Fine-grained PAT, Actions: Read and write on this repo |

**Do not** enable `LEADERBOARD_HOURLY_REFRESH_ENABLED` on production unless testing hourly staging.

### 3. GitHub repository secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|--------|
| `SITE_URL` | `https://www.ntgesports.com` (no trailing slash) |
| `CRON_SECRET` | Same as Vercel `CRON_SECRET` |

### 4. Deploy branch to Vercel production

Push to `main` and deploy.

`vercel.json` schedules `/api/cron/trigger-daily-leaderboard` at **2:30 AM IST** (`0 21 * * *` UTC).  
That route dispatches the GHA workflow; GHA calls `/api/cron/sync-ranks` in a loop.

### 5. Create GitHub PAT for Vercel

GitHub → **Settings → Developer settings → Fine-grained tokens → Generate**

- Repository: **NTG**
- Permission: **Actions → Read and write**

Add token to Vercel production as `GITHUB_ACTIONS_DISPATCH_TOKEN`.

### 6. Manual test

1. **Actions → Daily leaderboard refresh → Run workflow** (full end-to-end), or  
2. After deploy, call `GET /api/cron/trigger-daily-leaderboard` with `Authorization: Bearer <CRON_SECRET>` and confirm a new GHA run starts.

### 7. Verify

1. Workflow run succeeds (~6–10 min).
2. Vercel logs show `[daily-refresh] started` / `complete`.
3. Admin → Rank sync → **Daily refresh runs** shows `COMPLETE`.
4. Superadmin: live cron banner + emails (if notify enabled).
5. Uncheck **Rank changes only** in audit to see all cron rows.

## API behaviour

- `GET /api/cron/sync-ranks?mode=start` — new run, first ~52s segment  
- `GET /api/cron/sync-ranks?mode=continue` — resume from DB cursor  
- Auth: `Authorization: Bearer <CRON_SECRET>`  
- 3 Henrik calls per player (v2 + v3 + card), same as manual refresh  

## Disable

- Pause/delete the GitHub Actions workflow, or  
- Remove `CRON_SECRET` from GitHub secrets (workflow will fail safely)
