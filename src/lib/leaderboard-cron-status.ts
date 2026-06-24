import { prisma } from "@core/database/client";

const SETTING_KEY = "leaderboard_cron_run";

export type LeaderboardCronPhase = "running" | "complete" | "error";

export type LeaderboardCronRunStatus = {
  phase: LeaderboardCronPhase;
  runStartedAt: string;
  finishedAt: string | null;
  synced: number;
  failed: number;
  skipped: number;
  pending: number;
  totalPlayers: number;
  currentAct: string | null;
  errorMessage: string | null;
  updatedAt: string;
};

type CronRunPayload = Omit<LeaderboardCronRunStatus, "updatedAt">;

function parseStored(raw: string | null | undefined): LeaderboardCronRunStatus | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as LeaderboardCronRunStatus;
    if (!data.phase || !data.runStartedAt) return null;
    return data;
  } catch {
    return null;
  }
}

async function writeStatus(payload: CronRunPayload): Promise<void> {
  const value: LeaderboardCronRunStatus = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  await prisma.platformSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}

export async function getLeaderboardCronStatus(): Promise<LeaderboardCronRunStatus | null> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: SETTING_KEY },
    select: { value: true },
  });
  return parseStored(row?.value);
}

export async function markLeaderboardCronStarted(params: {
  runStartedAt: Date;
  currentAct: string;
  totalPlayers: number;
}): Promise<void> {
  await writeStatus({
    phase: "running",
    runStartedAt: params.runStartedAt.toISOString(),
    finishedAt: null,
    synced: 0,
    failed: 0,
    skipped: 0,
    pending: params.totalPlayers,
    totalPlayers: params.totalPlayers,
    currentAct: params.currentAct,
    errorMessage: null,
  });
}

export async function markLeaderboardCronProgress(params: {
  runStartedAt: Date;
  currentAct: string;
  synced: number;
  failed: number;
  skipped: number;
  pending: number;
  totalPlayers: number;
}): Promise<void> {
  await writeStatus({
    phase: "running",
    runStartedAt: params.runStartedAt.toISOString(),
    finishedAt: null,
    synced: params.synced,
    failed: params.failed,
    skipped: params.skipped,
    pending: params.pending,
    totalPlayers: params.totalPlayers,
    currentAct: params.currentAct,
    errorMessage: null,
  });
}

export async function markLeaderboardCronComplete(params: {
  runStartedAt: Date;
  currentAct: string;
  synced: number;
  failed: number;
  skipped: number;
  totalPlayers: number;
}): Promise<void> {
  await writeStatus({
    phase: "complete",
    runStartedAt: params.runStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    synced: params.synced,
    failed: params.failed,
    skipped: params.skipped,
    pending: 0,
    totalPlayers: params.totalPlayers,
    currentAct: params.currentAct,
    errorMessage: null,
  });
}

export async function markLeaderboardCronError(params: {
  runStartedAt: Date;
  currentAct?: string | null;
  synced?: number;
  failed?: number;
  skipped?: number;
  pending?: number;
  totalPlayers?: number;
  errorMessage: string;
}): Promise<void> {
  await writeStatus({
    phase: "error",
    runStartedAt: params.runStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    synced: params.synced ?? 0,
    failed: params.failed ?? 0,
    skipped: params.skipped ?? 0,
    pending: params.pending ?? 0,
    totalPlayers: params.totalPlayers ?? 0,
    currentAct: params.currentAct ?? null,
    errorMessage: params.errorMessage,
  });
}
