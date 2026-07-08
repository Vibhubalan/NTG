"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GameSlug } from "@prisma/client";
import RegistrationTermsAgreement from "@/components/platform/RegistrationTermsAgreement";

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
      {game === "CS2" && preview.cs2FaceitRank ? (
        <p className="text-white/45">Faceit: {preview.cs2FaceitRank}</p>
      ) : null}
      {game === "CS2" && preview.cs2PeakPremierRank ? (
        <p className="text-white/45">Peak premier: {preview.cs2PeakPremierRank}</p>
      ) : null}
    </div>
  );
}

export default function TournamentRegisterForm({
  slug,
  game,
  isLoggedIn,
  alreadyRegistered,
  registrationOpen,
  rulebookUrl,
  preview,
  coCaptainSlots,
}: Props) {
  const router = useRouter();
  const submitting = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("role");
  const [participantRole, setParticipantRole] = useState<"CAPTAIN" | "PLAYER" | null>(null);
  const [teamName, setTeamName] = useState("");
  const [partnerUsername, setPartnerUsername] = useState("");
  const coCaptainCount = coCaptainSlots;
  const [coCaptainUsernames, setCoCaptainUsernames] = useState<string[]>(["", "", "", ""]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [eligibleUsernames, setEligibleUsernames] = useState<string[]>([]);
  const [activeInputIndex, setActiveInputIndex] = useState<number | null>(null);

  useEffect(() => {
    if (coCaptainSlots > 0 && slug && slug !== "undefined") {
      console.log(`[TournamentRegisterForm] Fetching eligible co-captains for slug: "${slug}"`);
      fetch(`/api/tournaments/${slug}/eligible-co-captains`)
        .then((res) => {
          console.log(`[TournamentRegisterForm] Response status for co-captains fetch:`, res.status);
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log(`[TournamentRegisterForm] Eligible co-captains data:`, data);
          if (data.usernames) {
            setEligibleUsernames(data.usernames);
          }
        })
        .catch((err) => console.error("[TournamentRegisterForm] Error fetching co-captains:", err));
    } else {
      console.log(`[TournamentRegisterForm] Skipping co-captains fetch: coCaptainSlots=${coCaptainSlots}, slug="${slug}"`);
    }
  }, [slug, coCaptainSlots]);

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
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-200/80">
            {preview.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <Link href="/profile" className="inline-flex w-full items-center justify-center rounded-full border border-white/15 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 hover:bg-white/[0.04]">
            Go to profile
          </Link>
        </div>
      </div>
    );
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/tournaments/upload-team-logo", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Logo upload failed.");
        return;
      }
      setLogoUrl(data.url);
    } catch {
      setError("Logo upload failed.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function submitFifaRegistration() {
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

  async function submitRegistration() {
    if (submitting.current || loading || !participantRole || !acceptedTerms) return;
    submitting.current = true;
    setLoading(true);
    setError(null);

    if (participantRole === "CAPTAIN" && coCaptainCount > 0) {
      const activeNames = coCaptainUsernames.slice(0, coCaptainCount).map(u => u.trim());
      if (activeNames.some(name => name === "")) {
        setError("Please fill in all co-captain username fields.");
        submitting.current = false;
        setLoading(false);
        return;
      }
      if (new Set(activeNames.map(u => u.toLowerCase())).size !== activeNames.length) {
        setError("Duplicate co-captain usernames are not allowed.");
        submitting.current = false;
        setLoading(false);
        return;
      }
    }

    try {
      const body =
        participantRole === "CAPTAIN"
          ? {
              participantRole,
              teamName: teamName.trim(),
              logoUrl: logoUrl!,
              coCaptainUsernames: coCaptainUsernames.slice(0, coCaptainCount).map(u => u.trim()),
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
              <p className="mt-1 text-xs text-white/40">Create a team with name and logo</p>
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
            <div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={logoUploading} className="w-full rounded-xl border border-dashed border-white/15 py-3 text-xs uppercase tracking-wider text-white/55 hover:border-white/30">
                {logoUploading ? "Uploading…" : logoUrl ? "Logo uploaded. Tap to change" : "Upload team logo (max 10 MB)"}
              </button>
              {logoUrl ? <p className="mt-1 truncate text-[10px] text-emerald-300/80">{logoUrl}</p> : null}
            </div>

            {coCaptainSlots > 0 && (
              <div className="space-y-2 border-t border-white/[0.06] pt-3 animate-in fade-in duration-200">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Co-Captains ({coCaptainSlots})</label>
                <div className="space-y-2 mt-2 pl-2 border-l border-[var(--color-brand)]/20 animate-in slide-in-from-top-1 duration-200">
                  {Array.from({ length: coCaptainSlots }).map((_, i) => {
                    const currentVal = coCaptainUsernames[i] ?? "";
                    const otherSelected = coCaptainUsernames.filter((_, idx) => idx !== i).map(u => u.trim().toLowerCase());
                    const suggestions = eligibleUsernames.filter(name => {
                      const matchesSearch = name.toLowerCase().includes(currentVal.toLowerCase());
                      const notAlreadySelected = !otherSelected.includes(name.toLowerCase());
                      return matchesSearch && notAlreadySelected;
                    });

                    return (
                      <div key={i} className="relative">
                        <input
                          className={inputClass}
                          placeholder={`Co-captain #${i + 1} NTG username`}
                          value={coCaptainUsernames[i] ?? ""}
                          onFocus={() => setActiveInputIndex(i)}
                          onBlur={() => {
                            // Small delay so that onMouseDown on the suggestions triggers first
                            setTimeout(() => {
                              setActiveInputIndex((curr) => curr === i ? null : curr);
                            }, 180);
                          }}
                          onChange={(e) => {
                            const next = [...coCaptainUsernames];
                            next[i] = e.target.value;
                            setCoCaptainUsernames(next);
                          }}
                        />
                        {activeInputIndex === i && suggestions.length > 0 && (
                          <ul className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#0A0E1A]/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
                            {suggestions.map((name) => (
                              <li key={name}>
                                <button
                                  type="button"
                                  onMouseDown={() => {
                                    const next = [...coCaptainUsernames];
                                    next[i] = name;
                                    setCoCaptainUsernames(next);
                                    setActiveInputIndex(null);
                                  }}
                                  className="w-full rounded-lg px-3.5 py-2 text-left text-xs font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-all duration-150"
                                >
                                  {name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-white/35 leading-relaxed">
                    Enter the NTG username of a player who has <strong className="text-white/55">already registered</strong> for this
                    cup. They&apos;ll be moved from the player pool onto your team as a co-captain.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
              <button type="button" onClick={() => setStep("role")} className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/50">Back</button>
              <button
                type="button"
                onClick={() => setStep("confirm")}
                disabled={!teamName.trim() || !logoUrl || (coCaptainCount > 0 && coCaptainUsernames.slice(0, coCaptainCount).some(u => !u.trim()))}
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
                <> for <strong className="text-white">{teamName}</strong></>
              ) : null}
              {participantRole === "CAPTAIN" && coCaptainCount > 0 ? (
                <span className="block mt-1 text-xs text-white/40">
                  Inviting {coCaptainCount} co-captain(s):{" "}
                  <strong className="text-white/60">
                    {coCaptainUsernames.slice(0, coCaptainCount).join(", ")}
                  </strong>
                </span>
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

