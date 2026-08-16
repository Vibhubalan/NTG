import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@core/auth/require-admin";
import { redirect } from "next/navigation";
import AdminListingDetailPanel from "@/components/admin/AdminListingDetailPanel";
import {
  getListingAdmin,
  listListingApplicationsAdmin,
  listListingFormFields,
  type AdminListingApplicationRow,
} from "@roster-listings/index";
import type { ListingFormFieldView } from "@core/contracts/roster-listings";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function asPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function safeIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  const time = value.getTime();
  if (Number.isNaN(time)) return null;
  return value.toISOString();
}

async function loadAdminApplications(slug: string): Promise<AdminListingApplicationRow[]> {
  try {
    return asPlain((await listListingApplicationsAdmin(slug)) ?? []);
  } catch (error) {
    console.error("[admin listings] applications failed to load", slug, error);
    return [];
  }
}

async function loadAdminFormFields(slug: string): Promise<ListingFormFieldView[]> {
  try {
    return asPlain((await listListingFormFields(slug)) ?? []);
  } catch (error) {
    console.error("[admin listings] form fields failed to load", slug, error);
    return [];
  }
}

export default async function AdminListingDetailPage({ params }: Props) {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/login");

  const { slug } = await params;
  const listing = await getListingAdmin(slug);
  if (!listing) notFound();

  const [applications, formFields] = await Promise.all([
    loadAdminApplications(slug),
    loadAdminFormFields(slug),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/listings" className="text-xs text-white/40 hover:text-white/70">
            ← All listings
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-white">{listing.title}</h1>
          <p className="mt-1 text-sm text-white/45 font-mono">/listings/{listing.slug}</p>
        </div>
        <a
          href={`/listings/${listing.slug}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04]"
        >
          View public page
        </a>
      </div>
      <AdminListingDetailPanel
        slug={slug}
        title={listing.title}
        listingType={listing.type === "JOB" ? "JOB" : "ROSTER_TRYOUT"}
        gameKey={listing.gameKey}
        initialDescription={listing.description}
        initialRulebookUrl={listing.rulebookUrl}
        initialAutoManageTryout={listing.autoManageTryout}
        initialTryoutOpensAt={safeIso(listing.tryoutOpensAt)}
        initialTryoutClosesAt={safeIso(listing.tryoutClosesAt)}
        initialTryoutOpenDays={listing.tryoutOpenDays}
        initialTryoutRepeatDays={listing.tryoutRepeatDays}
        initialFormFields={formFields}
        initialApplications={applications}
      />
    </div>
  );
}
