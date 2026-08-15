"use client";

import { useState } from "react";
import type { AdminListingApplicationRow } from "@roster-listings/index";
import type { ListingApplicantProfile, ListingFormFieldView, ListingFormResponses } from "@core/contracts/roster-listings";
import { useAdminDeleteConfirm } from "@/components/admin/useAdminDeleteConfirm";
import ListingProfileSnapshot from "@/components/platform/listings/ListingProfileSnapshot";
import ListingFormFieldsReadOnly from "@/components/platform/listings/ListingFormFieldsReadOnly";

type Props = {
  application: AdminListingApplicationRow;
  formFields: ListingFormFieldView[];
  listingType: "JOB" | "ROSTER_TRYOUT";
  listingTitle: string;
  gameKey: string | null;
  onClose: () => void;
  onDeleted: () => void;
};

function applicationToProfile(application: AdminListingApplicationRow): ListingApplicantProfile {
  return {
    displayName: application.displayName,
    email: application.email,
    phone: application.phone,
    town: application.town,
    dateOfBirth: application.dateOfBirth,
    riotId: application.riotId,
    rankTier: application.rankTier,
    rankMmr: null,
    valorantRoles: application.valorantRoles
      ? application.valorantRoles.split(",").map((r) => r.trim()).filter(Boolean)
      : [],
    steamId64: application.steamId64,
    steamPersonaName: application.steamPersonaName,
    cs2PeakPremier: application.cs2PeakPremier,
    cs2FaceitRank: application.cs2FaceitRank,
    cs2Hours: application.cs2Hours,
  };
}

export default function AdminListingApplicationView({
  application,
  formFields,
  listingType,
  listingTitle,
  gameKey,
  onClose,
  onDeleted,
}: Props) {
  const { openDeleteConfirm, DeleteConfirmDialog } = useAdminDeleteConfirm();
  const [error, setError] = useState<string | null>(null);

  const isJob = listingType === "JOB";
  const profile = applicationToProfile(application);
  const responses: ListingFormResponses = application.responses ?? {};
  const applicantName = application.displayName ?? "this applicant";

  function requestDelete() {
    openDeleteConfirm({
      title: `Delete ${applicantName}'s application?`,
      description:
        "This permanently removes their submission from this listing. They may apply again if the listing is still open.",
      confirmLabel: "Delete application",
      onConfirm: async () => {
        setError(null);
        const res = await fetch(`/api/admin/listings/applications/${application.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Delete failed.");
          throw new Error(data.error ?? "Delete failed.");
        }
        onDeleted();
      },
    });
  }

  return (
    <div className="space-y-6">
      {DeleteConfirmDialog}

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold uppercase tracking-wider text-white/40 hover:text-white/70"
        >
          ← Back to applicants
        </button>
        <div className="flex items-center gap-3">
          <p className="text-xs text-white/30">
            Submitted {new Date(application.createdAt).toLocaleString()}
          </p>
          <button
            type="button"
            onClick={requestDelete}
            className="rounded-lg border border-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
          >
            Delete application
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400/90">{error}</p> : null}

      <div className="mx-auto max-w-3xl space-y-8">
        <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/85 p-6 sm:p-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">
            Application
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white">{listingTitle}</h2>
          <p className="mt-2 text-sm text-white/50">
            {application.displayName ?? "Applicant"}
            {application.email ? ` · ${application.email}` : ""}
          </p>
          <p className="mt-1 text-xs text-white/35">
            {isJob ? "Job application" : "Team tryout application"} — read-only review
          </p>
        </div>

        <ListingProfileSnapshot
          listingType={listingType}
          gameKey={gameKey}
          profile={profile}
          variant="review"
        />

        {!isJob && (application.pastExperience || application.resumeUrl) ? (
          <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/85 p-6 sm:p-8 space-y-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">
              Additional details
            </p>
            {application.pastExperience ? (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
                  Past experience
                </p>
                <p className="whitespace-pre-wrap text-sm text-white/75">{application.pastExperience}</p>
              </div>
            ) : null}
            {application.resumeUrl ? (
              <a
                href={application.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm text-[var(--color-brand)] hover:underline"
              >
                View resume
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/85 p-6 sm:p-8">
          {formFields.length > 0 ? (
            <ListingFormFieldsReadOnly fields={formFields} values={responses} />
          ) : application.message ? (
            <div>
              <p className="mb-2 text-sm font-medium text-white/85">Message</p>
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-white/90 whitespace-pre-wrap">
                {application.message}
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/45">No form responses recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
