# ADR 001: Platform architecture

**Status:** Accepted  
**Date:** 2026-06

## Context

NTG Lounge needs membership, tournaments, admin tooling, and public esports pages on a small team budget.

## Decision

- **Next.js App Router** — marketing + platform routes, server components for DB reads
- **Neon Postgres + Prisma** — single database, migrations in repo
- **NextAuth (credentials + JWT)** — sessions; no edge middleware; guards in layouts + `auth-guard`
- **Vercel** — hosting + cron (`sync-ranks` daily 12 AM IST, tournament status, reels)
- **S3-compatible storage** — uploads (posters, team logos)
- **Henrik.dev** — Valorant rank sync → `LeaderboardEntry` table; UI reads DB only

## Consequences

- Simple ops, one deploy unit
- No multi-tenant complexity
- Rank freshness bounded by cron batching (26 players max per batch)
- Admin actions logged to `AdminAuditLog`
