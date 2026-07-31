import {
  listActiveGamepassPlans,
  listFeaturedGamepassPlans,
} from "./application/gamepass.service";
import {
  listActiveHostOfferings,
  listActiveSponsorLogos,
} from "./application/host-offering.service";
import type { LoungeCommerceHomeData } from "./domain/types";

export async function getLoungeCommerceHomeData(): Promise<LoungeCommerceHomeData> {
  try {
    const [playstationFeatured, playstationAll, pcAll, hostOfferings, sponsorLogos] =
      await Promise.all([
        listFeaturedGamepassPlans("PLAYSTATION"),
        listActiveGamepassPlans("PLAYSTATION"),
        listActiveGamepassPlans("PC"),
        listActiveHostOfferings(),
        listActiveSponsorLogos(),
      ]);

    const featuredIds = new Set(playstationFeatured.map((p) => p.id));
    const playstationMore = playstationAll.filter((p) => !featuredIds.has(p.id));

    return {
      playstationFeatured,
      playstationMore,
      pcPlans: pcAll,
      hostOfferings,
      sponsorLogos,
    };
  } catch (error) {
    console.warn(
      "[lounge-commerce] Database connection failed in getLoungeCommerceHomeData:",
      error,
    );
    return {
      playstationFeatured: [],
      playstationMore: [],
      pcPlans: [],
      hostOfferings: [],
      sponsorLogos: [],
    };
  }
}

export {
  deleteGamepassPlanAdmin,
  listActiveGamepassPlans,
  listAllGamepassPlansAdmin,
  listFeaturedGamepassPlans,
  upsertGamepassPlanAdmin,
} from "./application/gamepass.service";

export {
  deleteSponsorLogoAdmin,
  getHostOfferingByType,
  listActiveHostOfferings,
  listActiveSponsorLogos,
  listAllHostOfferingsAdmin,
  listAllSponsorLogosAdmin,
  upsertHostOfferingAdmin,
  upsertSponsorLogoAdmin,
} from "./application/host-offering.service";

export type {
  GamepassPlanView,
  HostOfferingView,
  LoungeCommerceHomeData,
  SponsorLogoView,
  UpsertGamepassPlanInput,
  UpsertHostOfferingInput,
  UpsertSponsorLogoInput,
} from "./domain/types";

export { MAX_FEATURED_PER_CATEGORY } from "./domain/types";
