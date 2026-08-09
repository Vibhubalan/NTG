export type ValorantRoleKey =
  | "duelist"
  | "initiator"
  | "controller"
  | "sentinel"
  | "flex";

/** Public URLs for the official-style role marks. */
export const VALORANT_ROLE_ICON_SRC: Record<ValorantRoleKey, string> = {
  controller: "/images/valorant-roles/controller.png",
  duelist: "/images/valorant-roles/duelist.png",
  initiator: "/images/valorant-roles/initiator.png",
  sentinel: "/images/valorant-roles/sentinel.png",
  flex: "/images/valorant-roles/flex.png",
};

const ROLE_ALIASES: Record<string, ValorantRoleKey> = {
  controller: "controller",
  duelist: "duelist",
  initiator: "initiator",
  sentinel: "sentinel",
  flex: "flex",
  best_controller: "controller",
  best_duelist: "duelist",
  best_initiator: "initiator",
  best_sentinel: "sentinel",
  best_flex: "flex",
  // Prisma / profile enum values
  CONTROLLER: "controller",
  DUELIST: "duelist",
  INITIATOR: "initiator",
  SENTINEL: "sentinel",
  FLEX: "flex",
};

/** Normalize UI / award keys → role icon key. */
export function resolveValorantRoleKey(
  role: string | null | undefined,
): ValorantRoleKey | null {
  if (!role) return null;
  const key = role.trim().toLowerCase().replace(/\s+/g, "_");
  return ROLE_ALIASES[key] ?? null;
}

export function valorantRoleIconSrc(
  role: string | null | undefined,
): string | null {
  const key = resolveValorantRoleKey(role);
  return key ? VALORANT_ROLE_ICON_SRC[key] : null;
}
