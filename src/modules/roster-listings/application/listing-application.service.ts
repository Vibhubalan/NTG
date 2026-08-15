import { prisma } from "@core/database/client";
import type { ListingEligibility, ListingApplicantProfile } from "@core/contracts/roster-listings";
import { GameSlug, type ValorantRole } from "@prisma/client";
import { syncUserRank } from "@tournaments-leagues/application/rank-sync.service";
import { logUserActivity } from "@/lib/user-audit";
import { gameKeyToSlug } from "../domain/helpers";
import { mapListingFormField } from "../domain/listing-form";
import { validateListingResponses } from "./listing-form.service";
import type { ListingApplyInput } from "./listing-application.types";
import {
  advanceTryoutWindow,
  isTryoutApplicationLive,
} from "../domain/tryout-schedule";
import { syncTryoutListingStatus } from "./tryout-schedule.service";
import {
  meetsValorantTryoutRank,
  TRYOUT_RANK_INELIGIBLE_MESSAGE,
} from "../domain/tryout-rank";

function validateGeneralProfileForTryout(user: {
  phone: string | null;
  playerProfile: { displayName: string; town: string | null } | null;
}): string[] {
  const missing: string[] = [];
  if (!user.playerProfile?.displayName?.trim()) {
    missing.push("Add your display name on your profile.");
  }
  if (!user.phone?.trim()) {
    missing.push("Add your phone number on your profile.");
  }
  if (!user.playerProfile?.town?.trim()) {
    missing.push("Add your town on your profile.");
  }
  return missing;
}

function validateTryoutGameProfile(
  gameKey: string,
  user: {
    dateOfBirth: Date | null;
    olympusId: string | null;
    riotPuuid: string | null;
    steamId64: string | null;
    playerProfile: {
      valorantRoles: ValorantRole[];
      cs2PeakPremierRank: string | null;
      cs2FaceitRank: string | null;
    } | null;
  },
): string[] {
  const slug = gameKeyToSlug(gameKey);
  if (!slug) return [];

  const missing: string[] = [];

  if (slug === GameSlug.VALORANT) {
    if (!user.riotPuuid) missing.push("Link your Riot account on your profile.");
    if (!user.playerProfile?.valorantRoles?.length) {
      missing.push("Select at least one Valorant role on your profile.");
    }
  }

  if (slug === GameSlug.CS2) {
    if (!user.steamId64) missing.push("Link your Steam account on your profile.");
  }

  if (slug === GameSlug.EA_FC26) {
    if (!user.dateOfBirth) missing.push("Add your date of birth on your profile.");
    if (!user.olympusId?.trim()) missing.push("Add your Olympus ID on your profile.");
  }

  return missing;
}

async function getValorantRankSnapshot(userId: string): Promise<{
  tier: string | null;
  tierId: number | null;
  mmr: number | null;
  peakTier: string | null;
  peakTierId: number | null;
}> {
  let entry = await prisma.leaderboardEntry.findFirst({
    where: { userId, game: "VALORANT", scope: "TOWN" },
  });

  if (!entry?.mmr) {
    await syncUserRank(userId, {
      tryAllRegions: true,
      context: { source: "registration" },
    }).catch(() => {});
    entry = await prisma.leaderboardEntry.findFirst({
      where: { userId, game: "VALORANT", scope: "TOWN" },
    });
  }

  return {
    tier: entry?.rankTier ?? null,
    tierId: entry?.rankTierId ?? null,
    mmr: entry?.mmr ?? null,
    peakTier: entry?.peakRankTier ?? null,
    peakTierId: entry?.peakRankTierId ?? null,
  };
}

function isAllowedResumeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return parsed.pathname.includes("listing-applications/");
  } catch {
    return false;
  }
}

async function buildApplicantProfile(
  listing: { type: "JOB" | "ROSTER_TRYOUT"; gameKey: string | null },
  user: {
    email: string | null;
    phone: string | null;
    name: string | null;
    dateOfBirth: Date | null;
    riotGameName: string | null;
    riotTagLine: string | null;
    steamId64: string | null;
    steamPersonaName: string | null;
    cs2HoursPlayed: number | null;
    playerProfile: {
      displayName: string;
      town: string;
      valorantRoles: ValorantRole[];
      cs2PeakPremierRank: string | null;
      cs2FaceitRank: string | null;
    } | null;
  },
  userId: string,
): Promise<ListingApplicantProfile> {
  const base: ListingApplicantProfile = {
    displayName: user.playerProfile?.displayName ?? user.name,
    email: user.email,
    phone: user.phone,
    town: user.playerProfile?.town ?? null,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
    riotId: null,
    rankTier: null,
    valorantRoles: [],
    steamId64: null,
    steamPersonaName: null,
    cs2PeakPremier: null,
    cs2FaceitRank: null,
    cs2Hours: null,
    rankMmr: null,
  };

  if (listing.type !== "ROSTER_TRYOUT" || !listing.gameKey) {
    return base;
  }

  const slug = gameKeyToSlug(listing.gameKey);
  if (slug === GameSlug.VALORANT) {
    const rank = await getValorantRankSnapshot(userId);
    return {
      ...base,
      riotId:
        user.riotGameName && user.riotTagLine
          ? `${user.riotGameName}#${user.riotTagLine}`
          : null,
      rankTier: rank.tier,
      rankMmr: rank.mmr,
      valorantRoles: user.playerProfile?.valorantRoles ?? [],
    };
  }

  if (slug === GameSlug.CS2) {
    return {
      ...base,
      steamId64: user.steamId64,
      steamPersonaName: user.steamPersonaName,
      cs2PeakPremier: user.playerProfile?.cs2PeakPremierRank?.trim() || "NA",
      cs2FaceitRank: user.playerProfile?.cs2FaceitRank?.trim() || "NA",
      cs2Hours: user.cs2HoursPlayed,
    };
  }

  return base;
}

export async function getListingEligibility(
  slug: string,
  userId: string,
): Promise<ListingEligibility | null> {
  await syncTryoutListingStatus();

  const listing = await prisma.listing.findUnique({ where: { slug } });
  if (!listing || listing.status === "DRAFT") return null;
  if (listing.type === "JOB" && listing.status !== "OPEN") return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });
  if (!user) return null;

  const missing: string[] = [];

  if (!user.emailVerified || !user.signupCompleted) {
    missing.push("Complete signup before applying.");
  }

  if (listing.type === "ROSTER_TRYOUT") {
    if (!isTryoutApplicationLive(listing)) {
      const window = advanceTryoutWindow(listing);
      if (window && Date.now() < window.opensAt.getTime()) {
        const openLabel = window.opensAt.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        });
        missing.push(`Tryouts open on ${openLabel}. Check back then.`);
      } else {
        missing.push("Tryouts are not open right now.");
      }
    }

    if (listing.gameKey) {
      missing.push(...validateGeneralProfileForTryout(user));
      missing.push(...validateTryoutGameProfile(listing.gameKey, user));
    }
  }

  const profile = await buildApplicantProfile(listing, user, userId);

  let rankIneligible = false;
  if (
    listing.type === "ROSTER_TRYOUT" &&
    missing.length === 0 &&
    gameKeyToSlug(listing.gameKey) === GameSlug.VALORANT
  ) {
    const rank = await getValorantRankSnapshot(userId);
    rankIneligible = !meetsValorantTryoutRank(rank.tierId, rank.peakTierId);
  }

  return {
    canApply: missing.length === 0 && !rankIneligible,
    missing,
    rankIneligible,
    displayName: profile.displayName,
    profile,
  };
}

export async function applyToListing(
  slug: string,
  userId: string,
  input: ListingApplyInput,
): Promise<{ ok: true; applicationId: string } | { ok: false; error: string }> {
  const listing = await prisma.listing.findUnique({
    where: { slug },
    include: { formFields: { orderBy: { sortOrder: "asc" } } },
  });
  if (!listing || listing.status === "DRAFT") {
    return { ok: false, error: "This listing is not open." };
  }
  if (listing.type === "JOB" && listing.status !== "OPEN") {
    return { ok: false, error: "This listing is not open." };
  }
  if (listing.type === "ROSTER_TRYOUT" && !isTryoutApplicationLive(listing)) {
    return { ok: false, error: "Tryouts are not open right now." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });

  if (!user) {
    return { ok: false, error: "Account not found." };
  }

  if (!user.emailVerified || !user.signupCompleted) {
    return { ok: false, error: "Complete signup before applying." };
  }

  if (listing.type === "ROSTER_TRYOUT" && listing.gameKey) {
    const missing = [
      ...validateGeneralProfileForTryout(user),
      ...validateTryoutGameProfile(listing.gameKey, user),
    ];
    if (missing.length > 0) {
      return { ok: false, error: missing[0] };
    }
    if (gameKeyToSlug(listing.gameKey) === GameSlug.VALORANT) {
      const rank = await getValorantRankSnapshot(userId);
      if (!meetsValorantTryoutRank(rank.tierId, rank.peakTierId)) {
        return { ok: false, error: TRYOUT_RANK_INELIGIBLE_MESSAGE };
      }
    }
  }

  const existing = await prisma.listingApplication.findUnique({
    where: { listingId_userId: { listingId: listing.id, userId } },
  });
  if (existing) {
    return { ok: false, error: "You have already applied to this listing." };
  }

  const formFields = listing.formFields.map(mapListingFormField);
  const validated =
    listing.type === "ROSTER_TRYOUT"
      ? { ok: true as const, responses: {} as Record<string, string | string[]>, message: null }
      : formFields.length > 0
        ? validateListingResponses(formFields, input.responses)
        : {
            ok: true as const,
            responses: {} as Record<string, string | string[]>,
            message: input.message?.trim() || null,
          };

  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const slugGame = gameKeyToSlug(listing.gameKey);
  let snapshotRankTier: string | null = null;
  let snapshotRankTierId: number | null = null;
  let snapshotValorantRoles: ValorantRole[] | null = null;

  if (slugGame === GameSlug.VALORANT) {
    const rank = await getValorantRankSnapshot(userId);
    snapshotRankTier = rank.tier;
    snapshotRankTierId = rank.tierId;
    snapshotValorantRoles = user.playerProfile?.valorantRoles ?? [];
  }

  const pastExperience =
    listing.type === "ROSTER_TRYOUT" ? input.pastExperience?.trim() || null : null;
  const resumeUrl =
    listing.type === "ROSTER_TRYOUT" && input.resumeUrl?.trim()
      ? input.resumeUrl.trim()
      : null;
  if (resumeUrl && !isAllowedResumeUrl(resumeUrl)) {
    return { ok: false, error: "Invalid resume upload." };
  }

  try {
    const app = await prisma.listingApplication.create({
      data: {
        listingId: listing.id,
        userId,
        message: validated.message,
        responses: Object.keys(validated.responses).length > 0 ? validated.responses : undefined,
        snapshotDisplayName: user.playerProfile?.displayName ?? user.name,
        snapshotPhone: user.phone,
        snapshotRiotId:
          user.riotGameName && user.riotTagLine
            ? `${user.riotGameName}#${user.riotTagLine}`
            : null,
        snapshotRankTier,
        snapshotRankTierId,
        snapshotValorantRoles: snapshotValorantRoles ?? undefined,
        snapshotSteamId64: user.steamId64,
        snapshotCs2Hours: user.cs2HoursPlayed,
        snapshotCs2PeakPremier: user.playerProfile?.cs2PeakPremierRank?.trim() || "NA",
        snapshotCs2FaceitRank: user.playerProfile?.cs2FaceitRank?.trim() || "NA",
        snapshotOlympusId: user.olympusId,
        snapshotDateOfBirth: user.dateOfBirth,
        pastExperience,
        resumeUrl,
        status: "PENDING",
      },
    });

    await logUserActivity({
      userId,
      email: user.email,
      name: user.name,
      action: "LISTING_APPLY",
      target: slug,
      details: `Applied to listing "${listing.title}".`,
    });

    return { ok: true, applicationId: app.id };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return { ok: false, error: "You have already applied to this listing." };
    }
    throw e;
  }
}
