import { prisma } from "@core/database/client";
import {
  getCustomBadgePreset,
  CUSTOM_BADGE_PRESETS,
  type CustomBadgePreset,
  type PlacementBadgeType,
  type PlayerBadgeKind,
} from "@/lib/player-badge-presets";

export type { CustomBadgePreset, PlacementBadgeType, PlayerBadgeKind };
export {
  CUSTOM_BADGE_PRESETS,
  getCustomBadgePreset,
  placementBadgeLabel,
  isPlacementWinnerLabel,
  isPlacementRunnerUpLabel,
} from "@/lib/player-badge-presets";

/**
 * Award a global custom badge to exactly one player.
 * Not tournament-scoped — transferring replaces any previous holder of that badge type.
 */
export async function awardCustomBadge(opts: {
  userId: string;
  iconKey: string;
  awardedBy?: string | null;
  /** Optional override; defaults to preset label. */
  label?: string;
}): Promise<{ ok: true; label: string } | { ok: false; error: string }> {
  const preset = getCustomBadgePreset(opts.iconKey);
  if (!preset && !opts.label?.trim()) {
    return { ok: false, error: "Unknown custom badge." };
  }

  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { id: true },
  });
  if (!user) return { ok: false, error: "Player not found." };

  const label = opts.label?.trim() || preset!.label;

  await prisma.$transaction(async (tx) => {
    // One holder globally per custom badge type.
    await tx.playerBadge.deleteMany({
      where: {
        kind: "CUSTOM",
        iconKey: opts.iconKey,
      },
    });

    await tx.playerBadge.create({
      data: {
        userId: opts.userId,
        tournamentId: null,
        label,
        kind: "CUSTOM",
        iconKey: opts.iconKey,
        awardedBy: opts.awardedBy ?? null,
      },
    });
  });

  return { ok: true, label };
}
