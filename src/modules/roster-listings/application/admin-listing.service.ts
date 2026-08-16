import { prisma } from "@core/database/client";
import { rosterPresetLabel } from "@/lib/roster-games";
import { slugify } from "../domain/helpers";
import { getDefaultFormTemplate } from "./listing-form.service";
import { serializeFieldOptions, formatResponseForDisplay } from "../domain/listing-form";
import { validateTryoutSchedule } from "../domain/tryout-schedule";
import {
  normalizeTryoutGameKey,
  tryoutGameConflictMessage,
  validateTryoutListingGame,
} from "../domain/tryout-listing";
import { syncTryoutListingStatus } from "./tryout-schedule.service";
import { withListingApplicationExtras } from "../infrastructure/ensure-listing-application-extras";

export type AdminListingRow = {
  id: string;
  slug: string;
  type: string;
  title: string;
  description: string | null;
  gameKey: string | null;
  gameLabel: string | null;
  status: string;
  sortOrder: number;
  applicationCount: number;
  createdAt: string;
};

export type AdminListingApplicationRow = {
  id: string;
  createdAt: string;
  status: string;
  message: string | null;
  responses: Record<string, string | string[] | Record<string, string | string[]>> | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  town: string | null;
  dateOfBirth: string | null;
  riotId: string | null;
  rankTier: string | null;
  valorantRoles: string | null;
  steamId64: string | null;
  steamPersonaName: string | null;
  cs2PeakPremier: string | null;
  cs2FaceitRank: string | null;
  cs2Hours: number | null;
  pastExperience: string | null;
  resumeUrl: string | null;
};

export async function listListingsAdmin(): Promise<AdminListingRow[]> {
  const rows = await prisma.listing.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { applications: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    type: r.type,
    title: r.title,
    description: r.description,
    gameKey: r.gameKey,
    gameLabel: r.gameKey ? rosterPresetLabel(r.gameKey, r.gameLabel) : r.gameLabel,
    status: r.status,
    sortOrder: r.sortOrder,
    applicationCount: r._count.applications,
    createdAt: r.createdAt.toISOString(),
  }));
}

async function findTryoutListingForGame(
  gameKey: string,
  excludeListingId?: string,
): Promise<{ slug: string } | null> {
  return prisma.listing.findFirst({
    where: {
      type: "ROSTER_TRYOUT",
      gameKey,
      ...(excludeListingId ? { id: { not: excludeListingId } } : {}),
    },
    select: { slug: true },
  });
}

async function validateTryoutListingFields(
  type: "JOB" | "ROSTER_TRYOUT",
  gameKey: string | null,
  excludeListingId?: string,
): Promise<string | null> {
  if (type !== "ROSTER_TRYOUT") return null;

  const gameErr = validateTryoutListingGame(gameKey);
  if (gameErr) return gameErr;

  const normalized = normalizeTryoutGameKey(gameKey)!;
  const existing = await findTryoutListingForGame(normalized, excludeListingId);
  if (existing) {
    return tryoutGameConflictMessage(normalized, existing.slug);
  }

  return null;
}

export async function getListingAdmin(slug: string) {
  return prisma.listing.findUnique({
    where: { slug },
    include: {
      _count: { select: { applications: true } },
      formFields: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function createListing(input: {
  slug?: string;
  type: "JOB" | "ROSTER_TRYOUT";
  title: string;
  description?: string;
  gameKey?: string;
  gameLabel?: string;
  status?: "DRAFT" | "OPEN" | "CLOSED";
  sortOrder?: number;
}): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const slug = slugify(input.slug || input.title);
  if (!slug) return { ok: false, error: "Invalid slug." };

  const existing = await prisma.listing.findUnique({ where: { slug } });
  if (existing) return { ok: false, error: "A listing with this slug already exists." };

  const gameKey =
    input.type === "ROSTER_TRYOUT" ? normalizeTryoutGameKey(input.gameKey) : null;
  const gameLabel =
    input.type === "ROSTER_TRYOUT" && gameKey
      ? rosterPresetLabel(gameKey, input.gameLabel)
      : input.gameLabel?.trim() || null;

  const tryoutErr = await validateTryoutListingFields(input.type, gameKey);
  if (tryoutErr) return { ok: false, error: tryoutErr };

  const maxOrder = await prisma.listing.aggregate({ _max: { sortOrder: true } });

  const template = getDefaultFormTemplate(input.type);

  try {
    await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          slug,
          type: input.type,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          gameKey,
          gameLabel,
          status: input.status ?? "DRAFT",
          sortOrder: input.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
        },
      });

      if (template.length > 0) {
        await tx.listingFormField.createMany({
          data: template.map((f) => ({
            listingId: listing.id,
            sortOrder: f.sortOrder,
            fieldType: f.fieldType,
            label: f.label,
            helpText: f.helpText,
            required: f.required,
            options: serializeFieldOptions(f) ?? undefined,
          })),
        });
      }
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return {
        ok: false,
        error: "A tryout listing for this game already exists.",
      };
    }
    console.error("[createListing]", err);
    return { ok: false, error: "Could not create listing. Run npm run db:migrate:deploy if this persists." };
  }

  return { ok: true, slug };
}

export async function updateListing(
  slug: string,
  input: {
    title?: string;
    description?: string | null;
    type?: "JOB" | "ROSTER_TRYOUT";
    gameKey?: string | null;
    gameLabel?: string | null;
    status?: "DRAFT" | "OPEN" | "CLOSED";
    sortOrder?: number;
    rulebookUrl?: string | null;
    tryoutOpensAt?: string | null;
    tryoutClosesAt?: string | null;
    tryoutOpenDays?: number | null;
    autoManageTryout?: boolean;
    tryoutRepeatDays?: number | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const listing = await prisma.listing.findUnique({ where: { slug } });
  if (!listing) return { ok: false, error: "Listing not found." };

  const nextType = input.type ?? listing.type;
  let nextGameKey: string | null;
  if (nextType === "JOB") {
    nextGameKey = null;
  } else if (input.gameKey !== undefined) {
    nextGameKey = normalizeTryoutGameKey(input.gameKey);
  } else {
    nextGameKey = listing.gameKey;
  }

  let nextGameLabel: string | null;
  if (nextType === "JOB") {
    nextGameLabel = null;
  } else if (input.gameLabel !== undefined) {
    nextGameLabel = input.gameLabel?.trim() || (nextGameKey ? rosterPresetLabel(nextGameKey) : null);
  } else if (input.gameKey !== undefined && nextGameKey) {
    nextGameLabel = rosterPresetLabel(nextGameKey, listing.gameLabel);
  } else {
    nextGameLabel = listing.gameLabel;
  }

  const tryoutErr = await validateTryoutListingFields(nextType, nextGameKey, listing.id);
  if (tryoutErr) return { ok: false, error: tryoutErr };

  const nextOpens =
    input.tryoutOpensAt !== undefined
      ? input.tryoutOpensAt
        ? new Date(input.tryoutOpensAt)
        : null
      : listing.tryoutOpensAt;
  const nextCloses =
    input.tryoutClosesAt !== undefined
      ? input.tryoutClosesAt
        ? new Date(input.tryoutClosesAt)
        : null
      : listing.tryoutClosesAt;
  const nextOpenDays =
    input.tryoutOpenDays !== undefined ? input.tryoutOpenDays : listing.tryoutOpenDays;
  const nextAutoManage =
    input.autoManageTryout !== undefined ? input.autoManageTryout : listing.autoManageTryout;

  const scheduleErr = validateTryoutSchedule({
    tryoutOpensAt: nextOpens,
    tryoutClosesAt: nextCloses,
    tryoutOpenDays: nextOpenDays,
    autoManageTryout: nextAutoManage,
  });
  if (scheduleErr) return { ok: false, error: scheduleErr };

  await prisma.listing.update({
    where: { slug },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.type !== undefined || input.gameKey !== undefined
        ? { gameKey: nextGameKey, gameLabel: nextGameLabel }
        : input.gameLabel !== undefined
          ? { gameLabel: input.gameLabel?.trim() || null }
          : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.rulebookUrl !== undefined ? { rulebookUrl: input.rulebookUrl } : {}),
      ...(input.tryoutOpensAt !== undefined
        ? { tryoutOpensAt: input.tryoutOpensAt ? new Date(input.tryoutOpensAt) : null }
        : {}),
      ...(input.tryoutClosesAt !== undefined
        ? { tryoutClosesAt: input.tryoutClosesAt ? new Date(input.tryoutClosesAt) : null }
        : {}),
      ...(input.tryoutOpenDays !== undefined ? { tryoutOpenDays: input.tryoutOpenDays } : {}),
      ...(input.autoManageTryout !== undefined
        ? { autoManageTryout: input.autoManageTryout }
        : {}),
      ...(input.tryoutRepeatDays !== undefined
        ? { tryoutRepeatDays: input.tryoutRepeatDays }
        : {}),
    },
  });

  if (listing.type === "ROSTER_TRYOUT" || input.type === "ROSTER_TRYOUT") {
    await syncTryoutListingStatus();
  }

  return { ok: true };
}

export async function deleteListing(
  slug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const listing = await prisma.listing.findUnique({ where: { slug } });
  if (!listing) return { ok: false, error: "Listing not found." };

  await prisma.listing.delete({ where: { slug } });
  return { ok: true };
}

export async function listListingApplicationsAdmin(
  slug: string,
): Promise<AdminListingApplicationRow[] | null> {
  const listing = await prisma.listing.findUnique({ where: { slug } });
  if (!listing) return null;

  const rows = await withListingApplicationExtras(() =>
    prisma.listingApplication.findMany({
      where: { listingId: listing.id },
      include: { user: { include: { playerProfile: true } } },
      orderBy: { createdAt: "desc" },
    }),
  );

  return rows.map((r) => {
    const roles = Array.isArray(r.snapshotValorantRoles)
      ? (r.snapshotValorantRoles as string[]).join(", ")
      : null;
    const responses =
      r.responses && typeof r.responses === "object" && !Array.isArray(r.responses)
        ? (r.responses as Record<string, string | string[] | Record<string, string | string[]>>)
        : null;
    const user = r.user;
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      status: r.status,
      message: r.message,
      responses,
      displayName: r.snapshotDisplayName,
      email: user?.email ?? null,
      phone: r.snapshotPhone ?? user?.phone ?? null,
      town: user?.playerProfile?.town ?? null,
      dateOfBirth: isoDateOnly(r.snapshotDateOfBirth) ?? isoDateOnly(user?.dateOfBirth),
      riotId: r.snapshotRiotId,
      rankTier: r.snapshotRankTier,
      valorantRoles: roles,
      steamId64: r.snapshotSteamId64,
      steamPersonaName: user?.steamPersonaName ?? null,
      cs2PeakPremier: r.snapshotCs2PeakPremier,
      cs2FaceitRank: r.snapshotCs2FaceitRank,
      cs2Hours: r.snapshotCs2Hours,
      pastExperience: r.pastExperience ?? null,
      resumeUrl: r.resumeUrl ?? null,
    };
  });
}

function isoDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  const time = value.getTime();
  if (Number.isNaN(time)) return null;
  return value.toISOString().slice(0, 10);
}

export async function updateListingApplicationStatus(
  applicationId: string,
  status: "PENDING" | "APPROVED" | "REJECTED",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const app = await prisma.listingApplication.findUnique({ where: { id: applicationId } });
  if (!app) return { ok: false, error: "Application not found." };

  await prisma.listingApplication.update({
    where: { id: applicationId },
    data: { status },
  });

  return { ok: true };
}

export async function deleteListingApplication(
  applicationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const app = await prisma.listingApplication.findUnique({ where: { id: applicationId } });
  if (!app) return { ok: false, error: "Application not found." };

  await prisma.listingApplication.delete({ where: { id: applicationId } });
  return { ok: true };
}

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildListingApplicationsCsv(
  rows: AdminListingApplicationRow[],
  formFieldLabels?: { id: string; label: string }[],
): string {
  const dynamicHeaders = (formFieldLabels ?? []).map((f) => f.label);
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Status",
    ...dynamicHeaders,
    "Message",
    "Riot ID",
    "Rank",
    "Valorant Roles",
    "Steam64",
    "Peak Premier",
    "Faceit",
    "Past Experience",
    "Resume URL",
    "Applied At",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const dynamicValues = (formFieldLabels ?? []).map((f) => {
      const v = r.responses?.[f.id];
      return formatResponseForDisplay(v);
    });
    lines.push(
      [
        csvEscape(r.displayName),
        csvEscape(r.email),
        csvEscape(r.phone),
        csvEscape(r.status),
        ...dynamicValues.map(csvEscape),
        csvEscape(r.message),
        csvEscape(r.riotId),
        csvEscape(r.rankTier),
        csvEscape(r.valorantRoles),
        csvEscape(r.steamId64),
        csvEscape(r.cs2PeakPremier),
        csvEscape(r.cs2FaceitRank),
        csvEscape(r.pastExperience),
        csvEscape(r.resumeUrl),
        csvEscape(r.createdAt),
      ].join(","),
    );
  }
  return lines.join("\n");
}
