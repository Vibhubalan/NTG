"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import RulebookUploadField from "@/components/admin/RulebookUploadField";
import { AdminSection } from "@/components/admin/AdminSection";
import { useAdminDeleteConfirm } from "@/components/admin/useAdminDeleteConfirm";
import type { PrizeSplitRow } from "@core/contracts";
import { emptyToNull, prizeSplitForSave } from "@/lib/admin-fields";

type Team = {
  id: string;
  name: string;
  seed: number | null;
  logoUrl?: string | null;
  players: {
    id: string;
    displayName: string;
    riotGameName: string | null;
    riotTagLine: string | null;
  }[];
};

type RegistrationRow = {
  id: string;
  createdAt: string;
  participantRole: string;
  teamName: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  olympusId: string | null;
  dateOfBirth: string | null;
  partnerUsername: string | null;
  partnerName: string | null;
  riotId: string | null;
  rankTier: string | null;
  valorantRoles: string | null;
  steamId64: string | null;
  cs2Hours: number | null;
  cs2PeakPremier: string | null;
  cs2FaceitRank: string | null;
  teamId: string | null;
};

type PoolPlayer = {
  id: string;
  displayName: string;
  riotId: string | null;
  steamId64: string | null;
};

type TournamentData = {
  slug: string;
  name: string;
  game: string;
  gameLabel: string | null;
  status: string;
  description: string | null;
  posterUrl: string | null;
  hubBannerUrl: string | null;
  hubCarouselImages: string[];
  showOnEsportsHub: boolean;
  prizePool: string | null;
  prizeNotes: string | null;
  prizeSplit: PrizeSplitRow[] | null;
  startsAt: string | null;
  endsAt: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  autoManageStatus: boolean;
  hideAfter: string | null;
  bracketUrl: string | null;
  rulebookUrl: string | null;
  tournamentTeams: Team[];
  registrations: RegistrationRow[];
  poolPlayers: PoolPlayer[];
  placements: { role: string; teamLabel: string | null }[];
};

function toLocalDatetime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultSplit(total: number): PrizeSplitRow[] {
  return [
    { place: 1, label: "Winner", amount: Math.round(total * 0.6) },
    { place: 2, label: "Runner Up", amount: Math.round(total * 0.3) },
    { place: 3, label: "3rd Place", amount: Math.round(total * 0.1) },
  ];
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200";

const checkboxLabelClass =
  "flex items-center gap-3 rounded-xl border border-white/[0.05] bg-[#0a1020]/30 px-4 py-3 text-sm text-white/70 hover:bg-white/[0.02] cursor-pointer transition-colors";

type CupFields = Omit<
  TournamentData,
  "slug" | "tournamentTeams" | "registrations" | "poolPlayers" | "placements" | "hideAfter"
>;

function applyCupFields(form: TournamentData, fields: CupFields): TournamentData {
  return { ...form, ...fields };
}

export default function AdminTournamentEditor({ initial }: { initial: TournamentData }) {
  const router = useRouter();
  const { openDeleteConfirm, DeleteConfirmDialog } = useAdminDeleteConfirm();
  const [form, setForm] = useState(initial);
  const [listVersion, setListVersion] = useState(0);
  const registrations = initial.registrations;
  const tournamentTeams = initial.tournamentTeams;
  const poolPlayers = initial.poolPlayers;
  const [activeTab, setActiveTab] = useState<
    "general" | "media" | "prizes" | "standings" | "registrations" | "teams"
  >("general");
  const [mvp, setMvp] = useState(
    initial.placements.find((p) => p.role === "MVP")?.teamLabel ?? "",
  );
  const savedMvpRef = useRef(
    initial.placements.find((p) => p.role === "MVP")?.teamLabel?.trim() ?? "",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [newPlayerNames, setNewPlayerNames] = useState<Record<string, string>>({});
  const [poolPick, setPoolPick] = useState<Record<string, string>>({});
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<
    { id: string; email: string | null; name: string | null; displayName: string | null }[]
  >([]);
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [addRole, setAddRole] = useState<"PLAYER" | "CAPTAIN">("PLAYER");
  const [addTeamName, setAddTeamName] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const prizeSplitDisplay =
    form.prizeSplit ??
    (form.prizePool ? defaultSplit(Number(form.prizePool)) : []);

  const cupUrl = `/esports/tournaments/${form.slug}`;
  const hubUrl = "/esports";

  function isRegistrationLiveNow(): boolean {
    if (
      form.autoManageStatus &&
      form.registrationOpensAt &&
      form.startsAt
    ) {
      const now = Date.now();
      const opens = new Date(form.registrationOpensAt).getTime();
      const closes = new Date(form.startsAt).getTime() - 60_000;
      return now >= opens && now < closes;
    }
    return form.status === "REGISTRATION_OPEN";
  }

  useEffect(() => {
    if (listVersion === 0) return;
    savedMvpRef.current =
      initial.placements.find((p) => p.role === "MVP")?.teamLabel?.trim() ?? "";
    setMvp(savedMvpRef.current);
  }, [listVersion, initial.placements]);

  function applySavedCupFields(fields: CupFields) {
    setForm((current) => applyCupFields(current, fields));
  }

  function refreshLists() {
    setListVersion((v) => v + 1);
    router.refresh();
  }

  const isRegistrationOpen = isRegistrationLiveNow();

  useEffect(() => {
    const q = memberSearch.trim();
    if (q.length < 2) {
      setMemberResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/admin/members?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setMemberResults(data.users);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearch]);

  async function addMemberRegistration() {
    if (!selectedMember) return;
    setAddingMember(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${form.slug}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedMember.id,
          participantRole: addRole,
          teamName: addRole === "CAPTAIN" ? addTeamName.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Could not add member.");
        return;
      }
      setSelectedMember(null);
      setMemberSearch("");
      setMemberResults([]);
      setAddTeamName("");
      setAddRole("PLAYER");
      setMessage("Member added to cup.");
      refreshLists();
    } finally {
      setAddingMember(false);
    }
  }

  function requestRemoveRegistration(reg: RegistrationRow) {
    const isCaptain = reg.participantRole === "CAPTAIN";
    openDeleteConfirm({
      title: `Remove ${reg.displayName ?? "this member"}?`,
      description: isCaptain
        ? "This captain registration will remove their entire team and all linked registrations for this cup."
        : "This member will be removed from the cup registrations list.",
      confirmLabel: "Remove",
      onConfirm: async () => {
        const res = await fetch(
          `/api/admin/tournaments/${form.slug}/registrations/${reg.id}`,
          { method: "DELETE" },
        );
        if (res.ok) {
          setMessage("Registration removed.");
          refreshLists();
        } else {
          const data = await res.json();
          setMessage(data.error ?? "Remove failed.");
        }
      },
    });
  }

  async function patchField(fields: Record<string, unknown>, successMsg = "Saved.") {
    const res = await fetch(`/api/admin/tournaments/${form.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Save failed.");
      return false;
    }
    if (data.tournament) {
      applySavedCupFields(data.tournament as CupFields);
    }
    setMessage(successMsg);
    return true;
  }

  async function saveAll() {
    setLoading(true);
    setMessage(null);

    if (form.autoManageStatus) {
      if (!form.registrationOpensAt || !form.startsAt || !form.endsAt) {
        setMessage("Auto-manage requires registration open, cup start, and cup end dates.");
        setLoading(false);
        return;
      }
      const opens = new Date(form.registrationOpensAt).getTime();
      const closes = new Date(form.startsAt).getTime() - 60_000;
      const ends = new Date(form.endsAt).getTime();
      if (opens >= closes) {
        setMessage("Registration must open before it closes (1 minute before cup start).");
        setLoading(false);
        return;
      }
      if (closes >= ends) {
        setMessage("Cup end must be after cup start.");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/admin/tournaments/${form.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          game: form.game,
          gameLabel: emptyToNull(form.gameLabel),
          status: form.status,
          description: emptyToNull(form.description),
          posterUrl: emptyToNull(form.posterUrl),
          hubBannerUrl: emptyToNull(form.hubBannerUrl),
          hubCarouselImages: form.hubCarouselImages,
          showOnEsportsHub: form.showOnEsportsHub,
          prizePool: form.prizePool ? Number(form.prizePool) : null,
          prizeNotes: emptyToNull(form.prizeNotes),
          prizeSplit: prizeSplitForSave(form.prizePool, form.prizeSplit, defaultSplit),
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          registrationOpensAt: form.registrationOpensAt || null,
          autoManageStatus: form.autoManageStatus,
          hideAfter: null,
          bracketUrl: emptyToNull(form.bracketUrl),
          rulebookUrl: emptyToNull(form.rulebookUrl),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Save failed.");
        return;
      }

      if (data.tournament) {
        applySavedCupFields(data.tournament as CupFields);
      }

      const mvpValue = mvp.trim();
      const mvpChanged = mvpValue !== savedMvpRef.current;

      if (mvpChanged) {
        const placements = mvpValue ? [{ role: "MVP" as const, teamLabel: mvpValue }] : [];
        const clearRoles = ["CHAMPION", "RUNNER_UP", "THIRD", ...(mvpValue ? [] : (["MVP"] as const))];

        const pRes = await fetch(`/api/admin/tournaments/${form.slug}/placements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placements, clearRoles }),
        });
        if (!pRes.ok) {
          const d = await pRes.json();
          setMessage(d.error ?? "MVP save failed.");
          return;
        }
        savedMvpRef.current = mvpValue;
      }

      setMessage("All changes successfully saved.");
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function requestDeleteCup() {
    openDeleteConfirm({
      title: `Delete ${form.name}?`,
      description: "This permanently removes the cup, teams, registrations, and results. This cannot be undone.",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/tournaments/${form.slug}`, { method: "DELETE" });
        if (res.ok) {
          router.push("/admin/tournaments");
          router.refresh();
        }
      },
    });
  }

  function requestRemoveTeam(teamId: string, teamName: string) {
    openDeleteConfirm({
      title: `Delete team "${teamName}"?`,
      description: "All players on this team will be removed from the cup page.",
      confirmLabel: "Delete team",
      onConfirm: async () => {
        await fetch(`/api/admin/tournaments/${form.slug}/teams/${teamId}`, { method: "DELETE" });
        refreshLists();
      },
    });
  }

  function requestRemovePlayer(teamId: string, playerId: string, playerName: string) {
    openDeleteConfirm({
      title: `Remove ${playerName}?`,
      description: "This player will be removed from the team on the cup page.",
      confirmLabel: "Remove player",
      onConfirm: async () => {
        await fetch(
          `/api/admin/tournaments/${form.slug}/teams/${teamId}/players/${playerId}`,
          { method: "DELETE" },
        );
        refreshLists();
      },
    });
  }

  function requestRemoveCarouselSlide(url: string) {
    openDeleteConfirm({
      title: "Remove hub slide?",
      description: "This image will no longer rotate on the esports hub registration card.",
      confirmLabel: "Remove slide",
      onConfirm: async () => {
        const next = form.hubCarouselImages.filter((u) => u !== url);
        setForm({ ...form, hubCarouselImages: next });
        await patchField({ hubCarouselImages: next }, "Slide removed.");
      },
    });
  }

  async function addTeam() {
    if (!newTeamName.trim()) return;
    const res = await fetch(`/api/admin/tournaments/${form.slug}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTeamName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewTeamName("");
      refreshLists();
    } else {
      setMessage(data.error ?? "Failed to add team.");
    }
  }

  async function addPlayer(teamId: string) {
    const poolId = poolPick[teamId]?.trim();
    const name = newPlayerNames[teamId]?.trim();

    if (poolId) {
      const res = await fetch(`/api/admin/tournaments/${form.slug}/teams/${teamId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: poolId }),
      });
      if (res.ok) {
        setPoolPick((prev) => ({ ...prev, [teamId]: "" }));
        refreshLists();
      }
      return;
    }

    if (!name) return;
    const res = await fetch(`/api/admin/tournaments/${form.slug}/teams/${teamId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    if (res.ok) {
      setNewPlayerNames((prev) => ({ ...prev, [teamId]: "" }));
      refreshLists();
    }
  }

  function updateSplit(i: number, field: keyof PrizeSplitRow, value: string) {
    const next = [...prizeSplitDisplay];
    const row = { ...next[i] };
    if (field === "amount") row.amount = Number(value) || 0;
    else if (field === "place") row.place = Number(value) || 1;
    else row.label = value;
    next[i] = row;
    setForm((f) => ({ ...f, prizeSplit: next }));
  }

  const editorTabs = [
    {
      id: "general",
      label: "General",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "media",
      label: "Media",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "prizes",
      label: "Prizes",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "standings",
      label: "Results & MVP",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a4 4 0 004-4V5H8v6a4 4 0 004 4zM12 15v4m-3 0h6M5 7h3m8 0h3M5 7a2 2 0 012-2m10 4a2 2 0 002-2" />
        </svg>
      ),
    },
    {
      id: "registrations",
      label: "Registrations",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: "teams",
      label: "Teams",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Save Notification alert */}
      {message ? (
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm text-white/70 flex items-center justify-between shadow-md">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {message}
          </span>
          <button type="button" onClick={() => setMessage(null)} className="text-white/40 hover:text-white">✕</button>
        </div>
      ) : null}

      {/* Sticky Top Editor Header bar */}
      <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400/90 uppercase tracking-widest">
            <span>Cup Editor</span>
            <span>·</span>
            <span className="text-white/45 font-medium lowercase">/{form.slug}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-white tracking-tight sm:text-3xl">{form.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={cupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04] hover:text-white transition-all"
          >
            View page
          </a>
          {isRegistrationOpen && (
            <a
              href={hubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 hover:text-white transition-all"
            >
              Esports Hub
            </a>
          )}
          <button
            type="button"
            onClick={requestDeleteCup}
            className="rounded-xl border border-rose-500/20 bg-rose-500/[0.02] px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            Delete Cup
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={loading}
            className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50 transition-all shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)]"
          >
            {loading ? "Saving…" : "Save all"}
          </button>
        </div>
      </div>

      {/* Editor Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-white/[0.06] pb-3">
        {editorTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setMessage(null);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide border transition-all duration-200 ${
                active
                  ? "bg-amber-500/[0.06] border-amber-500/25 text-amber-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                  : "border-transparent text-white/45 hover:bg-white/[0.02] hover:text-white/80"
              }`}
            >
              <span className={active ? "text-amber-400" : "text-white/40"}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6 pt-2">
        {/* Tab 1: General Info */}
        {activeTab === "general" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Name & Game Details"
              showsOn="Cups list, cup page title, and esports hub card"
              viewHref={cupUrl}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Cup Title</label>
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. VALORANT CUP II"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Game Title</label>
                  <select
                    className={inputClass}
                    value={form.game}
                    onChange={(e) => setForm({ ...form, game: e.target.value })}
                  >
                    <option value="VALORANT" className="bg-[#0a1020]">Valorant</option>
                    <option value="CS2" className="bg-[#0a1020]">CS2</option>
                    <option value="EA_FC26" className="bg-[#0a1020]">EA FC26</option>
                    <option value="OTHER" className="bg-[#0a1020]">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Game Subtitle / Format</label>
                <input
                  className={inputClass}
                  value={form.gameLabel ?? ""}
                  onChange={(e) => setForm({ ...form, gameLabel: e.target.value || null })}
                  placeholder="e.g. Auction Draft, 5v5 Competitive"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Description (displayed on Cup page)</label>
                <textarea
                  className={`${inputClass} min-h-[6rem] resize-y`}
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value || null })}
                  placeholder="Detail cup rules, timings, formats, and other relevant information..."
                />
              </div>
            </AdminSection>

            <AdminSection
              title="Status Settings"
              showsOn="Visual placement and hub registration control"
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Current Status</label>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="DRAFT" className="bg-[#0a1020]">Draft (admin only, hidden from cups list badge)</option>
                    <option value="UPCOMING" className="bg-[#0a1020]">Upcoming (announced, registration not open)</option>
                    <option value="REGISTRATION_OPEN" className="bg-[#0a1020]">Registration Open</option>
                    <option value="IN_PROGRESS" className="bg-[#0a1020]">Live (Ongoing)</option>
                    <option value="COMPLETED" className="bg-[#0a1020]">Completed</option>
                    <option value="CANCELLED" className="bg-[#0a1020]">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className={checkboxLabelClass}>
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-0"
                      checked={form.autoManageStatus}
                      onChange={(e) => setForm({ ...form, autoManageStatus: e.target.checked })}
                    />
                    <div>
                      <p className="font-semibold text-white/95">Auto-manage status from dates</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        Opens registration on the date below, goes Live 1 min before cup start, completes after cup end
                      </p>
                    </div>
                  </label>
                </div>

                {form.autoManageStatus ? (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/85">
                    Status updates automatically from your schedule. Turn this off to control status manually.
                  </p>
                ) : null}

                <div>
                  <label className={checkboxLabelClass}>
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-0"
                      checked={form.showOnEsportsHub}
                      onChange={(e) => setForm({ ...form, showOnEsportsHub: e.target.checked })}
                    />
                    <div>
                      <p className="font-semibold text-white/95">Feature on Esports Hub</p>
                      <p className="text-xs text-white/40 mt-0.5">Sorts first in the esports hub registration slideshow</p>
                    </div>
                  </label>
                </div>

                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    isRegistrationOpen
                      ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200/90"
                      : "border-white/[0.06] bg-white/[0.02] text-white/45"
                  }`}
                >
                  {isRegistrationOpen ? (
                    <p>
                      <strong className="text-emerald-300">Registration is live</strong>. Visible on{" "}
                      <a href={hubUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                        /esports
                      </a>{" "}
                      and the cup register form.
                      {form.autoManageStatus
                        ? " Auto-manage will close registration 1 minute before cup start."
                        : " Change status manually when you want to close it."}
                    </p>
                  ) : form.autoManageStatus ? (
                    <p>
                      Registration opens automatically on the scheduled date, or is currently closed.
                      Set dates in the schedule section below.
                    </p>
                  ) : (
                    <p>Set status to <strong>Registration Open</strong> and save to show the hub card and register form.</p>
                  )}
                </div>
              </div>
            </AdminSection>

            <AdminSection
              title="Cup rulebook"
              showsOn="Linked from the registration form when players agree to rules"
            >
              <RulebookUploadField
                label="Rulebook (PDF or Word)"
                prefix={`tournaments/${form.slug}/rulebook`}
                currentUrl={form.rulebookUrl}
                onUploaded={(url) => setForm({ ...form, rulebookUrl: url })}
                onUploadedComplete={async (url) => {
                  await patchField({ rulebookUrl: url }, "Cup rulebook saved.");
                }}
                onClear={async () => {
                  setForm({ ...form, rulebookUrl: null });
                  await patchField({ rulebookUrl: null }, "Cup rulebook removed.");
                }}
                hint="Upload the organizer's rulebook. Players must agree to it before registering."
              />
            </AdminSection>

            <AdminSection
              title="Tournament Schedule"
              showsOn={
                form.autoManageStatus
                  ? "Dates drive registration open, live, and completed status"
                  : "Display date on esports hub card and cup page"
              }
              viewHref={cupUrl}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Registration opens
                  </label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={toLocalDatetime(form.registrationOpensAt)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        registrationOpensAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                  />
                  <p className="text-xs text-white/35">
                    Registration closes automatically 1 minute before cup start. No separate end date needed.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Cup Tournament Starts</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={toLocalDatetime(form.startsAt)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        startsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Cup Tournament Ends</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={toLocalDatetime(form.endsAt)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        endsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
              </div>
            </AdminSection>
          </div>
        )}

        {/* Tab 2: Branding & Media */}
        {activeTab === "media" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Banner & Artwork Uploads"
              showsOn="Background layers on Esports Hub cards and individual detail heroes"
              viewHref={hubUrl}
              viewLabel="Esports Hub Preview"
            >
              <div className="space-y-6">
                <ImageUploadField
                  label="Esports Hub Card Background"
                  hint="Banner background overlay behind registration open cards on /esports"
                  prefix={`tournaments/${form.slug}/hub`}
                  currentUrl={form.hubBannerUrl}
                  onUploaded={(url) => setForm({ ...form, hubBannerUrl: url })}
                  onUploadedComplete={async (url) => {
                    await patchField({ hubBannerUrl: url }, "Hub background image saved.");
                  }}
                  onClear={async () => {
                    setForm({ ...form, hubBannerUrl: null });
                    await patchField({ hubBannerUrl: null }, "Hub background image removed.");
                  }}
                />

                <div className="border-t border-white/[0.04] pt-5">
                  <ImageUploadField
                    label="Cup Page Hero Poster"
                    hint="Large landscape banner displayed at the top of the individual cup details page"
                    prefix={`tournaments/${form.slug}/poster`}
                    currentUrl={form.posterUrl}
                    onUploaded={(url) => setForm({ ...form, posterUrl: url })}
                    onUploadedComplete={async (url) => {
                      await patchField({ posterUrl: url }, "Cup page poster image saved.");
                    }}
                    onClear={async () => {
                      setForm({ ...form, posterUrl: null });
                      await patchField({ posterUrl: null }, "Cup page poster removed.");
                    }}
                  />
                </div>

                <div className="border-t border-white/[0.04] pt-5">
                  <ImageUploadField
                    label="Additional Carousel Slides (Optional)"
                    hint="Upload multiple images to rotate as a slideshow on the Esports Hub. Overrides background image."
                    prefix={`tournaments/${form.slug}/carousel`}
                    onUploaded={(url) => {
                      const next = [...form.hubCarouselImages, url];
                      setForm({ ...form, hubCarouselImages: next });
                      void patchField({ hubCarouselImages: next }, "Carousel slide added.");
                    }}
                  />

                  {form.hubCarouselImages.length > 0 ? (
                    <div className="mt-4 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Active Slides ({form.hubCarouselImages.length})</p>
                      <div className="flex flex-wrap gap-3 pt-1">
                        {form.hubCarouselImages.map((url, idx) => (
                          <div key={url} className="relative group rounded-xl overflow-hidden border border-white/10 shadow-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Slide ${idx + 1}`} className="h-20 w-32 object-cover" />
                            <button
                              type="button"
                              onClick={() => requestRemoveCarouselSlide(url)}
                              className="absolute right-1.5 top-1.5 rounded-full bg-red-600/90 hover:bg-red-500 p-1 text-white shadow-md transition-colors"
                              title="Delete slide"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </AdminSection>
          </div>
        )}

        {/* Tab 3: Prizes */}
        {activeTab === "prizes" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Prizepool Amount & Split breakdown"
              showsOn="Prize money cards on the cup sidebar and info tables"
              viewHref={cupUrl}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Total Prizepool (₹)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.prizePool ?? ""}
                    onChange={(e) => setForm({ ...form, prizePool: e.target.value || null })}
                    placeholder="e.g. 15000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Prizepool Notes</label>
                  <input
                    className={inputClass}
                    value={form.prizeNotes ?? ""}
                    onChange={(e) => setForm({ ...form, prizeNotes: e.target.value || null })}
                    placeholder="e.g. MVP receives additional bonuses"
                  />
                </div>
              </div>

              <div className="border-t border-white/[0.04] pt-5 space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">Payout Distribution</h3>
                  <p className="text-xs text-white/40 mt-1">Split totals will dynamically allocate based on the values below.</p>
                </div>
                
                <div className="space-y-3">
                  {prizeSplitDisplay.map((row, i) => (
                    <div key={`${row.place}-${i}`} className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-full sm:w-1/4">
                        <span className="text-xs font-semibold text-white/55">Place #{row.place}</span>
                      </div>
                      <div className="w-full sm:flex-1">
                        <input
                          className={inputClass}
                          value={row.label}
                          onChange={(e) => updateSplit(i, "label", e.target.value)}
                          placeholder="Label (e.g. Champion)"
                        />
                      </div>
                      <div className="w-full sm:w-1/3">
                        <div className="relative">
                          <span className="absolute left-3 top-3.5 text-xs text-white/30 font-medium">₹</span>
                          <input
                            type="number"
                            className={`${inputClass} pl-7`}
                            value={row.amount}
                            onChange={(e) => updateSplit(i, "amount", e.target.value)}
                            placeholder="Amount"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AdminSection>
          </div>
        )}

        {/* Tab 4: Bracket & MVP */}
        {activeTab === "standings" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Bracket Link & MVP"
              showsOn="Challonge bracket on the cup page; MVP card in Final Results"
              viewHref={cupUrl}
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Challonge URL Link</label>
                  <input
                    className={inputClass}
                    value={form.bracketUrl ?? ""}
                    onChange={(e) => setForm({ ...form, bracketUrl: e.target.value || null })}
                    placeholder="e.g. https://challonge.com/jyln1rx4"
                  />
                  <p className="text-[10px] text-white/30 italic">
                    Winner and runner-up are loaded from this bracket. Links are verified and normalized automatically.
                  </p>
                </div>

                <div className="border-t border-white/[0.04] pt-5 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">MVP player</label>
                  <input
                    className={inputClass}
                    value={mvp}
                    onChange={(e) => setMvp(e.target.value)}
                    placeholder="MVP player or username"
                  />
                  <p className="text-xs text-white/40">
                    Optional. Shown on the cup page below the Challonge results. Click{" "}
                    <strong className="text-white/55">Save all</strong> to publish.
                  </p>
                </div>
              </div>
            </AdminSection>
          </div>
        )}

        {/* Tab: Registrations */}
        {activeTab === "registrations" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Cup registrations"
              showsOn="Player sign-ups with profile snapshots at registration time"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p className="text-sm text-white/45">{registrations.length} total</p>
                <a
                  href={`/api/admin/tournaments/${form.slug}/registrations/export`}
                  className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
                >
                  Export CSV
                </a>
              </div>

              <div className="mb-6 space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Add member</p>
                <div className="space-y-2">
                  <input
                    className={inputClass}
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setSelectedMember(null);
                    }}
                    placeholder="Search by name, email, or username…"
                  />
                  {memberResults.length > 0 && !selectedMember ? (
                    <ul className="max-h-40 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0a1020]/80">
                      {memberResults.map((m) => {
                        const label =
                          m.displayName ?? m.name ?? m.email ?? "Member";
                        return (
                          <li key={m.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMember({ id: m.id, label });
                                setMemberSearch(label);
                                setMemberResults([]);
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-white/75 hover:bg-white/[0.04]"
                            >
                              <span className="font-medium text-white/90">{label}</span>
                              {m.email ? (
                                <span className="ml-2 text-white/40">{m.email}</span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Role</label>
                    <select
                      className={inputClass}
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value as "PLAYER" | "CAPTAIN")}
                    >
                      <option value="PLAYER" className="bg-[#0a1020]">Player</option>
                      <option value="CAPTAIN" className="bg-[#0a1020]">Captain (creates team)</option>
                    </select>
                  </div>
                  {addRole === "CAPTAIN" ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Team name</label>
                      <input
                        className={inputClass}
                        value={addTeamName}
                        onChange={(e) => setAddTeamName(e.target.value)}
                        placeholder="Team name"
                      />
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={addMemberRegistration}
                  disabled={
                    addingMember ||
                    !selectedMember ||
                    (addRole === "CAPTAIN" && !addTeamName.trim())
                  }
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {addingMember ? "Adding…" : "Add to cup"}
                </button>
              </div>

              {registrations.length === 0 ? (
                <p className="text-sm text-white/35">No registrations yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                  <table className="min-w-full text-left text-xs text-white/70">
                    <thead className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] uppercase tracking-wider text-white/40">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Team</th>
                        {form.game === "CS2" ? (
                          <>
                            <th className="px-3 py-2">Steam64</th>
                            <th className="px-3 py-2">Hours</th>
                            <th className="px-3 py-2">Faceit</th>
                            <th className="px-3 py-2">Premier</th>
                          </>
                        ) : form.game === "EA_FC26" ? (
                          <>
                            <th className="px-3 py-2">Olympus</th>
                            <th className="px-3 py-2">Partner username</th>
                            <th className="px-3 py-2">Partner</th>
                          </>
                        ) : (
                          <>
                            <th className="px-3 py-2">Riot ID</th>
                            <th className="px-3 py-2">Rank</th>
                            <th className="px-3 py-2">Roles</th>
                          </>
                        )}
                        <th className="px-3 py-2">Registered</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((r) => (
                        <tr key={r.id} className="border-b border-white/[0.04]">
                          <td className="px-3 py-2 font-medium text-white/85">{r.displayName ?? "—"}</td>
                          <td className="px-3 py-2">{r.email ?? "—"}</td>
                          <td className="px-3 py-2">{r.participantRole === "CAPTAIN" ? "Captain" : "Player"}</td>
                          <td className="px-3 py-2">{r.teamName ?? "—"}</td>
                          {form.game === "CS2" ? (
                            <>
                              <td className="px-3 py-2 font-mono">{r.steamId64 ?? "—"}</td>
                              <td className="px-3 py-2">{r.cs2Hours != null ? Math.round(r.cs2Hours) : "—"}</td>
                              <td className="px-3 py-2">{r.cs2FaceitRank ?? "—"}</td>
                              <td className="px-3 py-2">{r.cs2PeakPremier ?? "—"}</td>
                            </>
                          ) : form.game === "EA_FC26" ? (
                            <>
                              <td className="px-3 py-2">{r.olympusId ?? "—"}</td>
                              <td className="px-3 py-2">{r.partnerUsername ?? "—"}</td>
                              <td className="px-3 py-2">{r.partnerName ?? "—"}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 font-mono">{r.riotId ?? "—"}</td>
                              <td className="px-3 py-2">{r.rankTier ?? "—"}</td>
                              <td className="px-3 py-2">{r.valorantRoles ?? "—"}</td>
                            </>
                          )}
                          <td className="px-3 py-2 whitespace-nowrap text-white/45">
                            {new Date(r.createdAt).toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => requestRemoveRegistration(r)}
                              className="rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-2.5 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/10"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminSection>
          </div>
        )}

        {/* Tab 5: Teams & Players */}
        {activeTab === "teams" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AdminSection
              title="Participating Teams"
              showsOn="Registered rosters displaying inside teams overlays"
              viewHref={cupUrl}
            >
              <div className="space-y-6">
                {/* Team Creation Form */}
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Add New Team Roster</p>
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Enter new team name"
                    />
                    <button
                      type="button"
                      onClick={addTeam}
                      className="shrink-0 rounded-xl bg-amber-500 px-5 text-xs font-semibold text-black hover:bg-amber-400 transition-colors"
                    >
                      Add Team
                    </button>
                  </div>
                </div>

                {/* Team Lists */}
                {tournamentTeams.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
                    No teams registered for this tournament yet.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {tournamentTeams.map((team) => (
                      <div key={team.id} className="rounded-xl border border-white/[0.06] bg-[#0c1424]/40 p-4.5 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {team.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={team.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                            ) : null}
                            <p className="font-bold text-white text-sm truncate">{team.name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => requestRemoveTeam(team.id, team.name)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove Team
                          </button>
                        </div>

                        {/* Player lists inside team */}
                        <ul className="space-y-1.5 min-h-[3rem]">
                          {team.players.length === 0 ? (
                            <p className="text-xs text-white/30 italic">No players added to this roster.</p>
                          ) : (
                            team.players.map((p) => (
                              <li key={p.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.03] px-3 py-1.5 text-xs text-white/70">
                                <span className="font-medium">{p.displayName}</span>
                                <button
                                  type="button"
                                  onClick={() => requestRemovePlayer(team.id, p.id, p.displayName)}
                                  className="text-red-400 hover:text-red-300 font-semibold"
                                >
                                  Remove
                                </button>
                              </li>
                            ))
                          )}
                        </ul>

                        {/* Add Player to this team */}
                        <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                          {poolPlayers.length > 0 ? (
                            <select
                              className={`${inputClass} text-xs py-2 px-3`}
                              value={poolPick[team.id] ?? ""}
                              onChange={(e) =>
                                setPoolPick((prev) => ({ ...prev, [team.id]: e.target.value }))
                              }
                            >
                              <option value="">Assign from player pool…</option>
                              {poolPlayers.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.displayName}
                                  {p.riotId ? ` (${p.riotId})` : p.steamId64 ? ` (${p.steamId64})` : ""}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          <div className="flex gap-2">
                            <input
                              className={`${inputClass} text-xs py-2 px-3`}
                              value={newPlayerNames[team.id] ?? ""}
                              onChange={(e) =>
                                setNewPlayerNames((prev) => ({ ...prev, [team.id]: e.target.value }))
                              }
                              placeholder="Or type player name"
                            />
                            <button
                              type="button"
                              onClick={() => addPlayer(team.id)}
                              className="shrink-0 rounded-xl bg-white/10 hover:bg-white/15 px-3.5 text-xs font-semibold text-white/80 transition-colors"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AdminSection>
          </div>
        )}
      </div>

      {DeleteConfirmDialog}
    </div>
  );
}
