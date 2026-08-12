import PlatformHeader from "@/components/platform/shell/PlatformHeader";
import ListingsBoard from "@/components/platform/listings/ListingsBoard";
import { listOpenListings } from "@roster-listings/index";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunities",
};

type Props = {
  searchParams: Promise<{ type?: string }>;
};

export default async function ListingsPage({ searchParams }: Props) {
  const { type } = await searchParams;
  const listings = await listOpenListings();

  return (
    <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(94,234,212,0.07),transparent_70%)]"
      />
      <div className="relative">
        <PlatformHeader
          eyebrow="Work & compete"
          title="Opportunities"
          subtitle="Open jobs and team tryouts at NTG. Tap a card to see full details and apply."
        />
        <ListingsBoard listings={listings} initialType={type ?? null} />
      </div>
    </div>
  );
}
