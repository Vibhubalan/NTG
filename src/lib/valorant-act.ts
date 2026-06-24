/** Format Henrik season key (e.g. e12a3, s26a4) for display. */
export function formatValorantActLabel(season: string | null | undefined): string | null {
  if (!season?.trim()) return null;
  const raw = season.trim().toLowerCase();
  const episodeAct = /^[es]?(\d+)a(\d+)$/i.exec(raw);
  if (episodeAct) {
    const prefix = raw.startsWith("s") ? "S" : "Ep";
    const episode = episodeAct[1];
    const act = episodeAct[2];
    return prefix === "S"
      ? `S${episode} · Act ${act}`
      : `Ep ${episode} · Act ${act}`;
  }
  return season.toUpperCase();
}

export function normalizeActSeasonKey(season: string): string {
  return season.trim().toLowerCase();
}

/** Validate and normalize admin/env act input (e11a3, s26a4, E11A3). */
export function parseValorantActSeasonKey(input: string): string | null {
  const raw = normalizeActSeasonKey(input);
  if (!/^[es]\d+a\d+$/.test(raw)) return null;
  return raw;
}

/** Split a saved act key into episode / act parts for admin UI. */
export function parseActKeyParts(
  actKey: string,
): { prefix: "e" | "s"; episode: number; act: number } | null {
  const parsed = parseValorantActSeasonKey(actKey);
  if (!parsed) return null;
  const match = /^([es])(\d+)a(\d+)$/.exec(parsed);
  if (!match) return null;
  return {
    prefix: match[1] as "e" | "s",
    episode: Number.parseInt(match[2]!, 10),
    act: Number.parseInt(match[3]!, 10),
  };
}

/** s26a4 ↔ e26a4 style aliases for Henrik by_season lookup. */
export function actSeasonKeyVariants(season: string): string[] {
  const k = normalizeActSeasonKey(season);
  const variants = new Set<string>([k]);
  if (k.startsWith("s")) variants.add(`e${k.slice(1)}`);
  if (k.startsWith("e")) variants.add(`s${k.slice(1)}`);
  return [...variants];
}

export type HenrikActSeasonStats = {
  error?: string;
  number_of_games?: number;
  final_rank_patched?: string;
  final_rank?: number;
  tier?: number;
  act_rank_wins?: Array<{ tier?: number; patched_tier?: string }>;
};

/** True when the player has a comp rank in this act (played placements / has a tier). */
export function isActSeasonRanked(stats: HenrikActSeasonStats | null | undefined): boolean {
  if (!stats || stats.error) return false;
  const games = stats.number_of_games ?? 0;
  if (games <= 0) return false;

  const patched = stats.final_rank_patched?.trim().toLowerCase() ?? "";
  if (!patched || patched === "unranked" || patched === "unused") return false;

  const tier = stats.final_rank ?? stats.tier;
  if (typeof tier === "number" && tier <= 0) return false;

  return true;
}

export function getActSeasonStats(
  bySeason: Record<string, HenrikActSeasonStats> | undefined,
  season: string,
): HenrikActSeasonStats | null {
  if (!bySeason) return null;
  for (const key of actSeasonKeyVariants(season)) {
    const stats = bySeason[key];
    if (stats && typeof stats === "object") return stats;
  }
  return null;
}

export function resolveCurrentActSeason(options: {
  overrideAct?: string | null;
  envAct?: string | null;
  currentDataSeason?: string | null;
}): string | null {
  const fromOverride = options.overrideAct?.trim();
  if (fromOverride) {
    return parseValorantActSeasonKey(fromOverride) ?? normalizeActSeasonKey(fromOverride);
  }

  const fromEnv = options.envAct?.trim();
  if (fromEnv) {
    return parseValorantActSeasonKey(fromEnv) ?? normalizeActSeasonKey(fromEnv);
  }

  const fromApi = options.currentDataSeason?.trim();
  if (fromApi) return normalizeActSeasonKey(fromApi);

  return null;
}
