import { notFound } from "next/navigation";
import TournamentDetailView from "@/components/platform/TournamentDetailView";
import { fetchChallongeBracket } from "@/lib/challonge-api";
import { normalizeBracketUrlItems } from "@/lib/challonge";
import { getSession } from "@core/auth/session";
import { requireAdmin } from "@core/auth/require-admin";
import {
  getTournamentDetail,
  getRegistrationEligibility,
  getValorantRegistrationProfileCard,
} from "@tournaments-leagues/index";
import { auctionLink } from "@/lib/auction-link";
import { resolveEffectivePublicAuction } from "@tournaments-leagues/domain/auction-hero-phase";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  const t = await getTournamentDetail(slug, session?.user?.id);
  return { title: t ? t.name : "Tournament" };
}

export default async function TournamentDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  const userId = session?.user?.id;
  const tournament = await getTournamentDetail(slug, userId);
  if (!tournament) notFound();
  const isCompleted = tournament.status === "COMPLETED";
  const bracketItems = normalizeBracketUrlItems({
    bracketUrl: tournament.bracketUrl,
    bracketUrls: tournament.bracketUrls,
  });

  const [brackets, admin, registrationPreview, registrationProfileCard] = await Promise.all([
    bracketItems.length
      ? Promise.all(
          bracketItems.map(async (item) => ({
            url: item.url,
            name: item.name ?? null,
            isFinal: item.isFinal !== false,
            bracket: await fetchChallongeBracket(item.url, isCompleted),
          })),
        )
      : Promise.resolve([]),
    requireAdmin(),
    userId ? getRegistrationEligibility(slug, userId) : Promise.resolve(null),
    userId && tournament.game === "VALORANT" && tournament.userRegistered
      ? getValorantRegistrationProfileCard(slug, userId)
      : Promise.resolve(null),
  ]);

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
    tournament.registrationFormat === "AUCTION" &&
    !!userId;
  const showEnterButton =
    tournament.registrationFormat === "AUCTION" &&
    (admin.ok || (auctionEligible && publicAuction));
  const auctionHref =
    showEnterButton && userId
      ? auctionLink(tournament.slug, auctionView)
      : null;
  const auctionEnded =
    auctionEligible && !admin.ok && tournament.status === "COMPLETED";

  return (
    <>
      <TournamentDetailView
        tournament={tournament}
        brackets={brackets}
        isLoggedIn={!!userId}
        registrationPreview={registrationPreview}
        registrationProfileCard={registrationProfileCard}
        auctionHref={auctionHref}
        auctionEnded={auctionEnded}
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
