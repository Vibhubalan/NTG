import { prisma } from "@core/database/client";
import { withDbFallback } from "@core/database/transient-error";
import type { ListingDetail, ListingPreview } from "@core/contracts/roster-listings";
import { rosterPresetLabel } from "@/lib/roster-games";
import { mapListingFormField } from "../domain/listing-form";
import type { ListingType } from "@prisma/client";
import { isTryoutApplicationLive } from "../domain/tryout-schedule";
import { syncTryoutListingStatus } from "./tryout-schedule.service";

function mapListing(row: {
  id: string;
  slug: string;
  type: ListingType;
  title: string;
  description: string | null;
  gameKey: string | null;
  gameLabel: string | null;
  sortOrder: number;
  rulebookUrl: string | null;
  tryoutOpensAt: Date | null;
  tryoutClosesAt: Date | null;
  tryoutOpenDays: number | null;
  autoManageTryout: boolean;
  tryoutRepeatDays: number | null;
  status: string;
}): ListingPreview & {
  tryoutOpensAt: string | null;
  tryoutClosesAt: string | null;
  tryoutOpenDays: number | null;
  autoManageTryout: boolean;
  tryoutRepeatDays: number | null;
  tryoutIsLive: boolean;
} {
  const schedule = {
    type: row.type,
    status: row.status as "DRAFT" | "OPEN" | "CLOSED",
    autoManageTryout: row.autoManageTryout,
    tryoutOpensAt: row.tryoutOpensAt,
    tryoutClosesAt: row.tryoutClosesAt,
    tryoutOpenDays: row.tryoutOpenDays,
    tryoutRepeatDays: row.tryoutRepeatDays,
  };

  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    title: row.title,
    description: row.description,
    gameKey: row.gameKey,
    gameLabel: row.gameKey ? rosterPresetLabel(row.gameKey, row.gameLabel) : row.gameLabel,
    sortOrder: row.sortOrder,
    rulebookUrl: row.rulebookUrl,
    tryoutOpensAt: row.tryoutOpensAt?.toISOString() ?? null,
    tryoutClosesAt: row.tryoutClosesAt?.toISOString() ?? null,
    tryoutOpenDays: row.tryoutOpenDays,
    autoManageTryout: row.autoManageTryout,
    tryoutRepeatDays: row.tryoutRepeatDays,
    tryoutIsLive: isTryoutApplicationLive(schedule),
  };
}

export async function listOpenListings(type?: ListingType): Promise<ListingPreview[]> {
  return withDbFallback("listings", [], async () => {
    await syncTryoutListingStatus();

    const rows = await prisma.listing.findMany({
      where: {
        status: "OPEN",
        ...(type ? { type } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((r) => mapListing({ ...r, status: r.status }));
  });
}

export async function getListingBySlug(
  slug: string,
  userId?: string | null,
): Promise<ListingDetail | null> {
  return withDbFallback("listing-detail", null, async () => {
    await syncTryoutListingStatus();

    const row = await prisma.listing.findUnique({
      where: { slug },
      include: {
        formFields: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!row || row.status === "DRAFT") return null;
    if (row.type === "JOB" && row.status !== "OPEN") return null;

    let userApplied = false;
    let applicationStatus: string | null = null;

    if (userId) {
      const app = await prisma.listingApplication.findUnique({
        where: { listingId_userId: { listingId: row.id, userId } },
        select: { status: true },
      });
      if (app) {
        userApplied = true;
        applicationStatus = app.status;
      }
    }

    return {
      ...mapListing(row),
      userApplied,
      applicationStatus,
      formFields: row.formFields.map(mapListingFormField),
    };
  });
}

export async function countOpenListings(): Promise<number> {
  return withDbFallback("listings-count", 0, async () => {
    await syncTryoutListingStatus();
    return prisma.listing.count({ where: { status: "OPEN" } });
  });
}
