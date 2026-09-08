"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ListingDetail,
  ListingEligibility,
  ListingFormResponses,
} from "@core/contracts/roster-listings";
import { isListingInputField } from "@/modules/roster-listings/domain/listing-form";
import RegistrationTermsAgreement from "@/components/platform/RegistrationTermsAgreement";
import ListingFormFields from "@/components/platform/listings/ListingFormFields";
import ListingProfileSnapshot from "@/components/platform/listings/ListingProfileSnapshot";

type Props = {
  listing: ListingDetail;
  isTryout: boolean;
  isLoggedIn: boolean;
  profileIncomplete: boolean;
  eligibility: ListingEligibility | null;
};

function isEmptyResponse(value: ListingFormResponses[string] | undefined): boolean {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function hasRequiredInput(
  fields: ListingDetail["formFields"],
  responses: ListingFormResponses,
): boolean {
  const required = fields.filter((f) => f.required && isListingInputField(f.fieldType));
  if (required.length === 0) return true;
  return required.every((f) => !isEmptyResponse(responses[f.id]));
}

export default function ListingApplyForm({
  listing,
  isTryout,
  isLoggedIn,
  profileIncomplete,
  eligibility,
}: Props) {
  const router = useRouter();
  const [responses, setResponses] = useState<ListingFormResponses>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pastExperience, setPastExperience] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const isJob = !isTryout && listing.type === "JOB";
  const canSubmit = isTryout || hasRequiredInput(listing.formFields, responses);
  const profile = eligibility?.profile ?? null;

  function updateField(
    fieldId: string,
    value: string | string[] | Record<string, string | string[]>,
  ) {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
  }

  if (listing.userApplied || success) {
    return (
      <div className="rounded-[1.35rem] border border-[var(--color-brand)]/25 bg-[var(--color-brand)]/[0.06] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)]/10">
          <svg className="h-6 w-6 text-[var(--color-brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-display text-lg font-medium text-white">
          {isTryout ? "You're in the tryout pool" : "Application submitted"}
        </p>
        <p className="mt-1 text-sm text-white/45">
          {isTryout
            ? "We've saved your profile snapshot. NTG staff will review and reach out."
            : "We will review your application and get back to you."}
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/80 p-8">
        <p className="text-sm text-white/55">
          {isTryout
            ? "Log in or create an NTG account to join tryouts."
            : "Log in or create an NTG account to apply."}
        </p>
        <Link
          href={`/login?callbackUrl=/careers/${listing.slug}`}
          className="cta mt-4 inline-flex w-full items-center justify-center rounded-full py-3 text-xs font-semibold uppercase tracking-[0.18em]"
        >
          Continue
        </Link>
      </div>
    );
  }

  if (profileIncomplete) {
    const profileHref = isTryout ? "/profile?tab=games" : "/profile";
    const missing = eligibility?.missing ?? [];
    return (
      <div className="rounded-[1.35rem] border border-amber-500/20 bg-amber-500/[0.04] p-6 sm:p-8 space-y-4">
        <p className="text-sm font-medium text-amber-100/90">
          {isTryout
            ? "Complete your profile before joining tryouts"
            : "Complete your profile before applying"}
        </p>
        <p className="text-xs text-white/45">
          {isTryout
            ? "There are pending actions before you can apply. Complete the items below, then return and tap Join tryouts."
            : "Update your profile with the missing details, then return to submit your application."}
        </p>
        <ul className="space-y-2">
          {missing.map((m) => (
            <li
              key={m}
              className="rounded-xl border border-white/[0.08] bg-[#0a1020]/60 px-4 py-3 text-sm text-amber-200/85"
            >
              {m}
            </li>
          ))}
        </ul>
        {isTryout && listing.gameKey === "cs2" ? (
          <p className="text-xs leading-relaxed text-white/45">
            <span className="font-medium text-amber-200/80">Note:</span> CS2 Faceit and Premier ranks
            default to NA. Enter your ranks on your profile under Games only if you want them included.
          </p>
        ) : null}
        <Link
          href={profileHref}
          className="cta inline-flex w-full items-center justify-center rounded-full py-3 text-xs font-semibold uppercase tracking-[0.16em]"
        >
          {isTryout ? "Open profile & fix details" : "Go to profile"}
        </Link>
      </div>
    );
  }

  if (isTryout && eligibility?.rankIneligible) {
    return (
      <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/80 p-8 text-center">
        <p className="font-display text-lg font-medium text-white">Not eligible for rank criteria</p>
      </div>
    );
  }

  async function uploadResume(file: File) {
    setUploadingResume(true);
    setResumeError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/listings/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setResumeError(data.error ?? "Upload failed.");
        return;
      }
      setResumeUrl(typeof data.url === "string" ? data.url : "");
    } catch {
      setResumeError("Upload failed.");
    } finally {
      setUploadingResume(false);
    }
  }

  async function submit() {
    if (loading || !acceptedTerms || !canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/listings/${listing.slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isTryout
            ? {
                pastExperience: pastExperience.trim() || undefined,
                resumeUrl: resumeUrl || undefined,
              }
            : { responses }),
          acceptedTerms: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? (isTryout ? "Could not join tryouts." : "Application failed."));
        setLoading(false);
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/85 p-6 sm:p-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">
          {isTryout ? "Tryouts" : "Application"}
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-white">
          {isTryout ? "Join tryouts" : isJob ? "Apply for this role" : "Submit your application"}
        </h2>
        {isTryout && listing.gameKey === "cs2" ? (
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            <span className="font-medium text-amber-200/90">Important:</span> CS2 Faceit and Premier
            ranks default to <span className="text-white/70">NA</span> if you have not set them. To
            share your actual ranks, enter them on your profile under Games before joining.
          </p>
        ) : null}
      </div>

      {profile ? (
        <ListingProfileSnapshot
          listingType={listing.type}
          gameKey={listing.gameKey}
          profile={profile}
        />
      ) : null}

      <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/85 p-6 sm:p-8">
        {!isTryout ? (
          <ListingFormFields
            fields={listing.formFields}
            values={responses}
            onChange={updateField}
            disabled={loading}
          />
        ) : (
          <div className="space-y-6">
            <div>
              <label htmlFor="tryout-experience" className="mb-1.5 block text-sm font-medium text-white/85">
                Past experience
                <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-white/35">
                  Optional
                </span>
              </label>
              <textarea
                id="tryout-experience"
                value={pastExperience}
                onChange={(e) => setPastExperience(e.target.value)}
                disabled={loading}
                rows={8}
                maxLength={4000}
                placeholder="Tell us about your past experience, if any."
                className="min-h-[10rem] w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-white/85">
                Resume
                <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-white/35">
                  Optional
                </span>
              </p>
              <p className="text-xs text-white/35">PDF, Word, Excel, or images. Max 15 MB.</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                disabled={loading || uploadingResume}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadResume(file);
                }}
                className="block w-full text-sm text-white/55 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white/80"
              />
              {resumeUrl ? (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[var(--color-brand)] hover:underline"
                >
                  View uploaded file
                </a>
              ) : null}
              {uploadingResume ? <p className="text-xs text-white/40">Uploading…</p> : null}
              {resumeError ? <p className="text-xs text-red-400/90">{resumeError}</p> : null}
            </div>
          </div>
        )}

        <div className={`space-y-5 ${isTryout || listing.formFields.length > 0 ? "mt-10 border-t border-white/[0.08] pt-8" : ""}`}>
          <RegistrationTermsAgreement
            checked={acceptedTerms}
            onChange={setAcceptedTerms}
            rulebookUrl={listing.rulebookUrl}
            eventType={isTryout ? "tryout" : "cup"}
            disabled={loading}
          />

          <button
            type="button"
            onClick={submit}
            disabled={loading || uploadingResume || !acceptedTerms || !canSubmit}
            className="cta w-full rounded-full py-3.5 text-xs font-semibold uppercase tracking-[0.18em] disabled:opacity-50"
          >
            {loading
              ? isTryout
                ? "Joining…"
                : "Submitting…"
              : isTryout
                ? "Join tryouts"
                : "Submit application"}
          </button>

          {error ? <p className="text-sm text-red-400/90">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
