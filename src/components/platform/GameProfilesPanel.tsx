"use client";

import { useEffect, useMemo, useState } from "react";
import type { ValorantRole } from "@prisma/client";
import { parseApiJson } from "@/lib/parse-api-json";
import {
  VALORANT_ROLE_LABELS,
  VALORANT_ROLE_OPTIONS,
} from "@/modules/auth-membership/domain/game-profile";

type GameProfile = {
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

type GameProfilesPanelProps = {
  profile: GameProfile;
  selectedRoles: ValorantRole[];
  pendingRiotId: string;
  onPendingRiotIdChange: (value: string) => void;
  pendingSteamUrl: string;
  onPendingSteamUrlChange: (value: string) => void;
  onToggleRole: (role: ValorantRole) => void;
  onRefresh: () => Promise<void>;
};

export default function GameProfilesPanel({
  profile,
  selectedRoles,
  pendingRiotId,
  onPendingRiotIdChange,
  pendingSteamUrl,
  onPendingSteamUrlChange,
  onToggleRole,
  onRefresh,
}: GameProfilesPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cs2Premier, setCs2Premier] = useState(profile.cs2PeakPremierRank ?? "NA");
  const [cs2Faceit, setCs2Faceit] = useState(profile.cs2FaceitRank ?? "NA");
  const [savingRanks, setSavingRanks] = useState(false);
  const [ranksMessage, setRanksMessage] = useState<string | null>(null);

  useEffect(() => {
    setCs2Premier(profile.cs2PeakPremierRank ?? "NA");
    setCs2Faceit(profile.cs2FaceitRank ?? "NA");
  }, [profile.cs2PeakPremierRank, profile.cs2FaceitRank]);

  const cs2RanksDirty = useMemo(() => {
    return (
      cs2Premier.trim() !== (profile.cs2PeakPremierRank ?? "NA").trim() ||
      cs2Faceit.trim() !== (profile.cs2FaceitRank ?? "NA").trim()
    );
  }, [profile, cs2Premier, cs2Faceit]);

  const canSaveCs2Ranks =
    cs2RanksDirty && cs2Premier.trim().length > 0 && cs2Faceit.trim().length > 0;

  async function refreshValorantRank() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/sync-rank", { method: "POST" });
      const parsed = await parseApiJson(res);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      const data = parsed.data;
      if (!res.ok) {
        setError(String(data.error ?? "Could not refresh rank."));
        return;
      }
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveCs2Ranks() {
    if (!canSaveCs2Ranks) return;
    setSavingRanks(true);
    setRanksMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/profile/game-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cs2PeakPremierRank: cs2Premier.trim(),
          cs2FaceitRank: cs2Faceit.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save CS2 ranks.");
        return;
      }
      setRanksMessage("CS2 ranks saved.");
      await onRefresh();
    } catch {
      setError("Could not save CS2 ranks.");
    } finally {
      setSavingRanks(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-white/[0.06] pb-4">
        <h3 className="font-display text-lg font-semibold text-white">Game Integrations</h3>
        <p className="text-xs text-white/45 mt-1">
          Link and configure your game accounts for league participation. Linked accounts cannot be unlinked.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
          <svg className="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {ranksMessage ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300">
          <span>{ranksMessage}</span>
        </div>
      ) : null}

      {/* VALORANT INTEGRATION SECTION */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.01] glass-strong p-6 space-y-4 border-l-4 border-l-[#ff4655]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-[#ff4655] opacity-[0.02] blur-3xl" />
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff4655]/10 text-[#ff4655]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            <h4 className="font-display text-base font-semibold text-white tracking-wide text-gradient-iris">Valorant Settings</h4>
          </div>
          {profile.riotPuuid && (
            <span className="rounded-full bg-[#ff4655]/10 border border-[#ff4655]/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#ff4655]">
              Linked
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/[0.04] bg-[#070b19]/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Riot ID</p>
            {profile.riotId ? (
              <p className="font-mono text-sm font-semibold text-white mt-2">{profile.riotId}</p>
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  value={pendingRiotId}
                  onChange={(e) => onPendingRiotIdChange(e.target.value)}
                  placeholder="Player#TAG"
                  className="w-full rounded-xl border border-white/10 bg-[#0c1428]/60 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-[#ff4655]/50 focus:outline-none transition-all"
                />
                <p className="text-[9px] text-white/30">Enter your Riot ID (e.g. Player#NA1) to save changes.</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.04] bg-[#070b19]/40 p-4 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Competitive Rank</p>
              <p className="text-sm font-semibold text-white/95 mt-2">
                {profile.valorantRankTier ? profile.valorantRankTier : (profile.riotPuuid ? "Not synced yet" : "Link Riot ID first")}
              </p>
            </div>
            {profile.riotPuuid && !profile.valorantRankTier && (
              <button
                type="button"
                onClick={refreshValorantRank}
                disabled={busy}
                className="mt-3 rounded-lg border border-[#ff4655]/30 bg-[#ff4655]/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#ff4655]/20 transition-all disabled:opacity-50 self-start cursor-pointer"
              >
                {busy ? "Syncing…" : "Sync Rank"}
              </button>
            )}
          </div>
        </div>

        {profile.riotPuuid && (
          <div className="border-t border-white/[0.06] pt-4 space-y-3">
            <div>
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-white/40">Select Roles</h5>
              <p className="text-[10px] text-white/30">Required to register for Valorant tournaments</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {VALORANT_ROLE_OPTIONS.map((role) => {
                const isSelected = selectedRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onToggleRole(role)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "border-[#ff4655]/50 bg-[#ff4655]/15 text-white shadow-[0_0_12px_rgba(255,70,85,0.15)]"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {VALORANT_ROLE_LABELS[role]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* COUNTER-STRIKE 2 INTEGRATION SECTION */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.01] glass-strong p-6 space-y-4 border-l-4 border-l-[#e65a23]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-[#e65a23] opacity-[0.02] blur-3xl" />
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e65a23]/10 text-[#e65a23]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </span>
            <h4 className="font-display text-base font-semibold text-white tracking-wide text-gradient-brand">CS2 Settings</h4>
          </div>
          {profile.steamId64 && (
            <span className="rounded-full bg-[#e65a23]/10 border border-[#e65a23]/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#e65a23]">
              Linked
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/[0.04] bg-[#070b19]/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Steam Account</p>
            {profile.steamId64 ? (
              <div className="mt-2">
                <p className="text-sm font-semibold text-white">{profile.steamPersonaName || "Linked Steam Account"}</p>
                <p className="font-mono text-[10px] text-white/40 mt-0.5">{profile.steamId64}</p>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  value={pendingSteamUrl}
                  onChange={(e) => onPendingSteamUrlChange(e.target.value)}
                  placeholder="Steam Profile URL"
                  className="w-full rounded-xl border border-white/10 bg-[#0c1428]/60 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-[#e65a23]/50 focus:outline-none transition-all"
                />
                <p className="text-[9px] text-white/30">Enter your public Steam profile URL to save changes.</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.04] bg-[#070b19]/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Play Stats</p>
            <div className="mt-3 flex items-center justify-between text-xs text-white/70">
              <span>CS2 Hours:</span>
              <span className="font-mono font-semibold text-white">
                {profile.cs2HoursPlayed != null ? Math.round(profile.cs2HoursPlayed) : "—"}
              </span>
            </div>
          </div>
        </div>

        {profile.steamId64 && (
          <div className="border-t border-white/[0.06] pt-4 space-y-4">
            <div>
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-white/40">Competitive Skill Levels</h5>
              <p className="text-[10px] text-white/30">
                Defaults to NA until you update. Cup registration uses your latest saved ranks.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-white/35">Faceit Rank</label>
                <input
                  value={cs2Faceit}
                  onChange={(e) => setCs2Faceit(e.target.value)}
                  placeholder="Level 8 or NA"
                  className="w-full rounded-xl border border-white/10 bg-[#0c1428]/60 px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-[#e65a23]/50 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-white/35">Peak Premier Rank</label>
                <input
                  value={cs2Premier}
                  onChange={(e) => setCs2Premier(e.target.value)}
                  placeholder="#18432 or NA"
                  className="w-full rounded-xl border border-white/10 bg-[#0c1428]/60 px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-[#e65a23]/50 focus:outline-none transition-all"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={saveCs2Ranks}
              disabled={savingRanks || !canSaveCs2Ranks}
              className={`rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                canSaveCs2Ranks
                  ? "bg-[#e65a23]/20 border border-[#e65a23]/40 text-white hover:bg-[#e65a23]/30 cursor-pointer"
                  : "border border-white/10 bg-white/5 text-white/35 cursor-not-allowed"
              } disabled:opacity-60`}
            >
              {savingRanks ? "Saving…" : "Save CS ranks"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
