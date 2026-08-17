import {
  getHeroCupStatus,
  getHeroOpenCup,
  getLatestChampionCupDetail,
  getTournamentDetail,
} from "@tournaments-leagues/index";
import { resolveEffectivePublicAuction } from "@tournaments-leagues/domain/auction-hero-phase";
import { listOpenListings } from "@roster-listings/index";
import { getSession } from "@core/auth/session";
import { requireAdmin } from "@core/auth/require-admin";
import { isTransientPrismaConnectionError } from "@core/database/transient-error";
import { tryAuctionLink } from "@/lib/auction-link";
import { resolveChampion } from "@/lib/tournament-champion";
import { gameMetaFor } from "@/lib/tournament-display";
import { serverEnv } from "@core/config/env.server";
import { socials as siteSocials } from "@/lib/data";
import { siYoutube } from "simple-icons";
import type { TournamentPlacementView } from "@core/contracts";
import type { MvpData } from "@/components/platform/tournament/TournamentFinalResults";
import HeroCarousel from "@/components/hero/HeroCarousel";
import type { HeroCarouselData, HeroTournamentSlideData } from "@/components/hero/hero-carousel-types";

async function resolveHeroAuctionHref(slug: string): Promise<string | null> {
  const session = await getSession();
  const userId = session?.user?.id;
  const [tournament, admin] = await Promise.all([getTournamentDetail(slug, userId), requireAdmin()]);
  if (!tournament) return null;

  const publicAuction = resolveEffectivePublicAuction(tournament.publicAuction ?? false, tournament);

  const auctionEligible = tournament.registrationFormat === "AUCTION";
  const showEnterButton =
    tournament.registrationFormat === "AUCTION" && (admin.ok || (auctionEligible && publicAuction));
  if (!showEnterButton || !userId) return null;

  const auctionView = admin.ok
    ? "auctioneer"
    : tournament.userParticipantRole === "CAPTAIN" || tournament.userParticipantRole === "CO_CAPTAIN"
      ? "captain"
      : "observe";
  return tryAuctionLink(tournament.id, auctionView, userId);
}

function mvpFromPlacements(placements: TournamentPlacementView[]): MvpData | null {
  const mvpPlacement = placements.find((p) => p.role === "MVP");
  if (!mvpPlacement) return null;
  if (mvpPlacement.user) {
    return {
      displayName: mvpPlacement.displayName || mvpPlacement.user.username,
      userId: mvpPlacement.user.id,
      riotId: mvpPlacement.user.riotId,
      rankTier: mvpPlacement.user.rankTier,
      valorantRankTierId: mvpPlacement.user.rankTierId ?? null,
      riotPlayerCard: mvpPlacement.user.riotPlayerCard ?? null,
      riotPlayerCardWide: mvpPlacement.user.riotPlayerCardWide ?? null,
    };
  }
  if (mvpPlacement.teamLabel?.trim() || mvpPlacement.displayName?.trim()) {
    return { displayName: mvpPlacement.displayName || mvpPlacement.teamLabel || "MVP" };
  }
  return null;
}

async function resolveTournamentSlide(): Promise<HeroTournamentSlideData> {
  try {
    const heroCup = await getHeroCupStatus();
    if (heroCup) {
      const auctionHref =
        heroCup.phase === "auction_live" ? await resolveHeroAuctionHref(heroCup.slug) : null;
      return { mode: "status", cup: heroCup, auctionHref };
    }

    const openCup = await getHeroOpenCup();
    if (openCup) {
      return { mode: "open", banner: openCup };
    }

    const detail = await getLatestChampionCupDetail();
    if (!detail) return null;

    const championData = resolveChampion(null, detail.teamDetails, detail.teams, detail.placements);
    if (!championData) return null;

    const meta = gameMetaFor(detail.game);
    return {
      mode: "champions",
      tournamentName: detail.name,
      tournamentSlug: detail.slug,
      game: detail.game,
      accentHex: meta.hex,
      championData,
      mvp: mvpFromPlacements(detail.placements),
      allTeams: detail.teamDetails,
    };
  } catch (error) {
    if (!isTransientPrismaConnectionError(error)) throw error;
    console.warn("[hero] tournament slide skipped (database unreachable)");
    return null;
  }
}

export default async function Hero() {
  const [tournament, listings] = await Promise.all([resolveTournamentSlide(), listOpenListings()]);

  const socials = [
    ...siteSocials.filter(
      (s) => Boolean(s.href) && s.href !== "#" && /^https?:\/\//i.test(s.href),
    ),
    ...(serverEnv.youtubeChannelUrl
      ? [{ name: "YouTube", href: serverEnv.youtubeChannelUrl, path: siYoutube.path }]
      : []),
  ];

  const data: HeroCarouselData = {
    tournament,
    listings,
    socials,
  };

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 22% 28%, rgba(124,58,237,0.45), transparent 60%), radial-gradient(55% 45% at 78% 72%, rgba(34,211,238,0.32), transparent 60%), radial-gradient(40% 35% at 50% 100%, rgba(168,85,247,0.28), transparent 65%)",
        }}
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[var(--color-ink)] to-transparent" />
      </div>

      <div className="absolute inset-0 z-10">
        <HeroCarousel data={data} />
      </div>
    </section>
  );
}
