import { prisma } from "@core/database/client";
import { isTransientPrismaConnectionError } from "@core/database/transient-error";
import {
  advanceTryoutWindow,
  computeTryoutListingStatus,
  type TryoutScheduleFields,
} from "../domain/tryout-schedule";

function toScheduleFields(listing: {
  type: TryoutScheduleFields["type"];
  status: TryoutScheduleFields["status"];
  autoManageTryout: boolean;
  tryoutOpensAt: Date | null;
  tryoutClosesAt: Date | null;
  tryoutOpenDays: number | null;
  tryoutRepeatDays: number | null;
}): TryoutScheduleFields {
  return {
    type: listing.type,
    status: listing.status,
    autoManageTryout: listing.autoManageTryout,
    tryoutOpensAt: listing.tryoutOpensAt,
    tryoutClosesAt: listing.tryoutClosesAt,
    tryoutOpenDays: listing.tryoutOpenDays,
    tryoutRepeatDays: listing.tryoutRepeatDays,
  };
}

export async function syncTryoutListingStatus(): Promise<{ updated: number }> {
  const now = new Date();
  let listings: Awaited<ReturnType<typeof prisma.listing.findMany>>;
  try {
    listings = await prisma.listing.findMany({
      where: { type: "ROSTER_TRYOUT", autoManageTryout: true },
    });
  } catch (error) {
    // A pooler blip on this housekeeping query should not 500 the listings page.
    if (isTransientPrismaConnectionError(error)) {
      console.warn("[listings] tryout schedule sync skipped (database unreachable)");
      return { updated: 0 };
    }
    throw error;
  }

  let updated = 0;

  for (const listing of listings) {
    const fields = toScheduleFields(listing);
    const window = advanceTryoutWindow(fields, now);
    const targetStatus = computeTryoutListingStatus(fields, now);

    const data: {
      tryoutOpensAt?: Date;
      tryoutClosesAt?: Date | null;
      status?: typeof listing.status;
    } = {};

    if (window) {
      const opensChanged =
        !listing.tryoutOpensAt ||
        listing.tryoutOpensAt.getTime() !== window.opensAt.getTime();
      if (opensChanged) {
        data.tryoutOpensAt = window.opensAt;
        if (listing.tryoutClosesAt) {
          data.tryoutClosesAt = window.closesAt;
        }
      }
    }

    if (targetStatus && targetStatus !== listing.status) {
      data.status = targetStatus;
    }

    if (Object.keys(data).length > 0) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { ...data, updatedAt: now },
      });
      updated += 1;
    }
  }

  return { updated };
}
