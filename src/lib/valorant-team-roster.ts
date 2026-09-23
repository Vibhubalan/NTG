/** Captain + 4 starters. One extra seat is the optional sub. */
export const VALORANT_5V5_STARTER_COUNT = 5;
export const VALORANT_5V5_MAX_ROSTER = 6;
export const VALORANT_5V5_REQUIRED_TEAMMATES = 4;
export const VALORANT_5V5_MAX_TEAMMATES = 5;

/** Teammates added by the captain (excludes the captain). */
export function isValidValorant5v5TeammateCount(
  count: number,
  opts?: { allowSub?: boolean },
): boolean {
  const allowSub = opts?.allowSub ?? true;
  if (count < VALORANT_5V5_REQUIRED_TEAMMATES) return false;
  return allowSub ? count <= VALORANT_5V5_MAX_TEAMMATES : count === VALORANT_5V5_REQUIRED_TEAMMATES;
}

export function valorant5v5TeammateCountError(opts?: { allowSub?: boolean }): string {
  return opts?.allowSub === false
    ? "Add exactly 4 teammates to register a 5v5 team."
    : "Add 4 teammates, plus an optional sub.";
}

export function splitSnapshotRiotId(
  snapshotRiotId: string | null | undefined,
): { riotGameName: string | null; riotTagLine: string | null } {
  if (!snapshotRiotId?.includes("#")) {
    return { riotGameName: snapshotRiotId?.trim() || null, riotTagLine: null };
  }
  const idx = snapshotRiotId.lastIndexOf("#");
  const riotGameName = snapshotRiotId.slice(0, idx).trim() || null;
  const riotTagLine = snapshotRiotId.slice(idx + 1).trim() || null;
  return { riotGameName, riotTagLine };
}
