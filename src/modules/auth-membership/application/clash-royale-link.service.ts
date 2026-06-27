import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { normalizeClashRoyaleTag } from "@/lib/clash-royale-client";
import { linkGameIdentity } from "./profile.service";
import { logUserActivity } from "@/lib/user-audit";

const CLASH_ROYALE_GAME = "CLASH_ROYALE" as const;

function clashRoyaleDisabled() {
  return !serverEnv.clashRoyaleLeaderboardEnabled;
}

export async function linkClashRoyaleAccount(
  userId: string,
  rawTag: string,
): Promise<{ ok: true; tag: string } | { ok: false; error: string }> {
  if (clashRoyaleDisabled()) {
    return { ok: false, error: "Clash Royale linking is not enabled." };
  }

  const tag = normalizeClashRoyaleTag(rawTag);
  if (!tag) {
    return { ok: false, error: "Invalid player tag. Use format #ABC123." };
  }

  const taken = await prisma.user.findFirst({
    where: { clashRoyaleTag: tag, NOT: { id: userId } },
  });
  if (taken) {
    return { ok: false, error: "This Clash Royale tag is already linked to another account." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      clashRoyaleTag: tag,
      clashRoyaleLinkedAt: new Date(),
    },
  });

  await linkGameIdentity(userId, {
    game: CLASH_ROYALE_GAME,
    platform: "Supercell",
    externalId: tag,
  });

  await prisma.gameIdentity.updateMany({
    where: {
      profile: { userId },
      game: CLASH_ROYALE_GAME,
      platform: "Supercell",
    },
    data: { verified: true },
  });

  if (user) {
    await logUserActivity({
      userId,
      email: user.email,
      name: user.name,
      action: "CLASH_ROYALE_LINK",
      target: tag,
      details: `Linked Clash Royale tag: ${tag}`,
    });
  }

  return { ok: true, tag };
}

export async function unlinkClashRoyaleAccount(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (clashRoyaleDisabled()) {
    return { ok: false, error: "Clash Royale linking is not enabled." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, clashRoyaleTag: true, clashRoyaleName: true },
  });

  const tagLabel = user?.clashRoyaleName ?? user?.clashRoyaleTag ?? "Clash Royale";

  await prisma.user.update({
    where: { id: userId },
    data: {
      clashRoyaleTag: null,
      clashRoyaleName: null,
      clashRoyaleLinkedAt: null,
    },
  });

  await prisma.gameIdentity.deleteMany({
    where: {
      profile: { userId },
      game: CLASH_ROYALE_GAME,
      platform: "Supercell",
    },
  });

  await prisma.leaderboardEntry.deleteMany({
    where: {
      userId,
      game: CLASH_ROYALE_GAME,
      scope: "TOWN",
      seasonId: null,
    },
  });

  if (user) {
    await logUserActivity({
      userId,
      email: user.email,
      name: user.name,
      action: "CLASH_ROYALE_UNLINK",
      target: tagLabel,
      details: `Unlinked Clash Royale account: ${tagLabel}`,
    });
  }

  return { ok: true };
}
