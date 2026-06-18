import { notFound } from "next/navigation";
import TournamentDetailView from "@/components/platform/TournamentDetailView";
import { fetchChallongeBracket } from "@/lib/challonge-api";
import { getSession } from "@core/auth/session";
import { requireAdmin } from "@core/auth/require-admin";
import { getTournamentDetail, getRegistrationEligibility } from "@tournaments-leagues/index";

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

  return (
    <>
      <TournamentDetailView
        tournament={tournament}
        bracket={bracket}
        isLoggedIn={!!userId}
        registrationPreview={registrationPreview}
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
