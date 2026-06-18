# Load test results

Run locally: `npm run test:load` (dev server must be running).

**Last run:** 2026-06-18 · target `http://localhost:3000` · Next.js dev (Turbopack)

## When it broke

| Metric | Value |
|--------|--------|
| **Break point** | **100 concurrent workers** |
| **Reason** | 100% requests timed out (15s client timeout) |
| **Last healthy phase** | **75 concurrent** — 0% errors, p95 **7.5s** |

## Phase summary

| Concurrent | Requests | Error rate | p50 | p95 | max |
|------------|----------|------------|-----|-----|-----|
| 5 | 73 | 0% | 719ms | 2.7s | 3.8s |
| 10 | 164 | 0% | 637ms | 2.0s | 2.4s |
| 20 | 56 | 0% | 5.0s | 7.3s | 7.7s |
| 35 | 159 | 0% | 2.9s | 4.3s | 4.8s |
| 50 | 165 | 0% | 3.7s | 5.1s | 5.9s |
| 75 | 151 | 0% | 5.7s | 7.5s | 7.5s |
| **100** | **100** | **100%** | **15s** | **15s** | **15s** |

Routes exercised: `/`, `/esports`, `/esports/tournaments`, `/esports/leaderboard`, `/gallery`, `/login`, `/api/tournaments/fc26-cup-1`, `/api/reviews`.

## What this means for NTG

- **Expected load** (dozens of players browsing cups/signup): **fine** — well under 75 concurrent.
- **Degradation starts** around **50–75 concurrent** on **local dev** (single Node process, no CDN).
- **Hard failure** at **100 concurrent** — queue saturation → 15s timeouts (not HTTP 500s).
- **Production (Vercel)** will behave differently: edge caching on static assets, serverless scale-out, Neon pooler. Re-run against preview URL before launch:

  ```bash
  node scripts/load-test.mjs https://your-app.vercel.app
  ```

## Conditions that caused failure

1. **Environment:** single `npm run dev` instance on Windows
2. **Concurrency:** 100 parallel fetch workers × 8 routes
3. **Symptom:** client `AbortSignal.timeout(15000)` — requests never completed in time
4. **Not observed:** mass 500/503 from app logic; DB connection errors in this run

## Thresholds (script defaults)

- Stop when **error rate ≥ 15%** or **p95 ≥ 12s**
- 12s phase duration per concurrency level
