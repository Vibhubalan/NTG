import type { GameSlug, TournamentStatus } from "@prisma/client";
import { siCounterstrike, siEa, siValorant } from "simple-icons";
import type { TournamentPreview } from "@core/contracts";

export type TournamentDisplay = {
  id: string;
  slug: string;
  name: string;
  game: string;
  format: string;
  date: string;
  status: "Hosted" | "Soon" | "Live" | "Open" | "Upcoming";
  iconPath: string;
  hex: string;
  championName?: string | null;
  displayNumber?: number;
};

const gameMeta: Record<
  GameSlug,
  { iconPath: string; hex: string; label: string }
> = {
  VALORANT: { iconPath: siValorant.path, hex: "#ff4655", label: "Valorant" },
  CS2: { iconPath: siCounterstrike.path, hex: "#e65a23", label: "Counter-Strike 2" },
  EA_FC26: { iconPath: siEa.path, hex: "#02ef5c", label: "EA FC 26" },
  OTHER: { iconPath: siValorant.path, hex: "#ff4655", label: "Other" },
};

function formatMonthYear(iso: string | null): string {
  if (!iso) return "TBA";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function mapDisplayStatus(status: TournamentStatus): TournamentDisplay["status"] {
  switch (status) {
    case "COMPLETED":
      return "Hosted";
    case "IN_PROGRESS":
      return "Live";
    case "REGISTRATION_OPEN":
      return "Open";
    case "UPCOMING":
      return "Upcoming";
    case "DRAFT":
    default:
      return "Soon";
  }
}

export function toTournamentDisplay(t: TournamentPreview): TournamentDisplay {
  const meta = gameMeta[t.game] ?? gameMeta.OTHER;

  const championName = t.championName ?? null;

  return {
    id: t.slug,
    slug: t.slug,
    name: t.name,
    game: meta.label,
    format: t.registrationFormat === "AUCTION" ? "Auction Draft" : (t.registrationFormat === "STANDARD" ? "Standard (5v5)" : ""),
    date: formatMonthYear(t.startsAt),
    status: mapDisplayStatus(t.status),
    iconPath: meta.iconPath,
    hex: meta.hex,
    championName,
  };
}

export function gameMetaFor(slug: GameSlug) {
  return gameMeta[slug] ?? gameMeta.OTHER;
}
