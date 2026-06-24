import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { formatValorantActLabel, parseValorantActSeasonKey } from "@/lib/valorant-act";
import { getLeaderboardCronStatus } from "@/lib/leaderboard-cron-status";
import {
  getEnvValorantActKey,
  requireEnvValorantActKey,
  SYNC_ACT_NOT_CONFIGURED,
} from "@/lib/valorant-sync-act";
import { serverEnv } from "@core/config/env.server";
import {
  getLeaderboardSyncStats,
  RANK_SYNC_BATCH_SIZE,
  syncAllLinkedPlayers,
  type SyncRunTotals,
} from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
/** 1 player × ~6.3s Henrik (v2+v3+card); client loops until all users refreshed. */
export const maxDuration = 60;

type SyncBatchBody = {
  runStartedAt?: string;
  totals?: SyncRunTotals;
  /** Optional override; defaults to VALORANT_CURRENT_ACT env. */
  currentAct?: string;
};

function parseCurrentActInput(raw: string | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return parseValorantActSeasonKey(trimmed);
}

function resolveSyncAct(bodyAct: string | undefined): string | null {
  const fromBody = parseCurrentActInput(bodyAct);
  if (fromBody) return fromBody;
  return getEnvValorantActKey();
}

function accumulateTotals(prev: SyncRunTotals | undefined, batch: SyncRunTotals): SyncRunTotals {
  return {
    synced: (prev?.synced ?? 0) + batch.synced,
    failed: (prev?.failed ?? 0) + batch.failed,
    skipped: (prev?.skipped ?? 0) + batch.skipped,
    batches: (prev?.batches ?? 0) + batch.batches,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  try {
    const [stats, cronRun] = await Promise.all([
      getLeaderboardSyncStats(),
      getLeaderboardCronStatus(),
    ]);
    const envAct = getEnvValorantActKey();
    return NextResponse.json({
      stats,
      cronRun,
      currentAct: envAct,
      currentActLabel: formatValorantActLabel(envAct),
      envConfigured: Boolean(serverEnv.valorantCurrentAct?.trim()),
    });
  } catch (err) {
    console.error("[admin/leaderboard/sync GET]", err);
    return NextResponse.json({ error: "Could not load sync stats." }, { status: 500 });
  }
}

/** Run one batch of the full leaderboard sync. Client loops until complete. */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  let body: SyncBatchBody = {};
  try {
    body = (await req.json()) as SyncBatchBody;
  } catch {
    /* empty body ok — starts new run */
  }

  const runStartedAt = body.runStartedAt
    ? new Date(body.runStartedAt)
    : new Date();

  if (Number.isNaN(runStartedAt.getTime())) {
    return NextResponse.json({ error: "Invalid runStartedAt." }, { status: 400 });
  }

  const isNewRun = !body.runStartedAt;

  let currentActOverride: string | null = null;
  try {
    if (isNewRun) {
      currentActOverride = resolveSyncAct(body.currentAct);
      if (!currentActOverride) {
        return NextResponse.json({ error: SYNC_ACT_NOT_CONFIGURED }, { status: 400 });
      }
    } else {
      currentActOverride = requireEnvValorantActKey();
    }
  } catch {
    return NextResponse.json({ error: SYNC_ACT_NOT_CONFIGURED }, { status: 400 });
  }

  try {
    const runId = runStartedAt.toISOString();
    const batch = await syncAllLinkedPlayers({
      fullRefreshBefore: runStartedAt,
      tryAllRegions: false,
      skipPlayerCard: false,
      maxBatchSize: RANK_SYNC_BATCH_SIZE,
      snapshotRanks: isNewRun,
      context: {
        source: "manual",
        runId,
        adminId: auth.userId,
        currentActOverride,
      },
    });

    const totals = accumulateTotals(body.totals, {
      synced: batch.synced,
      failed: batch.failed,
      skipped: batch.skipped,
      batches: 1,
    });

    const complete = !batch.hasMore;
    const stats = await getLeaderboardSyncStats();

    if (complete) {
      const usersRefreshed = totals.synced;
      await logAdminAction(auth.userId, "leaderboard.sync", undefined, {
        runStartedAt: runStartedAt.toISOString(),
        currentAct: currentActOverride ?? undefined,
        usersRefreshed,
        ...totals,
      });
    }

    return NextResponse.json({
      ok: true,
      runStartedAt: runStartedAt.toISOString(),
      currentAct: currentActOverride,
      batch,
      totals,
      complete,
      stats,
    });
  } catch (err) {
    console.error("[admin/leaderboard/sync POST]", err);
    const message = err instanceof Error ? err.message : "Sync batch failed.";
    return NextResponse.json(
      {
        error:
          message.includes("timeout") || message.includes("Timeout")
            ? "Sync timed out. Try again — progress is saved between users."
            : "Sync failed. Try again in a moment.",
      },
      { status: 500 },
    );
  }
}
