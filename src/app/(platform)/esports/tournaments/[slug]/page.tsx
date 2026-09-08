import { notFound } from "next/navigation";
import TournamentDetailView from "@/components/platform/TournamentDetailView";
import { normalizeBracketUrlItems } from "@/lib/challonge";
import { getSession } from "@core/auth/session";
import { requireAdmin } from "@core/auth/require-admin";
import {
  getTournamentBySlug,
  getTournamentDetail,
  getRegistrationEligibility,
  getValorantRegistrationProfileCard,
  listPublishedTournamentGames,
  listTournamentStatsEligibility,
} from "@tournaments-leagues/index";
import { tryAuctionLink } from "@/lib/auction-link";
import { resolveEffectivePublicAuction } from "@tournaments-leagues/domain/auction-hero-phase";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const t = await getTournamentBySlug(slug);
  return { title: t ? t.name : "Tournament" };
}

export default async function TournamentDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  const userId = session?.user?.id;
  const tournament = await getTournamentDetail(slug, userId);
  if (!tournament) notFound();

  // Bracket shells only — Challonge bodies load client-side (prefetch on mount / list hover).
  // Never await Challonge on the request path (keeps cup TTFB fast).
  const bracketItems = normalizeBracketUrlItems({
    bracketUrl: tournament.bracketUrl,
    bracketUrls: tournament.bracketUrls,
  });
  const brackets = bracketItems.map((item) => ({
    url: item.url,
    name: item.name ?? null,
    isFinal: item.isFinal !== false,
    bracket: null,
  }));

  // Matches + stats are DB-backed and key for the cup — load with the page shell.
  // Isolate failures so a games/stats query never 404s the whole cup.
  const [admin, registrationPreview, registrationProfileCard, publishedGamesResult, statsEligibility] =
    await Promise.all([
      requireAdmin(),
      userId
        ? getRegistrationEligibility(slug, userId).catch((error) => {
            console.error(`[tournament] registration eligibility failed for ${slug}:`, error);
            return null;
          })
        : Promise.resolve(null),
      userId && tournament.game === "VALORANT" && tournament.userRegistered
        ? getValorantRegistrationProfileCard(slug, userId).catch((error) => {
            console.error(`[tournament] registration profile card failed for ${slug}:`, error);
            return null;
          })
        : Promise.resolve(null),
      listPublishedTournamentGames(slug).catch(() => ({
        ok: false as const,
        error: "Failed to load games.",
      })),
      listTournamentStatsEligibility(slug).catch(() => ({
        byUserId: {},
        byRiotId: {},
      })),
    ]);

  const publishedGames = publishedGamesResult.ok ? publishedGamesResult.games : [];
  // Matches/Stats: Valorant only, and only when the cup actually has published games
  // (older cups before AUC IV typically have none — hide the tabs).
  const yourGamesEnabled =
    (publishedGamesResult.ok
      ? publishedGamesResult.yourGamesEnabled
      : tournament.yourGamesEnabled) ?? false;
  const showMatchesTab =
    tournament.game === "VALORANT" &&
    yourGamesEnabled &&
    publishedGames.length > 0;

  const publicAuction = resolveEffectivePublicAuction(
    tournament.publicAuction ?? false,
    tournament,
  );

  const auctionView = admin.ok
    ? "auctioneer"
    : tournament.userParticipantRole === "CAPTAIN" ||
        tournament.userParticipantRole === "CO_CAPTAIN"
      ? "captain"
      : "observe";
  const auctionEligible =
    tournament.registrationFormat === "AUCTION" && !!userId;
  const showEnterButton =
    tournament.registrationFormat === "AUCTION" &&
    (admin.ok || (auctionEligible && publicAuction));
  const auctionHref =
    showEnterButton && userId
      ? tryAuctionLink(tournament.id, auctionView, userId)
      : null;
  const auctionEnded =
    auctionEligible && !admin.ok && tournament.status === "COMPLETED";

  const myTeamNames = userId
    ? tournament.teamDetails
        .filter((team) => team.players.some((p) => p.userId === userId))
        .map((team) => team.name)
    : [];

  return (
    <>
      <TournamentDetailView
        tournament={tournament}
        brackets={brackets}
        isLoggedIn={!!userId}
        isAdmin={admin.ok}
        registrationPreview={registrationPreview}
        registrationProfileCard={registrationProfileCard}
        auctionHref={auctionHref}
        auctionEnded={auctionEnded}
        showMatchesTab={showMatchesTab}
        publishedGames={publishedGames}
        statsEligibility={statsEligibility}
        myTeamNames={myTeamNames}
      />
      {admin.ok ? (
        <div className="mt-16 border-t border-white/[0.06] pt-8 text-center">
          <a
            href={`/admin/tournaments/${tournament.slug}`}
            className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200 transition-colors hover:bg-amber-500/20"
          >
            Edit in admin →
          </a>
        </div>
      ) : null}
    </>
  );
}
