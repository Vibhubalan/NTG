"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GameSlug } from "@prisma/client";
import RegistrationTermsAgreement from "@/components/platform/RegistrationTermsAgreement";
import { profileRequirementFix } from "@/lib/profile-requirements";

export type RegistrationPreview = {
  displayName: string | null;
  email: string | null;
  phone: string | null;
  olympusId: string | null;
  dateOfBirth: string | null;
  riotId: string | null;
  steamId64: string | null;
  steamPersonaName: string | null;
  cs2HoursPlayed: number | null;
  valorantRoles: string[];
  cs2PeakPremierRank: string | null;
  cs2FaceitRank: string | null;
  valorantRankTier: string | null;
  canRegister: boolean;
  missing: string[];
};

type Props = {
  slug: string;
  game: GameSlug;
  registrationFormat?: string | null;
  isLoggedIn: boolean;
  alreadyRegistered: boolean;
  registrationOpen: boolean;
  rulebookUrl?: string | null;
  preview: RegistrationPreview | null;
  coCaptainSlots: number;
};

type Step = "role" | "captain" | "confirm";

function ProfilePreview({
  preview,
  game,
}: {
  preview: RegistrationPreview | null;
  game: GameSlug;
}) {
  if (!preview) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70">
      {preview.displayName ? (
        <p className="font-medium text-white/90">
          Username: <span className="text-[var(--color-brand)]/90">{preview.displayName}</span>
        </p>
      ) : null}
      {game === "EA_FC26" && preview.olympusId ? (
        <p className="text-white/45">Olympus: {preview.olympusId}</p>
      ) : null}
      {game === "VALORANT" && preview.riotId ? <p className="text-white/45">{preview.riotId}</p> : null}
      {game === "VALORANT" && preview.valorantRankTier ? (
        <p className="text-white/45">Rank: {preview.valorantRankTier}</p>
      ) : null}
      {game === "VALORANT" && preview.valorantRoles.length > 0 ? (
        <p className="text-white/45">Roles: {preview.valorantRoles.join(", ")}</p>
      ) : null}
      {game === "CS2" && preview.steamPersonaName ? (
        <p className="text-white/45">{preview.steamPersonaName}</p>
      ) : null}
      {game === "CS2" ? (
        <>
          <p className="text-white/45">Faceit: {preview.cs2FaceitRank ?? "NA"}</p>
          <p className="text-white/45">Peak premier: {preview.cs2PeakPremierRank ?? "NA"}</p>
          <Link href="/profile?tab=games" className="inline-block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-brand)]/80 hover:text-[var(--color-brand)]">
            Edit CS ranks in Game Accounts →
          </Link>
        </>
      ) : null}
    </div>
  );
}

export default function TournamentRegisterForm({
  slug,
  game,
  registrationFormat,
  isLoggedIn,
  alreadyRegistered,
  registrationOpen,
  rulebookUrl,
  preview,
  coCaptainSlots,
}: Props) {
  const router = useRouter();
  const submitting = useRef(false);
  const [step, setStep] = useState<Step>("role");
  const [participantRole, setParticipantRole] = useState<"CAPTAIN" | "PLAYER" | null>(null);
  const [teamName, setTeamName] = useState("");
  const [coCaptainUsernames, setCoCaptainUsernames] = useState<string[]>(
    () => Array.from({ length: coCaptainSlots }, () => ""),
  );
  const [memberUsernames, setMemberUsernames] = useState(["", "", "", ""]);
  const [partnerUsername, setPartnerUsername] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none";

  if (!registrationOpen) return null;

  if (!isLoggedIn) {
    return (
      <div className="shine-border rounded-[1.35rem]">
        <div className="shine-border-inner rounded-[1.35rem] bg-[#0a1020]/80 p-6 backdrop-blur-sm">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">Registration</p>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Log in or create an account to register for this cup.
          </p>
          <Link
            href={`/login?callbackUrl=/esports/tournaments/${slug}`}
            className="cta mt-5 inline-flex w-full items-center justify-center rounded-full py-3 text-xs font-semibold uppercase tracking-[0.18em]"
          >
            Continue
          </Link>
        </div>
      </div>
    );
  }

  if (alreadyRegistered || success) {
    return (
      <div className="rounded-[1.35rem] border border-[var(--color-brand)]/25 bg-[var(--color-brand)]/[0.06] p-6 text-center">
        <p className="font-display text-lg font-medium text-white">You&apos;re in</p>
        <p className="mt-1 text-sm text-white/45">See you on match day.</p>
      </div>
    );
  }

  if (preview && !preview.canRegister) {
    return (
      <div className="shine-border rounded-[1.35rem]">
        <div className="shine-border-inner space-y-4 rounded-[1.35rem] bg-[#0a1020]/85 p-6 backdrop-blur-sm">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">Registration</p>
          <p className="text-sm text-white/55">Complete your profile before registering:</p>
          <ul className="space-y-2">
            {preview.missing.map((m) => {
              const { href, cta } = profileRequirementFix(m);
              return (
                <li key={m}>
                  <Link
                    href={href}
                    className="group block rounded-xl border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 px-4 py-3 transition-all hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-brand)]/15"
                  >
                    <p className="text-sm text-white/65">{m}</p>
                    <p className="mt-1.5 text-xs font-semibold text-[var(--color-brand)] group-hover:underline">
                      {cta} →
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  async function submitDuoRegistration() {
    if (submitting.current || loading || !acceptedTerms) return;
    submitting.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tournaments/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: teamName.trim(),
          partnerUsername: partnerUsername.trim(),
          acceptedTerms: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        submitting.current = false;
        setLoading(false);
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      submitting.current = false;
      setLoading(false);
    }
  }

  async function submitStandardRegistration() {
    if (submitting.current || loading || !acceptedTerms) return;
    submitting.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tournaments/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: teamName.trim(),
          memberUsernames: memberUsernames.map((u) => u.trim()),
          acceptedTerms: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        submitting.current = false;
        setLoading(false);
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      submitting.current = false;
      setLoading(false);
    }
  }

  async function submitFifaRegistration() {
    return submitDuoRegistration();
  }

  async function submitRegistration() {
    if (submitting.current || loading || !participantRole || !acceptedTerms) return;
    submitting.current = true;
    setLoading(true);
    setError(null);

    try {
      const body =
        participantRole === "CAPTAIN"
          ? {
              participantRole,
              teamName: teamName.trim(),
              ...(coCaptainSlots > 0
                ? {
                    coCaptainUsernames: coCaptainUsernames
                      .slice(0, coCaptainSlots)
                      .map((u) => u.trim()),
                  }
                : {}),
              acceptedTerms: true,
            }
          : { participantRole, acceptedTerms: true };

      const res = await fetch(`/api/tournaments/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        submitting.current = false;
        setLoading(false);
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      submitting.current = false;
      setLoading(false);
    }
  }

  const standardMembersComplete = memberUsernames.every((u) => u.trim().length >= 2);

  if (game === "EA_FC26") {
    return (
      <div className="shine-border rounded-[1.35rem] lg:sticky lg:top-28">
        <div className="shine-border-inner space-y-4 rounded-[1.35rem] bg-[#0a1020]/85 p-6 backdrop-blur-sm">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">Register</p>
            <p className="mt-2 text-sm text-white/45">
              Register your 2v2 team. Your partner must have an NTG account. Add them by username.
            </p>
          </div>

          <ProfilePreview preview={preview} game={game} />

          <div className="space-y-3">
            <input
              className={inputClass}
              placeholder="Team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Partner username"
              value={partnerUsername}
              onChange={(e) => setPartnerUsername(e.target.value)}
            />
            <p className="text-xs text-white/40">
              Share your username ({preview?.displayName ?? "see profile"}) with your partner so they can find you too.
            </p>
            <RegistrationTermsAgreement
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
              rulebookUrl={rulebookUrl}
              disabled={loading}
            />
            <button
              type="button"
              onClick={submitFifaRegistration}
              disabled={loading || !teamName.trim() || !partnerUsername.trim() || !acceptedTerms}
              className="cta w-full rounded-full py-3 text-xs font-semibold uppercase tracking-[0.18em] disabled:opacity-50"
            >
              {loading ? "Registering…" : "Register team"}
            </button>
          </div>

          {error ? <p className="text-sm text-red-400/90">{error}</p> : null}
        </div>
      </div>
    );
  }

  if (registrationFormat === "STANDARD") {
    return (
      <div className="shine-border rounded-[1.35rem] lg:sticky lg:top-28">
        <div className="shine-border-inner space-y-4 rounded-[1.35rem] bg-[#0a1020]/85 p-6 backdrop-blur-sm">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">Register</p>
            <p className="mt-2 text-sm text-white/45">
              Register your full 5-player team. You are the captain — add 4 teammates by NTG username.
            </p>
          </div>

          <ProfilePreview preview={preview} game={game} />

          <div className="space-y-3">
            <input
              className={inputClass}
              placeholder="Team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">Teammates</p>
            {memberUsernames.map((username, index) => (
              <input
                key={index}
                className={inputClass}
                placeholder={`Teammate ${index + 1} username`}
                value={username}
                onChange={(e) => {
                  const next = [...memberUsernames];
                  next[index] = e.target.value;
                  setMemberUsernames(next);
                }}
              />
            ))}
            <p className="text-xs text-white/40">
              All teammates must be NTG members with complete game profiles
              {game === "CS2" ? " (Steam linked)" : game === "VALORANT" ? " (Riot ID linked)" : ""}.
            </p>
            <RegistrationTermsAgreement
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
              rulebookUrl={rulebookUrl}
              disabled={loading}
            />
            <button
              type="button"
              onClick={submitStandardRegistration}
              disabled={loading || !teamName.trim() || !standardMembersComplete || !acceptedTerms}
              className="cta w-full rounded-full py-3 text-xs font-semibold uppercase tracking-[0.18em] disabled:opacity-50"
            >
              {loading ? "Registering…" : "Register team"}
            </button>
          </div>

          {error ? <p className="text-sm text-red-400/90">{error}</p> : null}
        </div>
      </div>
    );
  }

  const captainCoCaptainsComplete =
    coCaptainSlots === 0 ||
    coCaptainUsernames.slice(0, coCaptainSlots).every((u) => u.trim().length >= 2);

  const captainCardDescription =
    coCaptainSlots === 0
      ? "Team name only"
      : coCaptainSlots === 1
        ? "Team name and co-captain"
        : `Team name and ${coCaptainSlots} co-captains`;

  return (
    <div className="shine-border rounded-[1.35rem] lg:sticky lg:top-28">
      <div className="shine-border-inner space-y-4 rounded-[1.35rem] bg-[#0a1020]/85 p-6 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">Register</p>
          <p className="mt-2 text-sm text-white/45">
            {step === "role" ? "Register as a team captain or join the player pool." : step === "captain" ? "Set up your team." : "Review and submit."}
          </p>
        </div>

        <ProfilePreview preview={preview} game={game} />

        {step === "role" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => { setParticipantRole("CAPTAIN"); setStep("captain"); }}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition-colors hover:border-[var(--color-brand)]/40"
            >
              <p className="text-sm font-semibold text-white">Captain</p>
              <p className="mt-1 text-xs text-white/40">{captainCardDescription}</p>
            </button>
            <button
              type="button"
              onClick={() => { setParticipantRole("PLAYER"); setStep("confirm"); }}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition-colors hover:border-[var(--color-brand)]/40"
            >
              <p className="text-sm font-semibold text-white">Player</p>
              <p className="mt-1 text-xs text-white/40">Join the pool. Admin assigns teams.</p>
            </button>
          </div>
        )}

        {step === "captain" && (
          <div className="space-y-3">
            <input className={inputClass} placeholder="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            {coCaptainSlots > 0 ? (
              <>
                {Array.from({ length: coCaptainSlots }, (_, index) => (
                  <input
                    key={index}
                    className={inputClass}
                    placeholder={
                      coCaptainSlots === 1
                        ? "Co-captain username"
                        : `Co-captain ${index + 1} username`
                    }
                    value={coCaptainUsernames[index] ?? ""}
                    onChange={(e) => {
                      const next = [...coCaptainUsernames];
                      next[index] = e.target.value;
                      setCoCaptainUsernames(next);
                    }}
                  />
                ))}
                <p className="text-xs text-white/40">
                  {coCaptainSlots === 1 ? "Your co-captain" : "Each co-captain"} must be an NTG member with a complete game profile
                  {game === "CS2" ? " (Steam linked)" : game === "VALORANT" ? " (Riot ID linked)" : ""}.
                </p>
              </>
            ) : null}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("role")} className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/50">Back</button>
              <button
                type="button"
                onClick={() => setStep("confirm")}
                disabled={!teamName.trim() || !captainCoCaptainsComplete}
                className="cta flex-1 rounded-full py-2.5 text-xs font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              Registering as <strong className="text-white">{participantRole === "CAPTAIN" ? "Captain" : "Player"}</strong>
              {participantRole === "CAPTAIN" && teamName ? (
                <>
                  {" "}
                  for <strong className="text-white">{teamName}</strong>
                  {coCaptainSlots > 0 &&
                  coCaptainUsernames.slice(0, coCaptainSlots).some((u) => u.trim()) ? (
                    <>
                      {" "}
                      with{" "}
                      {coCaptainSlots === 1 ? "co-captain" : "co-captains"}{" "}
                      <strong className="text-white">
                        {coCaptainUsernames
                          .slice(0, coCaptainSlots)
                          .map((u) => u.trim())
                          .filter(Boolean)
                          .join(", ")}
                      </strong>
                    </>
                  ) : null}
                </>
              ) : null}
            </p>
            <RegistrationTermsAgreement
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
              rulebookUrl={rulebookUrl}
              disabled={loading}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(participantRole === "CAPTAIN" ? "captain" : "role")} className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/50">Back</button>
              <button type="button" onClick={submitRegistration} disabled={loading || !acceptedTerms} className="cta flex-1 rounded-full py-3 text-xs font-semibold uppercase tracking-[0.18em] disabled:opacity-50">
                {loading ? "Registering…" : "Confirm registration"}
              </button>
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-red-400/90">{error}</p> : null}
      </div>
    </div>
  );
}
