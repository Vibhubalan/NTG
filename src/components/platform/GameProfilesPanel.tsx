"use client";

import { useState } from "react";
import type { ValorantRole } from "@prisma/client";
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

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none";

type GameProfilesPanelProps = {
  profile: GameProfile;
  selectedRoles: ValorantRole[];
  cs2Premier: string;
  cs2Faceit: string;
  pendingRiotId: string;
  onPendingRiotIdChange: (value: string) => void;
  pendingSteamUrl: string;
  onPendingSteamUrlChange: (value: string) => void;
  onToggleRole: (role: ValorantRole) => void;
  onCs2PremierChange: (value: string) => void;
  onCs2FaceitChange: (value: string) => void;
  onRefresh: () => Promise<void>;
};

export default function GameProfilesPanel({
  profile,
  selectedRoles,
  cs2Premier,
  cs2Faceit,
  pendingRiotId,
  onPendingRiotIdChange,
  pendingSteamUrl,
  onPendingSteamUrlChange,
  onToggleRole,
  onCs2PremierChange,
  onCs2FaceitChange,
  onRefresh,
}: GameProfilesPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addGame(game: "VALORANT" | "CS2") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/game-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addGame", game }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add game.");
        return;
      }
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  const hasValorant = profile.playedGames.includes("VALORANT");
  const hasCs2 = profile.playedGames.includes("CS2");

  return (
    <section className="space-y-6 border-t border-white/[0.06] pt-6">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">
          Game profiles
        </p>
        <p className="mt-2 text-sm text-white/45">
          Link accounts here for Valorant and CS2 cups. Linked accounts cannot be removed. Contact an admin.
        </p>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {!hasValorant ? (
        <div className="rounded-xl border border-dashed border-white/10 p-4">
          <p className="text-sm text-white/55">Add Valorant to your profile</p>
          <button
            type="button"
            onClick={() => addGame("VALORANT")}
            disabled={busy}
            className="mt-3 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-white/70 hover:text-white"
          >
            Add Valorant
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[var(--color-brand)]/80">
            Valorant
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Riot ID</dt>
              <dd>
                {profile.riotId ? (
                  <span className="font-mono text-[var(--color-brand)]/90">{profile.riotId}</span>
                ) : (
                  <span className="text-white/40">Not linked</span>
                )}
              </dd>
            </div>
            {profile.valorantRankTier ? (
              <div className="flex justify-between gap-4">
                <dt className="text-white/40">Current rank</dt>
                <dd className="text-white/85">{profile.valorantRankTier}</dd>
              </div>
            ) : null}
          </dl>

          {!profile.riotPuuid ? (
            <div className="pt-2">
              <input
                value={pendingRiotId}
                onChange={(e) => onPendingRiotIdChange(e.target.value)}
                placeholder="Player#NA1"
                className={inputClass}
              />
            </div>
          ) : (
            <div className="pt-2">
              <p className="mb-2 text-xs text-white/45">
                Click to select your roles (required for Valorant cups)
              </p>
              <div className="flex flex-wrap gap-2">
                {VALORANT_ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onToggleRole(role)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      selectedRoles.includes(role)
                        ? "border-[var(--color-brand)]/50 bg-[var(--color-brand)]/15 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10"
                    }`}
                  >
                    {VALORANT_ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!hasCs2 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-4">
          <p className="text-sm text-white/55">Add CS2 to your profile</p>
          <button
            type="button"
            onClick={() => addGame("CS2")}
            disabled={busy}
            className="mt-3 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-white/70 hover:text-white"
          >
            Add CS2
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-cyan-400/80">CS2</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Steam</dt>
              <dd>
                {profile.steamPersonaName ?? profile.steamId64 ? (
                  <span className="text-white/85">{profile.steamPersonaName ?? profile.steamId64}</span>
                ) : (
                  <span className="text-white/40">Not linked</span>
                )}
              </dd>
            </div>
            {profile.steamId64 ? (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">Steam64</dt>
                  <dd className="font-mono text-xs text-white/70">{profile.steamId64}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">CS2 hours</dt>
                  <dd className="text-white/85">
                    {profile.cs2HoursPlayed != null ? Math.round(profile.cs2HoursPlayed) : "—"}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>

          {!profile.steamId64 ? (
            <div className="pt-2">
              <input
                value={pendingSteamUrl}
                onChange={(e) => onPendingSteamUrlChange(e.target.value)}
                placeholder="Steam profile URL"
                className={inputClass}
              />
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-white/45">
                Enter Faceit rank and/or peak premier rank. Use NA for ranks you don&apos;t have. At least one must be real.
              </p>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-white/35">Faceit rank</label>
                <input
                  value={cs2Faceit}
                  onChange={(e) => onCs2FaceitChange(e.target.value)}
                  placeholder="Level 8 or NA"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-white/35">Peak premier rank</label>
                <input
                  value={cs2Premier}
                  onChange={(e) => onCs2PremierChange(e.target.value)}
                  placeholder="#18432 or NA"
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
