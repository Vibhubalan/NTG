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

  if (loading) {
    return <p className="text-sm text-white/40">Loading profile…</p>;
  }

  if (!profile) return null;

  const age = computeAgeFromDateOfBirth(dateOfBirth || profile.dateOfBirth);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <AccountInfoPanel
          profile={profile}
          dateOfBirth={dateOfBirth}
          olympusId={olympusId}
          age={age}
          onDateOfBirthChange={setDateOfBirth}
          onOlympusIdChange={setOlympusId}
        />

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
      </div>

      {message ? <p className="text-sm text-emerald-300/90">{message}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="border-t border-white/[0.06] pt-6">
        <button
          type="button"
          onClick={saveChanges}
          disabled={saving}
          className={`w-full cursor-pointer rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 ${
            hasChanges && canSave
              ? "bg-emerald-500 text-emerald-950 shadow-[0_0_24px_rgba(16,185,129,0.5)] hover:bg-emerald-400 hover:shadow-[0_0_32px_rgba(16,185,129,0.7)] hover:scale-[1.01]"
              : "border border-white/10 bg-white/10 text-white/90 hover:bg-white/15"
          } disabled:opacity-60 disabled:hover:scale-100`}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <details className="mt-8 border-t border-white/[0.06] pt-6">
        <summary className="cursor-pointer text-[11px] uppercase tracking-[0.18em] text-white/35">
          Delete account
        </summary>
        <p className="mt-3 text-xs leading-relaxed text-white/45">
          Permanently remove your membership. See our{" "}
          <a href="/privacy" className="text-white/60 underline-offset-2 hover:underline">
            privacy page
          </a>{" "}
          for details.
        </p>
        <button
          type="button"
          onClick={deleteAccount}
          disabled={deleting}
          className="mt-3 rounded-lg border border-red-500/25 px-4 py-2 text-xs font-medium text-red-300/90 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
      </details>
    </div>
  );
}
