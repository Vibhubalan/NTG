"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GameSlug } from "@prisma/client";
import RegistrationTermsAgreement from "@/components/platform/RegistrationTermsAgreement";
import ValorantRegistrationProfileCard from "@/components/platform/tournament/ValorantRegistrationProfileCard";
import { profileRequirementFix } from "@/lib/profile-requirements";
import type { ValorantRegistrationProfileCard as ValorantRegistrationProfileCardData } from "@core/contracts/registration-profile";

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
  layout?: "sidebar" | "featured";
  registrationProfileCard?: ValorantRegistrationProfileCardData | null;
};

type Step = "role" | "captain" | "confirm";

function RegisterShell({
  layout = "sidebar",
  eyebrow = "Registration",
  title,
  subtitle,
  children,
}: {
  layout?: "sidebar" | "featured";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  if (layout === "featured") {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#080e1c]/98 via-[#0c1428]/95 to-[#140a20]/98 p-5 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.75)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[var(--color-brand)]/8 blur-3xl" />
        <div className="relative">
          <div className="mb-4 min-h-[4.75rem] border-b border-white/[0.06] pb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--color-brand)]">{eyebrow}</p>
            <h2 className="mt-1 line-clamp-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
            {subtitle ? <p className="mt-1 line-clamp-1 max-w-xl text-xs leading-snug text-white/45">{subtitle}</p> : <p className="mt-1 text-xs text-transparent" aria-hidden>.</p>}
          </div>
          {children}
        </div>
      </section>
    );
  }

  return (
    <div className="shine-border rounded-[1.35rem] lg:sticky lg:top-28">
      <div className="shine-border-inner space-y-4 rounded-[1.35rem] bg-[#0a1020]/85 p-6 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">{eyebrow}</p>
          <p className="mt-2 text-sm text-white/45">{subtitle ?? title}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function StepIndicator({
  step,
  participantRole,
  featured = false,
}: {
  step: Step;
  participantRole: "CAPTAIN" | "PLAYER" | null;
  featured?: boolean;
}) {
  const steps = featured
    ? [
        { id: "role" as const, label: "Role" },
        { id: "captain" as const, label: "Team" },
        { id: "confirm" as const, label: "Confirm" },
      ]
    : participantRole === "PLAYER"
      ? [
          { id: "role" as const, label: "Role" },
          { id: "confirm" as const, label: "Confirm" },
        ]
      : [
          { id: "role" as const, label: "Role" },
          { id: "captain" as const, label: "Team" },
          { id: "confirm" as const, label: "Confirm" },
        ];

  const activeIndex = steps.findIndex((s) => s.id === step);
  const featuredActiveIndex =
    step === "role" ? 0 : step === "captain" ? 1 : 2;

  return (
    <div className="mb-3 flex items-center gap-1.5">
      {steps.map((s, i) => {
        const index = featured ? featuredActiveIndex : activeIndex;
        const done = featured
          ? participantRole === "PLAYER" && s.id === "captain"
            ? false
            : i < index
          : i < activeIndex;
        const skipped = featured && participantRole === "PLAYER" && s.id === "captain";
        const active = featured ? i === featuredActiveIndex : i === activeIndex;
        return (
          <div key={s.id} className="flex flex-1 items-center gap-1.5">
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-colors ${
                skipped
                  ? "bg-white/[0.04] text-white/20"
                  : active
                    ? "bg-[var(--color-brand)] text-[#041018]"
                    : done
                      ? "bg-[var(--color-brand)]/20 text-[var(--color-brand)]"
                      : "bg-white/[0.06] text-white/35"
              }`}
            >
              {done && !skipped ? "✓" : i + 1}
            </div>
            <span
              className={`text-[9px] font-semibold uppercase tracking-wider ${
                skipped ? "text-white/20" : active ? "text-white/80" : "text-white/30"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 ? (
              <div className={`h-px flex-1 ${done && !skipped ? "bg-[var(--color-brand)]/35" : "bg-white/[0.06]"}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ProfilePreview({
  preview,
  game,
  featured = false,
  compact = false,
}: {
  preview: RegistrationPreview | null;
  game: GameSlug;
  featured?: boolean;
  compact?: boolean;
}) {
  if (!preview) return null;

  if (featured && compact) {
    return (
      <div className="rounded-xl border border-[var(--color-brand)]/15 bg-[var(--color-brand)]/[0.05] px-3.5 py-2.5">
        <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Your profile</p>
        <p className="mt-1 text-sm font-semibold text-[var(--color-brand)]">{preview.displayName}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/45">
          {game === "VALORANT" && preview.riotId ? <span>{preview.riotId}</span> : null}
          {game === "VALORANT" && preview.valorantRankTier ? <span>{preview.valorantRankTier}</span> : null}
          {game === "VALORANT" && preview.valorantRoles.length > 0 ? (
            <span>{preview.valorantRoles.join(", ")}</span>
          ) : null}
          {game === "CS2" && preview.steamPersonaName ? <span>{preview.steamPersonaName}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        featured
          ? "rounded-xl border border-[var(--color-brand)]/20 bg-gradient-to-r from-[var(--color-brand)]/[0.08] to-transparent px-4 py-3"
          : "rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70"
      }
    >
      <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Your profile</p>
      {preview.displayName ? (
        <p className={`mt-1 font-medium text-white/90 ${featured ? "text-sm" : "text-sm"}`}>
          <span className="text-[var(--color-brand)]">{preview.displayName}</span>
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
  layout = "sidebar",
  registrationProfileCard = null,
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
  const [profileCard, setProfileCard] = useState<ValorantRegistrationProfileCardData | null>(
    registrationProfileCard,
  );

  useEffect(() => {
    if (registrationProfileCard) setProfileCard(registrationProfileCard);
  }, [registrationProfileCard]);

  const inputClass =
    layout === "featured"
      ? "w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/30 transition-colors focus:border-[var(--color-brand)]/50 focus:bg-white/[0.06] focus:outline-none"
      : "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none";

  const roleCardClass = (selected: boolean) =>
    layout === "featured"
      ? `rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ${
          selected
            ? "border-[var(--color-brand)]/45 bg-[var(--color-brand)]/[0.08]"
            : "border-white/[0.08] bg-white/[0.02] hover:border-[var(--color-brand)]/30 hover:bg-white/[0.04]"
        }`
      : "rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition-colors hover:border-[var(--color-brand)]/40";

  if (!registrationOpen) return null;

  if (!isLoggedIn) {
    return (
      <RegisterShell
        layout={layout}
        title="Join this cup"
        subtitle="Log in or create an account to register."
      >
        <Link
          href={`/login?callbackUrl=/esports/tournaments/${slug}`}
          className="cta inline-flex w-full items-center justify-center rounded-full py-3.5 text-xs font-semibold uppercase tracking-[0.18em]"
        >
          Continue to login
        </Link>
      </RegisterShell>
    );
  }

  if (alreadyRegistered || success) {
    if (game === "VALORANT" && profileCard) {
      return (
        <RegisterShell layout={layout} eyebrow="Registration" title="You're in" subtitle="See you on match day.">
          <ValorantRegistrationProfileCard profile={profileCard} />
        </RegisterShell>
      );
    }

    return (
      <RegisterShell layout={layout} title="You're in" subtitle="See you on match day.">
        <div className="rounded-2xl border border-[var(--color-brand)]/25 bg-[var(--color-brand)]/[0.08] px-6 py-8 text-center">
          <p className="font-display text-2xl font-bold text-white">Registered</p>
          <p className="mt-2 text-sm text-white/50">Your spot is locked in for this cup.</p>
        </div>
      </RegisterShell>
    );
  }

  if (preview && !preview.canRegister) {
    return (
      <RegisterShell
        layout={layout}
        title="Complete your profile"
        subtitle="Finish these steps before you can register."
      >
        <ul className="space-y-3">
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
      </RegisterShell>
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as { error?: string }).error ??
            (res.status >= 500
              ? "Server error — restart dev after running prisma generate."
              : "Registration failed."),
        );
        submitting.current = false;
        setLoading(false);
        return;
      }
      setSuccess(true);
      if (data.profileCard) setProfileCard(data.profileCard);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as { error?: string }).error ??
            (res.status >= 500
              ? "Server error — restart dev after running prisma generate."
              : "Registration failed."),
        );
        submitting.current = false;
        setLoading(false);
        return;
      }
      setSuccess(true);
      if (data.profileCard) setProfileCard(data.profileCard);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as { error?: string }).error ??
            (res.status >= 500
              ? "Server error — restart dev after running prisma generate."
              : "Registration failed."),
        );
        submitting.current = false;
        setLoading(false);
        return;
      }
      setSuccess(true);
      if (data.profileCard) setProfileCard(data.profileCard);
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
    <RegisterShell
      layout={layout}
      title={step === "role" ? "How do you want to join?" : step === "captain" ? "Set up your team" : "Review and confirm"}
      subtitle={
        step === "role"
          ? "Captain or player pool for the auction draft."
          : step === "captain"
            ? "Team name and co-captains if required."
            : "Agree to rules and confirm."
      }
    >
      {layout === "featured" ? (
        <StepIndicator step={step} participantRole={participantRole} featured />
      ) : (
        <StepIndicator step={step} participantRole={participantRole} />
      )}

      <div className={layout === "featured" ? "flex min-h-[10.5rem] flex-col" : "space-y-3"}>
        <div className={layout === "featured" ? "flex-1" : undefined}>
        {step === "role" && layout === "featured" ? (
          <div className="grid h-full min-h-[5.5rem] gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-stretch">
            <ProfilePreview preview={preview} game={game} featured compact />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setParticipantRole("CAPTAIN"); setStep("captain"); }}
                className={roleCardClass(participantRole === "CAPTAIN")}
              >
                <p className="text-sm font-semibold text-white">Captain</p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/40">{captainCardDescription}</p>
              </button>
              <button
                type="button"
                onClick={() => { setParticipantRole("PLAYER"); setStep("confirm"); }}
                className={roleCardClass(participantRole === "PLAYER")}
              >
                <p className="text-sm font-semibold text-white">Player</p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/40">Join the player pool.</p>
              </button>
            </div>
          </div>
        ) : null}

        {step === "role" && layout !== "featured" ? (
          <>
            <ProfilePreview preview={preview} game={game} featured={false} />
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { setParticipantRole("CAPTAIN"); setStep("captain"); }}
                className={roleCardClass(participantRole === "CAPTAIN")}
              >
                <p className="text-sm font-semibold text-white">Captain</p>
                <p className="mt-1 text-xs text-white/40">{captainCardDescription}</p>
              </button>
              <button
                type="button"
                onClick={() => { setParticipantRole("PLAYER"); setStep("confirm"); }}
                className={roleCardClass(participantRole === "PLAYER")}
              >
                <p className="text-sm font-semibold text-white">Player</p>
                <p className="mt-1 text-xs text-white/40">Join the pool. Admin assigns teams.</p>
              </button>
            </div>
          </>
        ) : null}

        {step === "captain" && layout === "featured" ? (
          <div className="grid h-full min-h-[5.5rem] gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-stretch">
            <ProfilePreview preview={preview} game={game} featured compact />
            <div className="flex flex-col justify-center gap-2 overflow-y-auto">
              <input
                className={inputClass}
                placeholder="Team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              {coCaptainSlots > 0
                ? Array.from({ length: coCaptainSlots }, (_, index) => (
                    <input
                      key={index}
                      className={inputClass}
                      placeholder={coCaptainSlots === 1 ? "Co-captain username" : `Co-captain ${index + 1}`}
                      value={coCaptainUsernames[index] ?? ""}
                      onChange={(e) => {
                        const next = [...coCaptainUsernames];
                        next[index] = e.target.value;
                        setCoCaptainUsernames(next);
                      }}
                    />
                  ))
                : null}
            </div>
          </div>
        ) : null}

        {step === "captain" && layout !== "featured" ? (
          <div className="space-y-3">
            <ProfilePreview preview={preview} game={game} featured={false} />
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">Team name</label>
              <input className={inputClass} placeholder="Enter your team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            </div>
            {coCaptainSlots > 0 ? (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Co-captain{coCaptainSlots > 1 ? "s" : ""}
                </p>
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
              </div>
            ) : null}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep("role")} className="rounded-full border border-white/10 px-5 py-2.5 text-xs text-white/50 hover:bg-white/[0.04]">Back</button>
              <button
                type="button"
                onClick={() => setStep("confirm")}
                disabled={!teamName.trim() || !captainCoCaptainsComplete}
                className="cta flex-1 rounded-full py-3 text-xs font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === "confirm" && layout === "featured" ? (
          <div className="grid h-full min-h-[5.5rem] gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-stretch">
            {participantRole === "PLAYER" ? (
              <ProfilePreview preview={preview} game={game} featured compact />
            ) : (
              <div className="flex flex-col justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                <p className="text-[11px] leading-relaxed text-white/60">
                  Registering as <strong className="text-white">Captain</strong>
                  {teamName ? (
                    <>
                      {" "}
                      for <strong className="text-white">{teamName}</strong>
                    </>
                  ) : null}
                </p>
              </div>
            )}
            <div className="flex flex-col justify-center">
              <RegistrationTermsAgreement
                checked={acceptedTerms}
                onChange={setAcceptedTerms}
                rulebookUrl={rulebookUrl}
                disabled={loading}
              />
            </div>
          </div>
        ) : null}

        {step !== "role" && layout !== "featured" && step === "confirm" ? (
          <ProfilePreview preview={preview} game={game} featured={false} />
        ) : null}

        {step === "confirm" && layout !== "featured" ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <p className="text-sm leading-relaxed text-white/65">
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
            </div>
            <RegistrationTermsAgreement
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
              rulebookUrl={rulebookUrl}
              disabled={loading}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(participantRole === "CAPTAIN" ? "captain" : "role")} className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/50 hover:bg-white/[0.04]">Back</button>
              <button type="button" onClick={submitRegistration} disabled={loading || !acceptedTerms} className="cta flex-1 rounded-full py-2.5 text-xs font-semibold uppercase tracking-[0.16em] disabled:opacity-50">
                {loading ? "Registering…" : "Confirm registration"}
              </button>
            </div>
          </div>
        ) : null}

        {error && layout !== "featured" ? <p className="text-sm text-red-400/90">{error}</p> : null}
        </div>

        {layout === "featured" ? (
          <div className="mt-3 flex min-h-[2.75rem] shrink-0 gap-2 border-t border-white/[0.06] pt-3">
            {step === "captain" || step === "confirm" ? (
              <>
                <button
                  type="button"
                  onClick={() => setStep(step === "confirm" ? (participantRole === "CAPTAIN" ? "captain" : "role") : "role")}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/50 hover:bg-white/[0.04]"
                >
                  Back
                </button>
                {step === "captain" ? (
                  <button
                    type="button"
                    onClick={() => setStep("confirm")}
                    disabled={!teamName.trim() || !captainCoCaptainsComplete}
                    className="cta flex-1 rounded-full py-2.5 text-xs font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submitRegistration}
                    disabled={loading || !acceptedTerms}
                    className="cta flex-1 rounded-full py-2.5 text-xs font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
                  >
                    {loading ? "Registering…" : "Confirm registration"}
                  </button>
                )}
              </>
            ) : (
              <div className="h-9 w-full" aria-hidden />
            )}
          </div>
        ) : null}

        {error && layout === "featured" ? <p className="mt-2 text-sm text-red-400/90">{error}</p> : null}
      </div>
    </RegisterShell>
  );
}
