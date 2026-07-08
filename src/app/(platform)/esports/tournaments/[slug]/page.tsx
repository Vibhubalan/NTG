import { notFound } from "next/navigation";
import TournamentDetailView from "@/components/platform/TournamentDetailView";
import { fetchChallongeBracket } from "@/lib/challonge-api";
import { getSession } from "@core/auth/session";
import { requireAdmin } from "@core/auth/require-admin";
import { getTournamentDetail, getRegistrationEligibility } from "@tournaments-leagues/index";
import { serverEnv } from "@core/config/env.server";
import { auctionLink } from "@/lib/auction-link";

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
  // Admins can always enter; players enter only while IN_PROGRESS, see it disabled once COMPLETED.
  const auctionHref = auctionEligible
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
      />
      {auctionHref ? (
        <div className="mt-16 text-center">
          <a
            href={auctionHref}
            className="cta inline-flex rounded-full px-8 py-3 text-xs font-semibold uppercase tracking-[0.18em]"
          >
            Enter Auction
          </a>
        </div>
      ) : auctionEnded ? (
        <div className="mt-16 text-center">
          <span
            aria-disabled
            className="inline-flex cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-8 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/40"
          >
            Auction Ended
          </span>
        </div>
      ) : null}
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
