import { prisma } from "@core/database/client";
import { GameSlug } from "@prisma/client";
import { linkGameIdentity } from "./profile.service";
import { parseRiotId, resolveRiotAccount } from "./riot-henrik.service";

/** Link Riot ID only — rank sync runs in background via route `after()`. */
export async function linkRiotAccount(
  userId: string,
  riotId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = parseRiotId(riotId);
  if (!parsed) {
    return { ok: false, error: "Use format Name#Tag (e.g. Player#NA1)." };
  }

  let account;
  try {
    account = await resolveRiotAccount(parsed.gameName, parsed.tagLine);
  } catch {
    return { ok: false, error: "Could not verify Riot ID. Try again." };
  }

  if (!account) {
    return { ok: false, error: "Riot ID not found. Check spelling and tag." };
  }

  const taken = await prisma.user.findFirst({
    where: { riotPuuid: account.puuid, NOT: { id: userId } },
  });
  if (taken) {
    return { ok: false, error: "This Riot account is already linked to another user." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      riotPuuid: account.puuid,
      riotGameName: account.gameName,
      riotTagLine: account.tagLine,
      riotRegion: account.region ?? "ap",
    },
  });

  await linkGameIdentity(userId, {
    game: GameSlug.VALORANT,
    platform: "Riot",
    externalId: `${account.gameName}#${account.tagLine}`,
  });

  return { ok: true };
}

export async function unlinkRiotAccount(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      riotPuuid: null,
      riotGameName: null,
      riotTagLine: null,
      riotRegion: null,
    },
  });

  await prisma.gameIdentity.deleteMany({
    where: {
      profile: { userId },
      game: GameSlug.VALORANT,
      platform: "Riot",
    },
  });

  await prisma.leaderboardEntry.deleteMany({
    where: { userId, game: GameSlug.VALORANT },
  });

  return { ok: true };
}
