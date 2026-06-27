# Clash Royale sync worker (Oracle VM)

Run on an Oracle Cloud Always Free VM with a **reserved public IP**. Whitelist that IP when creating the Supercell API token.

## Required env

```env
CLASH_ROYALE_API_TOKEN=your_supercell_token
SITE_URL=https://your-staging-host.vercel.app
CRON_SECRET=same_as_vercel_staging
CLASH_ROYALE_SYNC_WORKER_SECRET=long_random_secret
PORT=8787
CLASH_ROYALE_FETCH_DELAY_MS=200
```

## Run locally (test)

```bash
node scripts/clash-royale-sync-worker/server.mjs
curl -X POST http://localhost:8787/sync -H "Authorization: Bearer $CLASH_ROYALE_SYNC_WORKER_SECRET"
```

## systemd example (Oracle VM)

```ini
[Unit]
Description=NTG Clash Royale Sync Worker
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/ntg
EnvironmentFile=/opt/ntg/clash-worker.env
ExecStart=/usr/bin/node /opt/ntg/scripts/clash-royale-sync-worker/server.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Open port `8787` in Oracle security list (or use nginx reverse proxy + TLS later).

## Optional crontab fallback (if GHA is down)

```cron
*/5 * * * * curl -sS -X POST http://127.0.0.1:8787/sync -H "Authorization: Bearer $CLASH_ROYALE_SYNC_WORKER_SECRET"
```
