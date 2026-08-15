import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@core/auth/session";
import { getListingBySlug, getListingEligibility } from "@roster-listings/index";
import ListingApplyForm from "@/components/platform/listings/ListingApplyForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  return { title: listing ? listing.title : "Listing" };
}

export default async function ListingDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  const userId = session?.user?.id;
  const listing = await getListingBySlug(slug, userId);
  if (!listing) notFound();

  const eligibility = userId ? await getListingEligibility(slug, userId) : null;

  const typeLabel = listing.type === "JOB" ? "Job" : "Team tryout";
  const orgLabel = listing.type === "JOB" ? "NTG Lounge Operations" : "NTG Esports";

  const isTryout = listing.type === "ROSTER_TRYOUT";
  const profileIncomplete = Boolean(
    userId && eligibility && !eligibility.canApply && !eligibility.rankIneligible,
  );
  const navLabel = isTryout ? "Tryouts" : "Application";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6 lg:max-w-4xl">
      <nav className="text-xs text-white/35">
        <Link href="/listings" className="hover:text-white/60">
          Listings
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/50">{navLabel}</span>
      </nav>

      <header className="mt-6 mb-10 border-b border-white/[0.08] pb-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              listing.type === "JOB"
                ? "bg-amber-500/15 text-amber-300"
                : "bg-cyan-500/15 text-cyan-300"
            }`}
          >
            {typeLabel}
          </span>
          {listing.gameLabel ? (
            <span className="text-[10px] uppercase tracking-wider text-white/35">{listing.gameLabel}</span>
          ) : null}
        </div>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{listing.title}</h1>
        <p className="mt-2 text-sm text-white/45">{orgLabel}</p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">About this opportunity</h2>
        <article className="rounded-[1.35rem] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          {listing.description ? (
            <p className="text-sm leading-relaxed text-white/65 whitespace-pre-wrap">{listing.description}</p>
          ) : (
            <p className="text-sm text-white/45">No additional details provided.</p>
          )}
        </article>
      </section>

      <section>
        <ListingApplyForm
          key={listing.slug}
          listing={listing}
          isTryout={isTryout}
          isLoggedIn={Boolean(userId)}
          profileIncomplete={profileIncomplete}
          eligibility={eligibility}
        />
      </section>
    </div>
  );
}
