import { prisma } from "@core/database/client";
import { GameSlug } from "@prisma/client";
import { serverEnv } from "@core/config/env.server";
import { linkGameIdentity } from "./profile.service";

const CS2_APP_ID = 730;

type SteamPlayerSummary = {
  personaname?: string;
  profileurl?: string;
};

type OwnedGame = {
  appid: number;
  playtime_forever?: number;
};

export function resolveSteamId64FromUrl(profileUrl: string): string | null {
  const url = profileUrl.trim();

  const profilesMatch = url.match(/steamcommunity\.com\/profiles\/(\d+)/i);
  if (profilesMatch) return profilesMatch[1];

  const vanityMatch = url.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  return vanityMatch ? vanityMatch[1] : null;
}

async function resolveVanityToSteamId64(vanity: string): Promise<string | null> {
  const key = serverEnv.steamWebApiKey;
  if (!key) return null;

  const params = new URLSearchParams({ key, vanityurl: vanity });
  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?${params}`,
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    response?: { success?: number; steamid?: string };
  };
  if (data.response?.success !== 1 || !data.response.steamid) return null;
  return data.response.steamid;
}

export async function resolveSteamId64(profileUrl: string): Promise<string | null> {
  const parsed = resolveSteamId64FromUrl(profileUrl);
  if (!parsed) return null;

  if (/^\d+$/.test(parsed)) return parsed;
  return resolveVanityToSteamId64(parsed);
}

async function fetchPlayerSummary(steamId64: string): Promise<SteamPlayerSummary | null> {
  const key = serverEnv.steamWebApiKey;
  if (!key) return null;

  const params = new URLSearchParams({ key, steamids: steamId64 });
  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?${params}`,
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    response?: { players?: SteamPlayerSummary[] };
  };
  return data.response?.players?.[0] ?? null;
}

async function tryFetchCs2Hours(steamId64: string): Promise<number | null> {
  const key = serverEnv.steamWebApiKey;
  if (!key) return null;

  try {
    const params = new URLSearchParams({
      key,
      steamid: steamId64,
      include_appinfo: "true",
    });
    const res = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params}`,
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      response?: { games?: OwnedGame[] };
    };
    const games = data.response?.games;
    if (!games) return null;

    const cs2 = games.find((g) => g.appid === CS2_APP_ID);
    if (!cs2) return null;

    return (cs2.playtime_forever ?? 0) / 60;
  } catch {
    return null;
  }
}

export async function linkSteamAccount(
  userId: string,
  profileUrl: string,
): Promise<
  | { ok: true; steamId64: string; personaName: string; cs2Hours: number | null }
  | { ok: false; error: string }
> {
  if (!serverEnv.steamWebApiKey) {
    return { ok: false, error: "Steam API is not configured." };
  }

  const steamId64 = await resolveSteamId64(profileUrl);
  if (!steamId64) {
    return { ok: false, error: "Steam profile not found." };
  }

  const taken = await prisma.user.findFirst({
    where: { steamId64, NOT: { id: userId } },
  });
  if (taken) {
    return { ok: false, error: "This Steam account is already linked to another user." };
  }

  const summary = await fetchPlayerSummary(steamId64);
  if (!summary) {
    return { ok: false, error: "Steam profile does not exist." };
  }

  const cs2Hours = await tryFetchCs2Hours(steamId64);

  const normalizedUrl =
    summary.profileurl ??
    (profileUrl.includes("steamcommunity.com")
      ? profileUrl.trim()
      : `https://steamcommunity.com/profiles/${steamId64}`);

  await prisma.user.update({
    where: { id: userId },
    data: {
      steamId64,
      steamProfileUrl: normalizedUrl,
      steamPersonaName: summary.personaname ?? null,
      cs2HoursPlayed: cs2Hours,
      steamLinkedAt: new Date(),
    },
  });

  await linkGameIdentity(userId, {
    game: GameSlug.CS2,
    platform: "Steam",
    externalId: steamId64,
  });

  await prisma.gameIdentity.updateMany({
    where: {
      profile: { userId },
      game: GameSlug.CS2,
      platform: "Steam",
    },
    data: { verified: true },
  });

  return {
    ok: true,
    steamId64,
    personaName: summary.personaname ?? steamId64,
    cs2Hours,
  };
}

export async function unlinkSteamAccount(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      steamId64: null,
      steamProfileUrl: null,
      steamPersonaName: null,
      cs2HoursPlayed: null,
      steamLinkedAt: null,
    },
  });

  await prisma.gameIdentity.deleteMany({
    where: {
      profile: { userId },
      game: GameSlug.CS2,
      platform: "Steam",
    },
  });

  await prisma.leaderboardEntry.deleteMany({
    where: { userId, game: GameSlug.CS2 },
  });

  await prisma.playerProfile.updateMany({
    where: { userId },
    data: { cs2PeakPremierRank: null },
  });

  return { ok: true };
}
