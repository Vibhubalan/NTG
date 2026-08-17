import type { ListingApplicantProfile } from "@core/contracts/roster-listings";

const readOnlyClass =
  "w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white/70";

type Props = {
  listingType: "JOB" | "ROSTER_TRYOUT";
  gameKey: string | null;
  profile: ListingApplicantProfile;
  variant?: "apply" | "review";
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</p>
      <div className={readOnlyClass}>{value}</div>
    </div>
  );
}

export default function ListingProfileSnapshot({
  listingType,
  gameKey,
  profile,
  variant = "apply",
}: Props) {
  const isTryout = listingType === "ROSTER_TRYOUT";
  const isValorant = isTryout && gameKey === "valorant";
  const isCs2 = isTryout && gameKey === "cs2";

  return (
    <div className="space-y-4 rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/85 p-6 sm:p-8">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">
          {variant === "review" ? "Applicant profile" : "Your profile"}
        </p>
        <p className="mt-2 text-sm text-white/45">
          {variant === "review"
            ? "Snapshot from their NTG account at time of application."
            : "From your profile. Update it if anything looks wrong."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" value={profile.displayName} />
        <Field label="Email" value={profile.email} />
        <Field label="Phone" value={profile.phone} />
        <Field label="Town" value={profile.town} />
        {!isTryout ? <Field label="Date of birth" value={profile.dateOfBirth} /> : null}

        {isValorant ? (
          <>
            <Field label="Riot ID" value={profile.riotId} />
            <Field label="Current rank" value={profile.rankTier} />
            <Field
              label="MMR"
              value={profile.rankMmr != null ? String(Math.round(profile.rankMmr)) : null}
            />
            <div className="sm:col-span-2">
              <Field
                label="Valorant roles"
                value={profile.valorantRoles.length > 0 ? profile.valorantRoles.join(", ") : null}
              />
            </div>
          </>
        ) : null}

        {isCs2 ? (
          <>
            <Field label="Steam ID" value={profile.steamId64} />
            <Field label="Steam name" value={profile.steamPersonaName} />
            <Field
              label="Peak Premier rank"
              value={profile.cs2PeakPremier?.trim() ? profile.cs2PeakPremier : "NA"}
            />
            <Field
              label="FACEIT rank"
              value={profile.cs2FaceitRank?.trim() ? profile.cs2FaceitRank : "NA"}
            />
            <Field
              label="CS2 hours played"
              value={profile.cs2Hours != null ? String(Math.round(profile.cs2Hours)) : null}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
