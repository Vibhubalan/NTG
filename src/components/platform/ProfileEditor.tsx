"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import type { ValorantRole } from "@prisma/client";
import { computeAgeFromDateOfBirth } from "@/lib/date-age";
import AccountInfoPanel from "@/components/platform/AccountInfoPanel";
import GameProfilesPanel from "@/components/platform/GameProfilesPanel";

type FullProfile = {
  displayName: string;
  dateOfBirth: string | null;
  olympusId: string | null;
  email: string | null;
  phone: string | null;
  playedGames: string[];
  valorantRoles: ValorantRole[];
  cs2PeakPremierRank: string | null;
  cs2FaceitRank: string | null;
  riotId: string | null;
  riotPuuid: string | null;
  steamId64: string | null;
  steamPersonaName: string | null;
  steamProfileUrl: string | null;
  cs2HoursPlayed: number | null;
  valorantRankTier: string | null;
};

function rolesEqual(a: ValorantRole[], b: ValorantRole[]) {
  if (a.length !== b.length) return false;
  return a.every((role) => b.includes(role));
}

export default function ProfileEditor() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "games">("profile");

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [olympusId, setOlympusId] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<ValorantRole[]>([]);
  const [cs2Premier, setCs2Premier] = useState("");
  const [cs2Faceit, setCs2Faceit] = useState("");

  const [pendingRiotId, setPendingRiotId] = useState("");
  const [pendingSteamUrl, setPendingSteamUrl] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (
      !window.confirm(
        "Delete your account permanently? This removes your profile and leaderboard entry.",
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/account", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete account.");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Could not delete account.");
    } finally {
      setDeleting(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/game-profile");
      const data = await res.json();
      if (res.ok && data.profile) {
        const p = data.profile as FullProfile;
        setProfile(p);
        setDateOfBirth(p.dateOfBirth ?? "");
        setOlympusId(p.olympusId ?? "");
        setSelectedRoles(p.valorantRoles ?? []);
        setCs2Premier(p.cs2PeakPremierRank ?? "");
        setCs2Faceit(p.cs2FaceitRank ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const accountDirty = useMemo(() => {
    if (!profile) return false;
    return (
      dateOfBirth !== (profile.dateOfBirth ?? "") ||
      olympusId.trim() !== (profile.olympusId ?? "").trim()
    );
  }, [profile, dateOfBirth, olympusId]);

  const rolesDirty = useMemo(() => {
    if (!profile) return false;
    return !rolesEqual(selectedRoles, profile.valorantRoles ?? []);
  }, [profile, selectedRoles]);

  const cs2Dirty = useMemo(() => {
    if (!profile) return false;
    return (
      cs2Premier.trim() !== (profile.cs2PeakPremierRank ?? "").trim() ||
      cs2Faceit.trim() !== (profile.cs2FaceitRank ?? "").trim()
    );
  }, [profile, cs2Premier, cs2Faceit]);

  const linksDirty = useMemo(() => {
    if (!profile) return false;
    return pendingRiotId.trim() !== "" || pendingSteamUrl.trim() !== "";
  }, [profile, pendingRiotId, pendingSteamUrl]);

  const hasChanges = accountDirty || rolesDirty || cs2Dirty || linksDirty;

  const canSave = useMemo(() => {
    if (!hasChanges) return false;
    if (accountDirty && (!dateOfBirth || !olympusId.trim())) return false;
    if (rolesDirty && selectedRoles.length === 0) return false;
    if (cs2Dirty && (!cs2Premier.trim() || !cs2Faceit.trim())) return false;
    return true;
  }, [
    hasChanges,
    accountDirty,
    dateOfBirth,
    olympusId,
    rolesDirty,
    selectedRoles,
    cs2Dirty,
    cs2Premier,
    cs2Faceit,
    linksDirty,
    pendingRiotId,
    pendingSteamUrl,
  ]);

  async function saveChanges() {
    if (!profile || !canSave) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    if (pendingRiotId.trim()) {
      const res = await fetch("/api/auth/riot/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riotId: pendingRiotId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not link Riot ID.");
        setSaving(false);
        return;
      }
      if (data.rankSyncError) {
        setError(`Riot linked, but rank sync failed: ${data.rankSyncError}`);
      }
      setPendingRiotId("");
    }

    if (pendingSteamUrl.trim()) {
      const res = await fetch("/api/auth/steam/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: pendingSteamUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not link Steam.");
        setSaving(false);
        return;
      }
      setPendingSteamUrl("");
    }

    const body: Record<string, unknown> = {};
    if (accountDirty) {
      body.dateOfBirth = dateOfBirth;
      body.olympusId = olympusId.trim();
    }
    if (rolesDirty) {
      body.valorantRoles = selectedRoles;
    }
    if (cs2Dirty) {
      body.cs2PeakPremierRank = cs2Premier.trim();
      body.cs2FaceitRank = cs2Faceit.trim();
    }

    if (Object.keys(body).length > 0) {
      try {
        const res = await fetch("/api/profile/game-profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not save changes.");
          setSaving(false);
          return;
        }
      } catch {
        setError("Could not save changes.");
        setSaving(false);
        return;
      }
    }

    setMessage("Profile saved.");
    await load();
    setSaving(false);
  }

  const avatarInitials = useMemo(() => {
    if (!profile?.displayName) return "P";
    const parts = profile.displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [profile?.displayName]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 animate-pulse">
        <div className="lg:col-span-1 rounded-3xl border border-white/[0.06] bg-white/[0.02] h-96" />
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] h-48" />
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] h-96" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const age = computeAgeFromDateOfBirth(dateOfBirth || profile.dateOfBirth);
  const hasValorant = profile.playedGames.includes("VALORANT");
  const hasCs2 = profile.playedGames.includes("CS2");

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-start">
      {/* Left Column: Sidebar / Profile Summary */}
      <div className="lg:col-span-1 space-y-6">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] glass-strong p-6 text-center flex flex-col items-center">
          {/* Dynamic Avatar with name initials and a premium gradient */}
          <div className="relative group mb-5">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[var(--color-brand)] to-violet-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-[#0a1020] text-3xl font-bold font-display text-white select-none">
              {avatarInitials}
            </div>
          </div>
          
          <h3 className="font-display text-xl font-semibold text-white tracking-tight">{profile.displayName || "Player"}</h3>
          {age !== null && (
            <span className="mt-1.5 inline-flex items-center rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/50 border border-white/[0.05]">
              Age: {age}
            </span>
          )}
          
          {/* Quick contact list */}
          <div className="w-full mt-6 space-y-3 border-t border-white/[0.06] pt-6 text-left">
            {profile.email && (
              <div className="flex items-center gap-3 text-xs text-white/60">
                <svg className="h-4 w-4 shrink-0 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="truncate">{profile.email}</span>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-3 text-xs text-white/60">
                <svg className="h-4 w-4 shrink-0 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{profile.phone}</span>
              </div>
            )}
          </div>

          {/* Connected games badges */}
          <div className="w-full mt-6 border-t border-white/[0.06] pt-6 text-left">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 mb-3">Linked Platforms</h4>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border ${
                hasValorant 
                  ? "bg-[#ff4655]/10 border-[#ff4655]/20 text-[#ff4655]"
                  : "bg-white/[0.02] border-white/5 text-white/35"
              }`}>
                Valorant
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border ${
                hasCs2
                  ? "bg-[#e65a23]/10 border-[#e65a23]/20 text-[#e65a23]"
                  : "bg-white/[0.02] border-white/5 text-white/35"
              }`}>
                CS2
              </span>
            </div>
          </div>

          {/* Quick Actions (Sign out, Browse cups) */}
          <div className="w-full mt-6 border-t border-white/[0.06] pt-6 flex flex-col gap-2">
            <a
              href="/esports/tournaments"
              className="w-full text-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/80 hover:bg-white/10 transition-colors hover:text-white"
            >
              Browse cups
            </a>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-center rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-400 hover:bg-red-500/[0.12] transition-colors hover:text-red-300"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Settings Panels */}
      <div className="lg:col-span-2 space-y-6">
        {/* Tab Headers */}
        <div className="flex rounded-2xl bg-white/[0.03] border border-white/[0.06] p-1 mb-6 max-w-sm relative">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl relative z-10 cursor-pointer ${
              activeTab === "profile" ? "text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            Personal Profile
            {activeTab === "profile" && (
              <div
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-[var(--color-brand)]/20 to-violet-500/20 border border-[var(--color-brand)]/30 shadow-[0_0_12px_rgba(217,70,239,0.15)] z-[-1]"
              />
            )}
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("games")}
            className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl relative z-10 cursor-pointer ${
              activeTab === "games" ? "text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            Game Accounts
            {activeTab === "games" && (
              <div
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-[var(--color-brand)]/20 to-violet-500/20 border border-[var(--color-brand)]/30 shadow-[0_0_12px_rgba(217,70,239,0.15)] z-[-1]"
              />
            )}
          </button>
        </div>

        <div className="space-y-6">
          {activeTab === "profile" ? (
            <div className="space-y-6">
              <AccountInfoPanel
                profile={profile}
                dateOfBirth={dateOfBirth}
                olympusId={olympusId}
                age={age}
                onDateOfBirthChange={setDateOfBirth}
                onOlympusIdChange={setOlympusId}
              />

              <details className="group mt-6 border-t border-white/[0.06] pt-6">
                <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 hover:text-white/60 transition-colors select-none">
                  Danger Zone — Delete Account
                </summary>
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-5">
                  <p className="text-xs leading-relaxed text-red-200/70">
                    Permanently remove your membership. This removes your profile and leaderboard entries. This action is irreversible. See our{" "}
                    <a href="/privacy" className="text-red-300 underline underline-offset-2 hover:text-red-200">
                      privacy page
                    </a>{" "}
                    for details.
                  </p>
                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={deleting}
                    className="mt-4 rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-2.5 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? "Deleting Account…" : "Delete Account"}
                  </button>
                </div>
              </details>
            </div>
          ) : (
            <GameProfilesPanel
              profile={profile}
              selectedRoles={selectedRoles}
              cs2Premier={cs2Premier}
              cs2Faceit={cs2Faceit}
              pendingRiotId={pendingRiotId}
              onPendingRiotIdChange={setPendingRiotId}
              pendingSteamUrl={pendingSteamUrl}
              onPendingSteamUrlChange={setPendingSteamUrl}
              onToggleRole={(role) => {
                setSelectedRoles((prev) => {
                  if (role === "FLEX") return prev.includes("FLEX") ? [] : ["FLEX"];
                  const withoutFlex = prev.filter((r) => r !== "FLEX");
                  let nextRoles;
                  if (withoutFlex.includes(role)) {
                    nextRoles = withoutFlex.filter((r) => r !== role);
                  } else {
                    nextRoles = [...withoutFlex, role];
                  }
                  if (nextRoles.length === 4) return ["FLEX"];
                  return nextRoles;
                });
              }}
              onCs2PremierChange={setCs2Premier}
              onCs2FaceitChange={setCs2Faceit}
              onRefresh={load}
            />
          )}
        </div>

        {message && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300">
            <svg className="h-5 w-5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
            <svg className="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="border-t border-white/[0.06] pt-6">
          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className={`w-full cursor-pointer rounded-xl px-5 py-3.5 text-sm font-semibold transition-all duration-300 ${
              hasChanges && canSave
                ? "bg-gradient-to-r from-[var(--color-brand)] to-violet-500 text-white shadow-[0_0_24px_rgba(217,70,239,0.3)] hover:shadow-[0_0_32px_rgba(217,70,239,0.5)] hover:scale-[1.01] hover:brightness-110"
                : "border border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
            } disabled:opacity-60 disabled:hover:scale-100`}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
