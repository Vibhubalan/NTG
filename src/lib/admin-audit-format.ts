const ACTION_LABELS: Record<string, string> = {
  "tournament.update": "Updated a tournament",
  "tournament.delete": "Deleted a tournament",
  "member.update": "Updated a member profile",
  "member.delete": "Deleted a member account",
  "member.resetPassword": "Reset a member password",
  "member.linkRiot": "Linked a Valorant Riot ID",
  "member.unlinkRiot": "Removed a Valorant Riot ID",
  "member.syncRank": "Refreshed a member rank and player card",
  "member.linkSteam": "Linked a Steam account",
  "member.unlinkSteam": "Removed a Steam account",
  "upload.create": "Uploaded an image",
  "upload.rulebook": "Uploaded a rulebook",
  "leaderboard.sync": "Refreshed the Valorant leaderboard",
  "leaderboard.setAct": "Set current Valorant act",
};

const CATEGORY_LABELS: Record<string, string> = {
  tournament: "Tournament",
  member: "Member",
  leaderboard: "Leaderboard",
  upload: "Media",
};

const FIELD_LABELS: Record<string, string> = {
  name: "name",
  game: "game",
  gameLabel: "game label",
  seasonId: "season",
  status: "status",
  description: "description",
  startsAt: "start date",
  endsAt: "end date",
  registrationOpensAt: "registration open date",
  registrationClosesAt: "registration close date",
  autoManageStatus: "automatic status",
  prizePool: "prize pool",
  prizeNotes: "prize notes",
  prizeSplit: "prize split",
  bracketUrl: "bracket link",
  posterUrl: "poster image",
  hubBannerUrl: "hub banner",
  hubCarouselImages: "carousel images",
  showOnEsportsHub: "esports hub visibility",
  hideAfter: "hide-after date",
  rulebookUrl: "rulebook",
  teams: "teams",
  registrationFormat: "registration format",
  phone: "phone number",
  role: "role",
  displayName: "display name",
};

function labelField(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim().toLowerCase();
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatAuditCategory(action: string): string {
  const domain = action.split(".")[0] ?? "";
  return CATEGORY_LABELS[domain] ?? "Admin";
}

export function formatAuditTargetLabel(
  action: string,
  target: string | null,
  metadata: unknown,
  resolvedTarget?: string | null,
): string {
  if (resolvedTarget?.trim()) return resolvedTarget.trim();
  if (!target) return "—";

  if (metadata && typeof metadata === "object") {
    const m = metadata as Record<string, unknown>;
    if (typeof m.displayName === "string" && m.displayName.trim()) {
      return m.displayName.trim();
    }
    if (typeof m.riotId === "string" && m.riotId.trim()) {
      return m.riotId.trim();
    }
    if (typeof m.tournamentName === "string" && m.tournamentName.trim()) {
      return m.tournamentName.trim();
    }
  }

  if (action.startsWith("tournament.")) {
    return slugToTitle(target);
  }

  if (action.startsWith("member.")) {
    return "Member account";
  }

  if (action === "leaderboard.sync") {
    return "All linked players";
  }

  if (action === "leaderboard.setAct") {
    return "Valorant season act";
  }

  return target.length > 24 ? `${target.slice(0, 21)}…` : target;
}

export function formatAuditOperation(action: string, metadata: unknown): string {
  const base = ACTION_LABELS[action] ?? action.replace(/\./g, " · ");

  if (!metadata || typeof metadata !== "object") {
    return base;
  }

  const m = metadata as Record<string, unknown>;

  if (action === "member.linkRiot" && typeof m.riotId === "string" && m.riotId.trim()) {
    return `${base} (${m.riotId.trim()})`;
  }

  if (action === "member.syncRank" && typeof m.riotId === "string" && m.riotId.trim()) {
    return `${base} for ${m.riotId.trim()}`;
  }

  if (action === "leaderboard.setAct") {
    const label =
      typeof m.actLabel === "string" && m.actLabel.trim()
        ? m.actLabel.trim()
        : typeof m.actKey === "string"
          ? m.actKey.toUpperCase()
          : null;
    if (label) return `${base} to ${label}`;
  }

  if (Array.isArray(m.fields) && m.fields.length > 0) {
    const fields = m.fields
      .filter((f): f is string => typeof f === "string" && f !== "action")
      .map(labelField);
    if (fields.length > 0) {
      if (fields.length > 4) {
        const preview = fields.slice(0, 3).join(", ");
        return `${base} (${preview}, and ${fields.length - 3} more)`;
      }
      return `${base} (${fields.join(", ")})`;
    }
  }

  if (typeof m.prefix === "string" && m.prefix) {
    return `${base} (${m.prefix})`;
  }

  const refreshed =
    typeof m.usersRefreshed === "number"
      ? m.usersRefreshed
      : typeof m.synced === "number"
        ? m.synced
        : null;

  if (refreshed !== null) {
    const failed = typeof m.failed === "number" ? m.failed : 0;
    const skipped = typeof m.skipped === "number" ? m.skipped : 0;
    const act =
      typeof m.currentAct === "string" && m.currentAct
        ? ` for act ${m.currentAct.toUpperCase()}`
        : "";

    const parts = [`${refreshed} user${refreshed === 1 ? "" : "s"} refreshed successfully`];
    if (skipped > 0) {
      parts.push(`${skipped} skipped (no competitive rank)`);
    }
    if (failed > 0) {
      parts.push(`${failed} could not be updated`);
    }

    return `${base}: ${parts.join(" · ")}${act}`;
  }

  return base;
}
