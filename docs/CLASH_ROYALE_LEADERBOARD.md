# Clash Royale leaderboard (staging / dev)

Dev-only feature gated by env flags. Production should leave these **unset** or **off**.

## Feature flags (staging Vercel)

| Variable | Value |
|----------|-------|
| `CLASH_ROYALE_LEADERBOARD_ENABLED` | `true` |
| `NEXT_PUBLIC_SHOW_CLASH_ROYALE_LEADERBOARD` | `1` |
| `CRON_SECRET` | same as existing cron auth |

## Supercell API + static IP

Supercell tokens are **IP-whitelisted**. Vercel serverless cannot call `api.clashroyale.com` directly.

Architecture:

1. **Oracle VM** (free tier) with reserved public IP runs `scripts/clash-royale-sync-worker/server.mjs`
2. Worker calls Supercell API from whitelisted IP
3. Worker reads linked tags via `GET /api/cron/clash-royale?mode=export`
4. Worker writes stats via `POST /api/cron/clash-royale?mode=import`
5. **GitHub Actions** (`clash-royale-sync.yml`) POSTs to worker every 5 minutes

See [scripts/clash-royale-sync-worker/README.md](../scripts/clash-royale-sync-worker/README.md) for VM setup.

## GitHub secrets

| Secret | Example |
|--------|---------|
| `CLASH_ROYALE_SYNC_WORKER_URL` | `http://203.0.113.10:8787` |
| `CLASH_ROYALE_SYNC_WORKER_SECRET` | long random string (also on VM) |

## Oracle VM env (`/opt/ntg/clash-worker.env`)

```env
CLASH_ROYALE_API_TOKEN=...
SITE_URL=https://your-staging.vercel.app
CRON_SECRET=...
CLASH_ROYALE_SYNC_WORKER_SECRET=...
PORT=8787
```

Rotate the Supercell token if it was ever exposed in chat or commits.

## Database migration

```bash
npm run db:migrate:deploy
```

Adds `CLASH_ROYALE` game slug and `User.clashRoyaleTag` fields.

## User flow

1. Enable flags on **staging** deployment only
2. Users link `#TAG` on profile (Games tab) or admin links a member
3. Wait for next 5-minute sync (or trigger GHA `workflow_dispatch`)
4. View `/esports/leaderboard` → **Clash Royale** tab → Current / Peak boards

## API endpoints

| Route | Purpose |
|-------|---------|
| `GET /api/leaderboard/clash-royale?mode=current\|peak` | Public board JSON |
| `GET /api/cron/clash-royale?mode=export` | Worker: list linked tags |
| `POST /api/cron/clash-royale?mode=import` | Worker: upsert trophy stats |
| `GET /api/cron/clash-royale?mode=status` | Last sync summary |
| `POST /api/auth/clash-royale/verify` | Profile tag link |

All routes return 404 when `CLASH_ROYALE_LEADERBOARD_ENABLED` is not `true`.

## Smoke test

```bash
# 1. Export (from machine with CRON_SECRET)
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "$SITE_URL/api/cron/clash-royale?mode=export"

# 2. Trigger worker
curl -sS -X POST "$CLASH_ROYALE_SYNC_WORKER_URL/sync" \
  -H "Authorization: Bearer $CLASH_ROYALE_SYNC_WORKER_SECRET"

# 3. Status
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "$SITE_URL/api/cron/clash-royale?mode=status"
```

## Capacity

~100 players × 1 Supercell request / 5 min ≈ **20 req/min** — safe for developer-tier limits. Worker uses 200ms delay between fetches by default.
