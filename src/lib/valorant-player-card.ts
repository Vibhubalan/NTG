/** Best horizontal strip URL for leaderboard row backgrounds. */
export function resolveLeaderboardCardArtUrl(
  wide?: string | null,
  large?: string | null,
): string | null {
  if (wide) return wide;
  if (!large) return null;

  if (large.includes("/wideart")) return large;
  if (large.includes("/largeart")) return large.replace("/largeart", "/wideart");
  if (large.includes("/smallart")) return large.replace("/smallart", "/wideart");

  return large;
}

/** Persist wide + large together when Henrik omits wide. */
export function normalizeRiotPlayerCardUrls(
  large?: string | null,
  wide?: string | null,
): { large?: string; wide?: string } {
  const resolvedLarge = large ?? undefined;
  const resolvedWide =
    wide ?? (resolvedLarge ? resolveLeaderboardCardArtUrl(null, resolvedLarge) ?? undefined : undefined);

  return {
    ...(resolvedLarge ? { large: resolvedLarge } : {}),
    ...(resolvedWide ? { wide: resolvedWide } : {}),
  };
}
