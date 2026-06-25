# Hourly leaderboard refresh (staging)

Refreshes all linked Valorant players every hour at **:50**, using external [cron-job.org](https://cron-job.org) jobs against `/api/cron/leaderboard-hourly`. Production daily cron (`/api/cron/sync-ranks`) is unchanged.

## What you need to provide

### 1. Database migration

Run on **staging** (and locally):

```bash
npm run db:migrate
```

Or deploy migration only:

```bash
npm run db:migrate:deploy
```

This adds `LeaderboardRefreshRun`, `HOURLY_CRON` sync source, and platform settings for lock / last-completed timestamp.

### 2. Vercel env vars (staging deployment)

| Variable | Value | Notes |
|----------|-------|--------|
| `LEADERBOARD_HOURLY_REFRESH_ENABLED` | `true` | Enables the endpoint; keep `false` or unset on production |
| `CRON_SECRET` | long random string | Same value used in cron-job.org `Authorization` header |
| `HENRIKDEV_API_KEY` or `HENRIKDEV` | your Henrik key | Required for rank + card fetch |
| `VALORANT_CURRENT_ACT` | e.g. `e11a3` | Current act key |
| `DATABASE_URL` | Neon connection string | Required |
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL | **Strongly recommended** — global 26/min Henrik limit + lock across instances |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash token | Pair with URL above |

Generate `CRON_SECRET` once (e.g. `openssl rand -hex 32`) and store it in Vercel + cron-job.org only.

### 3. cron-job.org (two jobs)

Both jobs call your **staging** URL with:

```
Authorization: Bearer <CRON_SECRET>
```

**Job A — start (every hour at :50)**

- Schedule: `50 * * * *` (UTC if cron-job.org uses UTC; adjust so refresh starts at :50 in your target timezone)
- URL: `GET https://<staging-host>/api/cron/leaderboard-hourly`
- Timeout: 60s+

**Job B — continue (every 5 minutes)**

- Schedule: `*/5 * * * *`
- URL: `GET https://<staging-host>/api/cron/leaderboard-hourly?mode=continue`
- Timeout: 60s+

Only one full refresh runs at a time (DB lock). Continue jobs no-op when nothing is running.

### 4. Deploy staging

After migration + env vars:

1. Deploy the branch with this code to staging.
2. Confirm `GET /api/cron/leaderboard-hourly` returns `503` when `LEADERBOARD_HOURLY_REFRESH_ENABLED` is not `true`.
3. Trigger Job A manually once; watch Admin → Leaderboard → **Hourly refresh runs**.
4. Public leaderboard **Last refreshed** updates only when the **entire** run completes (~6–9 min for ~45 players).

## Behaviour summary

- **3 Henrik calls per player** (v2 MMR, v3 MMR, card). DB row updates only if all three succeed; failures keep old data.
- **26 requests/minute** global cap (Upstash sliding window, in-process gap fallback).
- **52s** work budget per HTTP invocation; continue cron picks up the cursor.
- **Last refreshed** on the public board = last *completed* hourly job, not per-player sync time.

## Admin monitoring

- **Admin → Leaderboard sync** → **Hourly refresh runs** table
- API: `GET /api/admin/leaderboard/refresh-runs` (admin session)

## Disable

Set `LEADERBOARD_HOURLY_REFRESH_ENABLED=false` on staging or pause cron-job.org jobs.
