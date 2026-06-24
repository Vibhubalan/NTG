import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import {
  formatValorantActLabel,
  parseValorantActSeasonKey,
} from "@/lib/valorant-act";

export const VALORANT_CURRENT_ACT_SETTING_KEY = "valorant_current_act";

export const SYNC_ACT_NOT_CONFIGURED =
  "No current Valorant act is saved. A superadmin must set Episode and Act under Rank sync before refreshing.";

export type ValorantActSettingView = {
  actKey: string;
  actLabel: string;
  updatedAt: string;
  updatedById: string | null;
  updatedByName: string | null;
};

export type ValorantActSettingResponse = {
  saved: ValorantActSettingView | null;
  envSuggestion: string | null;
  envSuggestionLabel: string | null;
};

function toSettingView(row: {
  value: string;
  updatedAt: Date;
  updatedById: string | null;
  updatedBy: { name: string | null; email: string | null } | null;
}): ValorantActSettingView | null {
  const actKey = parseValorantActSeasonKey(row.value);
  if (!actKey) return null;
  return {
    actKey,
    actLabel: formatValorantActLabel(actKey) ?? actKey,
    updatedAt: row.updatedAt.toISOString(),
    updatedById: row.updatedById,
    updatedByName: row.updatedBy?.name ?? row.updatedBy?.email ?? null,
  };
}

export async function getValorantActSetting(): Promise<ValorantActSettingView | null> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: VALORANT_CURRENT_ACT_SETTING_KEY },
    include: {
      updatedBy: { select: { name: true, email: true } },
    },
  });
  if (!row) return null;
  return toSettingView(row);
}

export async function getValorantActSettingResponse(): Promise<ValorantActSettingResponse> {
  const saved = await getValorantActSetting();
  const envRaw = serverEnv.valorantCurrentAct?.trim() || null;
  const envParsed = envRaw ? parseValorantActSeasonKey(envRaw) : null;

  return {
    saved,
    envSuggestion: envParsed,
    envSuggestionLabel: envParsed ? formatValorantActLabel(envParsed) : null,
  };
}

/** Act key required for sync — database only (no env / Henrik fallback). */
export async function getSavedValorantActKeyForSync(): Promise<string | null> {
  const setting = await getValorantActSetting();
  return setting?.actKey ?? null;
}

export async function requireSavedValorantActKey(): Promise<string> {
  const act = await getSavedValorantActKeyForSync();
  if (!act) {
    throw new Error(SYNC_ACT_NOT_CONFIGURED);
  }
  return act;
}

export async function setValorantActSetting(
  actInput: string,
  adminId: string,
): Promise<ValorantActSettingView> {
  const actKey = parseValorantActSeasonKey(actInput);
  if (!actKey) {
    throw new Error("Invalid act. Use format like e11a3 (episode 11, act 3).");
  }

  const row = await prisma.platformSetting.upsert({
    where: { key: VALORANT_CURRENT_ACT_SETTING_KEY },
    create: {
      key: VALORANT_CURRENT_ACT_SETTING_KEY,
      value: actKey,
      updatedById: adminId,
    },
    update: {
      value: actKey,
      updatedById: adminId,
    },
    include: {
      updatedBy: { select: { name: true, email: true } },
    },
  });

  const view = toSettingView(row);
  if (!view) {
    throw new Error("Could not save act setting.");
  }
  return view;
}

export function buildActKeyFromParts(
  episode: number,
  act: number,
  prefix: "e" | "s" = "e",
): string | null {
  if (!Number.isInteger(episode) || episode < 1 || episode > 99) return null;
  if (!Number.isInteger(act) || act < 1 || act > 9) return null;
  return `${prefix}${episode}a${act}`;
}
