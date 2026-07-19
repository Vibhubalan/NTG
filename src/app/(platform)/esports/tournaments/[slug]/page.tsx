import { notFound } from "next/navigation";
import TournamentDetailView from "@/components/platform/TournamentDetailView";
import { fetchChallongeBracket } from "@/lib/challonge-api";
import { getSession } from "@core/auth/session";
import { requireAdmin } from "@core/auth/require-admin";
import { getTournamentDetail, getRegistrationEligibility, getValorantRegistrationProfileCard } from "@tournaments-leagues/index";
import { serverEnv } from "@core/config/env.server";
import { auctionLink } from "@/lib/auction-link";
import { prisma } from "@core/database/client";
import { resolveEffectivePublicAuction } from "@tournaments-leagues/domain/auction-hero-phase";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const t = await getTournamentDetail(slug);
  return { title: t ? t.name : "Tournament" };
}

export default async function TournamentDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  const userId = session?.user?.id;
  const raw = await getTournamentDetail(slug, userId);
  if (!raw) notFound();
  const tournament = raw;
  const bracket = tournament.bracketUrl
    ? await fetchChallongeBracket(tournament.bracketUrl)
    : null;

  const admin = await requireAdmin();
  const registrationPreview = userId
    ? await getRegistrationEligibility(slug, userId)
    : null;
  const registrationProfileCard =
    userId && raw.game === "VALORANT" && raw.userRegistered
      ? await getValorantRegistrationProfileCard(slug, userId)
      : null;

  // Fetch public status of the auction from the database
  const [dbRow] = await prisma.$queryRawUnsafe<{ publicAuction: boolean }[]>(
    'SELECT "publicAuction" FROM "Tournament" WHERE id = $1 LIMIT 1',
    tournament.id
  );
  const publicAuction = resolveEffectivePublicAuction(dbRow?.publicAuction ?? false, tournament);

  // Auction handoff: routes the user to the right screen; the auction app re-checks access server-side.
  const auctionView = admin.ok
    ? "auctioneer"
    : tournament.userParticipantRole === "CAPTAIN" || tournament.userParticipantRole === "CO_CAPTAIN"
      ? "captain"
      : "observe";
  const auctionEligible =
    tournament.registrationFormat === "AUCTION" &&
    !!userId &&
    !!serverEnv.auctionUrl &&
    !!serverEnv.auctionJwtSecret;
  // Admins can always enter, but only for tournaments that are actually auction-format.
  // Any logged-in main-site account sees the button if publicAuction is enabled by the
  // admin — they don't need to be registered for this specific tournament, since the
  // auction app grants them observer access regardless (only captains/admins get controls).
  const showEnterButton = tournament.registrationFormat === "AUCTION" && (admin.ok || (auctionEligible && publicAuction));
  const auctionHref = (showEnterButton && userId)
    ? auctionLink(tournament.id, auctionView, userId)
    : null;
  const auctionEnded = auctionEligible && !admin.ok && tournament.status === "COMPLETED";

  return (
    <>
      <TournamentDetailView
        tournament={tournament}
        bracket={bracket}
        isLoggedIn={!!userId}
        registrationPreview={registrationPreview}
        registrationProfileCard={registrationProfileCard}
        auctionHref={auctionHref}
        auctionEnded={auctionEnded}
      />
      {admin.ok ? (
        <div className="mt-16 border-t border-white/[0.06] pt-8 text-center">
          <a
            href={`/admin/tournaments/${slug}`}
            className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200 transition-colors hover:bg-amber-500/20"
          >
            Edit in admin →
          </a>
        </div>
      ) : null}
    </>
  );
}
