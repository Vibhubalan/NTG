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

export function formatRegistrationLabel(format: string | null | undefined): string {
  switch (format) {
    case "AUCTION":
      return "Auction Draft";
    case "STANDARD":
      return "Standard (5v5)";
    case "SOLO":
      return "1v1 Solo";
    case "DUO":
      return "2v2 Duo";
    default:
      return "";
  }
}

export function formatMonthYear(iso: string | null): string {
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

export function sortTournamentsByHostingOrder<T extends { startsAt: string | null }>(
  tournaments: T[],
): T[] {
  return [...tournaments].sort((a, b) => {
    const timeA = a.startsAt ? new Date(a.startsAt).getTime() : 0;
    const timeB = b.startsAt ? new Date(b.startsAt).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return tournaments.indexOf(a) - tournaments.indexOf(b);
  });
}

export function sortTournamentsByHostingOrderNewestFirst<T extends { startsAt: string | null }>(
  tournaments: T[],
): T[] {
  return sortTournamentsByHostingOrder(tournaments).reverse();
}

export function toTournamentDisplay(t: TournamentPreview): TournamentDisplay {
  const meta = gameMeta[t.game] ?? gameMeta.OTHER;

  const championName = t.championName ?? null;

  return {
    id: t.slug,
    slug: t.slug,
    name: t.name,
    game: meta.label,
    format: formatRegistrationLabel(t.registrationFormat),
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

export function formatParticipantRole(role: string): string {
  switch (role) {
    case "CAPTAIN":
      return "Captain";
    case "CO_CAPTAIN":
      return "Co-Captain";
    case "PLAYER":
      return "Player";
    default:
      return role;
  }
}

export type TournamentScheduleCardView = {
  registrationDate: string;
  auctionDate: string;
  tournamentDate: string;
};

const TBD = "To be decided";

function formatScheduleDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCupDateRange(startsAt: string, endsAt: string | null): string {
  if (!endsAt) return formatScheduleDate(startsAt);

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (start.toDateString() === end.toDateString()) {
    return formatScheduleDate(startsAt);
  }

  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const monthYear = start.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    return `${start.getDate()} – ${end.getDate()} ${monthYear}`;
  }

  return `${formatScheduleDate(startsAt)} – ${formatScheduleDate(endsAt)}`;
}

export function buildTournamentScheduleCardView(input: {
  registrationFormat: string | null;
  registrationOpensAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  auctionStartsAt?: string | null;
}): TournamentScheduleCardView {
  return {
    registrationDate: input.registrationOpensAt
      ? formatScheduleDate(input.registrationOpensAt)
      : TBD,
    auctionDate:
      input.registrationFormat === "AUCTION" && input.auctionStartsAt
        ? formatScheduleDate(input.auctionStartsAt)
        : TBD,
    tournamentDate: input.startsAt
      ? formatCupDateRange(input.startsAt, input.endsAt)
      : TBD,
  };
}
