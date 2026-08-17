"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminSection } from "@/components/admin/AdminSection";
import { ROSTER_GAME_PRESETS, ROSTER_SLOT_MAX_PLAYERS } from "@/lib/roster-games";
import { formatRankLabel } from "@/lib/valorant-rank";
import type { RosterCandidateView } from "@roster-listings/index";

type LeaderboardRow = {
  game: string;
  rankTier: string | null;
  rankTierId: number | null;
};

type Player = {
  id: string;
  userId: string;
  roleLabel: string | null;
  bio: string | null;
  sortOrder: number;
  user: {
    riotGameName: string | null;
    riotTagLine: string | null;
    steamPersonaName: string | null;
    steamId64: string | null;
    playerProfile: {
      displayName: string;
      valorantRoles: string[];
      cs2FaceitRank: string | null;
      cs2PeakPremierRank: string | null;
    } | null;
    name: string | null;
    leaderboard: LeaderboardRow[];
  };
};

type Team = {
  id: string;
  gameKey: string;
  gameLabel: string;
  status: string;
  sortOrder: number;
  players: Player[];
};

const CS2_ROSTER_ROLES = ["AWPer", "Entry", "Support", "Lurker", "Rifler"] as const;
const IGL_SLOT_INDEX = 2; // Slot 3 (middle)

function usesSlotGrid(gameKey: string) {
  return gameKey === "valorant" || gameKey === "cs2";
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30";

function riotId(user: { riotGameName: string | null; riotTagLine: string | null }) {
  if (!user.riotGameName || !user.riotTagLine) return null;
  return `${user.riotGameName}#${user.riotTagLine}`;
}

function inGameName(gameKey: string, user: Player["user"]) {
  if (gameKey === "valorant") return riotId(user);
  if (gameKey === "cs2") return user.steamPersonaName ?? user.steamId64;
  return user.playerProfile?.displayName ?? user.name;
}

function rankForGame(gameKey: string, user: Player["user"]) {
  const game = gameKey === "valorant" ? "VALORANT" : gameKey === "cs2" ? "CS2" : null;
  const row = game ? user.leaderboard.find((l) => l.game === game) : user.leaderboard[0];
  if (row?.rankTierId || row?.rankTier) {
    return formatRankLabel(row.rankTierId, row.rankTier);
  }
  if (gameKey === "cs2") {
    return user.playerProfile?.cs2FaceitRank ?? user.playerProfile?.cs2PeakPremierRank ?? null;
  }
  return null;
}

function candidateRankLabel(gameKey: string, c: RosterCandidateView) {
  if (c.rankTierId || c.rankTier) return formatRankLabel(c.rankTierId, c.rankTier);
  if (gameKey === "cs2") return c.cs2FaceitRank ?? c.cs2PeakPremierRank;
  return null;
}

type AdminMemberSearchRow = {
  id: string;
  email: string | null;
  name: string | null;
  displayName: string | null;
  riotId: string | null;
  steamId64: string | null;
  steamPersonaName: string | null;
  valorantRoles?: string[];
  cs2FaceitRank?: string | null;
  cs2PeakPremierRank?: string | null;
  valorantRankTier?: string | null;
  valorantRankTierId?: number | null;
  cs2RankTier?: string | null;
  cs2RankTierId?: number | null;
};

function memberToCandidate(gameKey: string, member: AdminMemberSearchRow): RosterCandidateView {
  const isValorant = gameKey === "valorant";
  const isCs2 = gameKey === "cs2";
  return {
    id: member.id,
    displayName: member.displayName ?? member.name ?? member.email ?? "Player",
    email: member.email,
    inGameName: isValorant
      ? member.riotId
      : isCs2
        ? member.steamPersonaName ?? member.steamId64
        : member.displayName ?? member.name,
    rankTier: isValorant ? member.valorantRankTier ?? null : isCs2 ? member.cs2RankTier ?? null : null,
    rankTierId: isValorant
      ? member.valorantRankTierId ?? null
      : isCs2
        ? member.cs2RankTierId ?? null
        : null,
    roles: member.valorantRoles ?? [],
    cs2FaceitRank: member.cs2FaceitRank ?? null,
    cs2PeakPremierRank: member.cs2PeakPremierRank ?? null,
    steamPersonaName: member.steamPersonaName,
  };
}

async function readApiError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
  } catch {
    // ignore non-JSON bodies
  }
  return fallback;
}

type Props = {
  initialTeams: Team[];
};

export default function AdminRosterPanel({ initialTeams }: Props) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [selectedKey, setSelectedKey] = useState(initialTeams[0]?.gameKey ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const team = teams.find((t) => t.gameKey === selectedKey);

  const [newGameKey, setNewGameKey] = useState("valorant");
  const [newGameLabel, setNewGameLabel] = useState("Valorant");
  const [customGame, setCustomGame] = useState(false);

  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<RosterCandidateView[]>([]);
  const [selectedMember, setSelectedMember] = useState<RosterCandidateView | null>(null);
  const [addRoleLabel, setAddRoleLabel] = useState("");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [replaceSlot, setReplaceSlot] = useState(false);
  const [searchingMembers, setSearchingMembers] = useState(false);

  function selectTeam(gameKey: string) {
    setSelectedKey(gameKey);
    setMemberSearch("");
    setMemberResults([]);
    setSelectedMember(null);
    setAddRoleLabel("");
    setActiveSlot(null);
    setReplaceSlot(false);
  }

  const searchMembers = useCallback(async () => {
    if (!team) return;
    const q = memberSearch.trim();
    if (q.length < 2) {
      setMemberResults([]);
      setSearchingMembers(false);
      return;
    }

    setSearchingMembers(true);
    try {
      const res = await fetch(
        `/api/admin/members?search=${encodeURIComponent(q)}&limit=8`,
      );
      if (!res.ok) {
        setMemberResults([]);
        setMessage(await readApiError(res, "Could not search NTG members."));
        return;
      }

      const data = await res.json();
      const users = Array.isArray(data.users) ? (data.users as AdminMemberSearchRow[]) : [];
      const onRoster = new Set(team.players.map((p) => p.userId));
      setMemberResults(
        users
          .filter((member) => !onRoster.has(member.id))
          .map((member) => memberToCandidate(team.gameKey, member)),
      );
    } catch {
      setMemberResults([]);
      setMessage("Could not search NTG members.");
    } finally {
      setSearchingMembers(false);
    }
  }, [memberSearch, team]);

  useEffect(() => {
    if (selectedMember) return;
    const timer = setTimeout(searchMembers, 250);
    return () => clearTimeout(timer);
  }, [searchMembers, selectedMember]);

  useEffect(() => {
    if (selectedMember || memberResults.length === 0) return;
    const q = memberSearch.trim().toLowerCase();
    if (!q) return;

    const exact = memberResults.find((m) => {
      if (m.email?.toLowerCase() === q) return true;
      if (m.displayName.toLowerCase() === q) return true;
      if (m.inGameName?.toLowerCase() === q) return true;
      return false;
    });

    const pick = exact ?? (q.includes("@") && memberResults.length === 1 ? memberResults[0] : null);
    if (!pick) return;

    setSelectedMember(pick);
    setMemberSearch(pick.displayName);
    setMemberResults([]);
  }, [memberResults, memberSearch, selectedMember]);

  async function refresh() {
    const res = await fetch("/api/admin/roster");
    if (!res.ok) {
      setMessage(await readApiError(res, "Could not refresh roster."));
      return;
    }
    const data = await res.json();
    if (data.teams) setTeams(data.teams);
    router.refresh();
  }

  async function createTeam() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameKey: newGameKey,
        gameLabel: newGameLabel,
        status: "RECRUITING",
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Create failed.");
      return;
    }
    setMessage("Roster team created.");
    await refresh();
    selectTeam(newGameKey);
  }

  async function saveTeam() {
    if (!team) return;
    setLoading(true);
    setMessage(null);

    const res = await fetch(`/api/admin/roster/${team.gameKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameLabel: team.gameLabel,
        status: team.status,
        sortOrder: team.sortOrder,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Save failed.");
      return;
    }
    setMessage("Roster saved.");
    await refresh();
  }

  async function addPlayer(slotIndex?: number) {
    if (!team || !selectedMember) return;
    const sortOrder = slotIndex ?? activeSlot;
    if (usesSlotGrid(team.gameKey) && sortOrder === null) {
      setMessage("Pick a slot (1-5) first.");
      return;
    }
    if (
      team.gameKey === "cs2" &&
      addRoleLabel.trim().toUpperCase() === "IGL" &&
      sortOrder !== IGL_SLOT_INDEX
    ) {
      setMessage("IGL can only be assigned to Slot 3.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/admin/roster/${encodeURIComponent(team.gameKey)}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedMember.id,
        roleLabel: addRoleLabel.trim() || undefined,
        ...(sortOrder !== null && sortOrder !== undefined ? { sortOrder } : {}),
        ...(replaceSlot && sortOrder !== null && sortOrder !== undefined ? { replace: true } : {}),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Add failed.");
      return;
    }
    setMemberSearch("");
    setMemberResults([]);
    setSelectedMember(null);
    setAddRoleLabel("");
    setActiveSlot(null);
    setReplaceSlot(false);
    setMessage(sortOrder !== null && sortOrder !== undefined ? `Player ${sortOrder + 1} assigned.` : "Player added.");
    await refresh();
  }

  function openSlot(slotIndex: number, replace = false) {
    setActiveSlot(slotIndex);
    setReplaceSlot(replace);
    setMemberSearch("");
    setMemberResults([]);
    setSelectedMember(null);
    setAddRoleLabel("");
    setMessage(null);
  }

  function playerInSlot(slotIndex: number) {
    return team?.players.find((p) => p.sortOrder === slotIndex) ?? null;
  }

  async function removePlayer(playerId: string, slotIndex?: number) {
    if (!team) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(
      `/api/admin/roster/${encodeURIComponent(team.gameKey)}/players?playerId=${encodeURIComponent(playerId)}`,
      { method: "DELETE" },
    );
    setLoading(false);
    if (!res.ok) {
      setMessage(await readApiError(res, "Could not remove player."));
      return;
    }
    setMessage("Player removed.");
    if (slotIndex !== undefined) {
      openSlot(slotIndex, false);
    }
    await refresh();
  }

  function updateTeamField<K extends keyof Team>(key: K, value: Team[K]) {
    if (!team) return;
    setTeams((prev) =>
      prev.map((t) => (t.gameKey === team.gameKey ? { ...t, [key]: value } : t)),
    );
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
          {message}
        </p>
      ) : null}

      <AdminSection title="Add game roster" showsOn="Public /esports/roster game tabs">
        <div className="grid gap-3 sm:grid-cols-2">
          {!customGame ? (
            <select
              className={inputClass}
              value={newGameKey}
              onChange={(e) => {
                const preset = ROSTER_GAME_PRESETS.find((g) => g.key === e.target.value);
                setNewGameKey(e.target.value);
                setNewGameLabel(preset?.label ?? e.target.value);
              }}
            >
              {ROSTER_GAME_PRESETS.map((g) => (
                <option key={g.key} value={g.key} className="bg-[#0a1020]">
                  {g.label}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input
                className={inputClass}
                placeholder="game-key"
                value={newGameKey}
                onChange={(e) => setNewGameKey(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Display label"
                value={newGameLabel}
                onChange={(e) => setNewGameLabel(e.target.value)}
              />
            </>
          )}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-white/50">
          <input type="checkbox" checked={customGame} onChange={(e) => setCustomGame(e.target.checked)} />
          Custom game (manual key + label)
        </label>
        <button
          type="button"
          onClick={createTeam}
          disabled={loading}
          className="mt-4 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
        >
          Create roster
        </button>
      </AdminSection>

      {teams.length > 0 ? (
        <AdminSection title="Manage roster" showsOn="Roster page per game" viewHref="/esports/roster" viewLabel="View roster">
          <div className="flex flex-wrap gap-2 mb-6">
            {teams.map((t) => (
              <button
                key={t.gameKey}
                type="button"
                onClick={() => selectTeam(t.gameKey)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  t.gameKey === selectedKey
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-white/10 text-white/50"
                }`}
              >
                {t.gameLabel}
              </button>
            ))}
          </div>

          {team ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Game label
                  </label>
                  <input
                    className={inputClass}
                    value={team.gameLabel}
                    onChange={(e) => updateTeamField("gameLabel", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Status
                  </label>
                  <select
                    className={inputClass}
                    value={team.status}
                    onChange={(e) => updateTeamField("status", e.target.value)}
                  >
                    <option value="ACTIVE" className="bg-[#0a1020]">Active (show roster)</option>
                    <option value="RECRUITING" className="bg-[#0a1020]">Recruiting (applications open)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={saveTeam}
                disabled={loading}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Save roster settings
              </button>

              <div className="border-t border-white/[0.06] pt-6 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Roster slots</p>
                  <p className="mt-1 text-xs text-white/35">
                    Assign NTG members to each slot. Profile data (in-game name, roles, rank) is pulled automatically. You just pick the member and assign their primary role.
                  </p>
                </div>

                {team && usesSlotGrid(team.gameKey) ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {Array.from({ length: ROSTER_SLOT_MAX_PLAYERS }, (_, slotIndex) => {
                      const assigned = playerInSlot(slotIndex);
                      const isActive = activeSlot === slotIndex;
                      const displayName =
                        assigned?.user.playerProfile?.displayName ?? assigned?.user.name ?? null;
                      const ign = assigned ? inGameName(team.gameKey, assigned.user) : null;
                      const rank = assigned ? rankForGame(team.gameKey, assigned.user) : null;
                      const slotLabel = `Slot ${slotIndex + 1}`;

                      return (
                        <div
                          key={slotIndex}
                          className={`rounded-xl border p-4 transition-colors ${
                            isActive
                              ? "border-indigo-500/40 bg-indigo-500/[0.06]"
                              : assigned
                                ? "border-white/[0.08] bg-white/[0.03]"
                                : "border-dashed border-white/10 bg-white/[0.01]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                              {slotLabel}
                              {slotIndex === IGL_SLOT_INDEX ? (
                                <span className="ml-1 text-yellow-500/80">· IGL</span>
                              ) : null}
                            </p>
                            {assigned ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => removePlayer(assigned.id, slotIndex)}
                                  disabled={loading}
                                  className="text-[10px] text-rose-300 hover:text-rose-200 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : null}
                          </div>

                          {assigned && displayName ? (
                            <div className="mt-3 space-y-1">
                              <p className="text-sm font-semibold text-white">{displayName}</p>
                              <div className="space-y-0.5 text-[11px] text-white/45">
                                {ign ? <p>IGN: {ign}</p> : null}
                                {assigned.roleLabel ? <p>Role: {assigned.roleLabel}</p> : null}
                                {rank ? <p>Rank: {rank}</p> : null}
                                {assigned.bio ? (
                                  <p className="italic text-white/50">&ldquo;{assigned.bio}&rdquo;</p>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openSlot(slotIndex, false)}
                              className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 py-6 text-white/35 transition-colors hover:border-indigo-500/30 hover:bg-indigo-500/[0.04] hover:text-white/60"
                            >
                              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/15 text-lg">
                                +
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider">Assign member</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : team.players.length === 0 ? (
                  <p className="text-sm text-white/35">No players assigned.</p>
                ) : (
                  <ul className="space-y-2">
                    {team.players.map((p) => {
                      const displayName = p.user.playerProfile?.displayName ?? p.user.name ?? "Player";
                      const ign = inGameName(team.gameKey, p.user);
                      const rank = rankForGame(team.gameKey, p.user);
                      return (
                        <li
                          key={p.id}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="text-sm font-medium text-white">{displayName}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/45">
                                {ign ? <span>IGN: {ign}</span> : null}
                                {p.roleLabel ? <span>Role: {p.roleLabel}</span> : null}
                                {rank ? <span>Rank: {rank}</span> : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removePlayer(p.id)}
                              disabled={loading}
                              className="shrink-0 text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {team && usesSlotGrid(team.gameKey) ? (
                  activeSlot !== null ? (
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                        {replaceSlot ? "Replace" : "Assign"} Slot {activeSlot + 1}
                        {activeSlot === IGL_SLOT_INDEX ? " (IGL slot)" : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlot(null);
                          setReplaceSlot(false);
                        }}
                        className="text-[10px] text-white/40 hover:text-white/70"
                      >
                        Cancel
                      </button>
                    </div>

                    {replaceSlot && playerInSlot(activeSlot) ? (
                      <p className="text-xs text-white/45">
                        Replacing{" "}
                        <span className="text-white/70">
                          {playerInSlot(activeSlot)?.user.playerProfile?.displayName ??
                            playerInSlot(activeSlot)?.user.name ??
                            "current player"}
                        </span>
                        . Pick a new NTG member below.
                      </p>
                    ) : null}

                    <input
                      className={inputClass}
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setSelectedMember(null);
                      }}
                      placeholder="Search members by name, email, or in-game ID…"
                    />

                    {memberSearch.trim().length > 0 && memberSearch.trim().length < 2 ? (
                      <p className="text-[11px] text-white/35">Type at least 2 characters to search.</p>
                    ) : null}

                    {searchingMembers ? (
                      <p className="text-[11px] text-white/35">Searching NTG members…</p>
                    ) : null}

                    {memberSearch.trim().length >= 2 &&
                    !searchingMembers &&
                    memberResults.length === 0 &&
                    !selectedMember ? (
                      <p className="text-[11px] text-white/35">No matching NTG members found.</p>
                    ) : null}

                    {memberResults.length > 0 && !selectedMember ? (
                      <ul className="max-h-52 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0a1020]/90 divide-y divide-white/[0.04]">
                        {memberResults.map((m) => {
                          const rank = candidateRankLabel(team.gameKey, m);
                          return (
                            <li key={m.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMember(m);
                                  setMemberSearch(m.displayName);
                                  setMemberResults([]);
                                }}
                                className="w-full px-3 py-2.5 text-left hover:bg-white/[0.04]"
                              >
                                <p className="text-xs font-medium text-white/90">{m.displayName}</p>
                                <p className="mt-0.5 text-[10px] text-white/40">
                                  {[m.email, m.inGameName, m.roles.length ? m.roles.join(" · ") : null, rank]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}

                    {selectedMember ? (
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Profile preview</p>
                        <div className="grid gap-1 text-xs text-white/70 sm:grid-cols-2">
                          <p>
                            <span className="text-white/40">Name:</span> {selectedMember.displayName}
                          </p>
                          {selectedMember.email ? (
                            <p>
                              <span className="text-white/40">Email:</span> {selectedMember.email}
                            </p>
                          ) : null}
                          {selectedMember.inGameName ? (
                            <p>
                              <span className="text-white/40">In-game:</span> {selectedMember.inGameName}
                            </p>
                          ) : null}
                          {selectedMember.roles.length ? (
                            <p>
                              <span className="text-white/40">Roles:</span> {selectedMember.roles.join(", ")}
                            </p>
                          ) : null}
                          {candidateRankLabel(team.gameKey, selectedMember) ? (
                            <p>
                              <span className="text-white/40">Rank:</span>{" "}
                              {candidateRankLabel(team.gameKey, selectedMember)}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMember(null);
                            setMemberSearch("");
                          }}
                          className="text-[10px] text-white/40 hover:text-white/70"
                        >
                          Clear selection
                        </button>
                      </div>
                    ) : null}

                    <div>
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                        Role label
                      </label>
                      {team?.gameKey === "cs2" ? (
                        <select
                          className={inputClass}
                          value={addRoleLabel}
                          onChange={(e) => setAddRoleLabel(e.target.value)}
                        >
                          <option value="" disabled className="bg-[#0a1020]">
                            Select a role…
                          </option>
                          {(activeSlot === IGL_SLOT_INDEX
                            ? [...CS2_ROSTER_ROLES, "IGL"]
                            : [...CS2_ROSTER_ROLES]
                          ).map((role) => (
                            <option key={role} value={role} className="bg-[#0a1020]">
                              {role === "IGL" ? "IGL (In-Game Leader)" : role}
                            </option>
                          ))}
                        </select>
                      ) : selectedMember ? (() => {
                        const isVal = team?.gameKey === "valorant";
                        const isFlex = isVal && selectedMember.roles.length === 4;
                        const roles = isFlex ? ["Flex"] : [...selectedMember.roles];

                        if (isVal && activeSlot === IGL_SLOT_INDEX) {
                          roles.push("IGL");
                        }
                        
                        if (roles.length === 0) {
                          return <p className="text-sm text-white/50 py-2">No roles selected in profile.</p>;
                        }
                        
                        if (roles.length === 1 && roles[0] === "Flex") {
                           return <div className="rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white/70">Role automatically set to Flex</div>;
                        }
                        
                        return (
                          <select
                            className={inputClass}
                            value={addRoleLabel}
                            onChange={(e) => setAddRoleLabel(e.target.value)}
                          >
                            {!roles.includes(addRoleLabel) ? (
                              <option value="" disabled className="bg-[#0a1020]">Select a role...</option>
                            ) : null}
                            {roles.map(r => (
                              <option key={r} value={r} className="bg-[#0a1020]">{r === "IGL" ? "IGL (In-Game Leader)" : r}</option>
                            ))}
                          </select>
                        );
                      })() : (
                        <div className="rounded-xl border border-dashed border-white/10 bg-[#0a1020]/30 px-4 py-2.5 text-sm text-white/30">
                          Select a member to choose a role
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => addPlayer(activeSlot ?? undefined)}
                      disabled={loading || !selectedMember || activeSlot === null}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {replaceSlot
                        ? `Replace Slot ${activeSlot !== null ? activeSlot + 1 : ""}`
                        : activeSlot !== null
                          ? `Assign to Slot ${activeSlot + 1}`
                          : "Assign to slot"}
                    </button>
                  </div>
                  ) : (
                    <p className="text-xs text-white/35">
                      Click a vacant slot to assign a member, or use Replace on a filled slot.
                    </p>
                  )
                ) : (
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      Add from NTG members
                    </p>
                    <input
                      className={inputClass}
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setSelectedMember(null);
                      }}
                      placeholder="Search members by name, email, or in-game ID…"
                    />
                    <button
                      type="button"
                      onClick={() => addPlayer()}
                      disabled={loading || !selectedMember}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      Add to roster
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </AdminSection>
      ) : null}
    </div>
  );
}
