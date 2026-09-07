"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseApiJson } from "@/lib/parse-api-json";

type TeamOption = {
  id: string;
  name: string;
  players: {
    id: string;
    displayName: string;
    riotGameName: string | null;
    riotTagLine: string | null;
  }[];
};

type PlayerStandardCustomPreview = {
  matchId: string;
  mapName: string | null;
  startedAt: string | null;
  gameLengthSec: number | null;
  scoreLabel: string | null;
  alreadyImported: boolean;
  qualifies: boolean | null;
  teamAPresent: number | null;
  teamBPresent: number | null;
};

type GamePlayer = {
  id: string;
  riotId: string;
  side: "Red" | "Blue";
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  hsPercent: number;
  rankTier: string | null;
  teamId: string | null;
};

type GameRow = {
  id: string;
  henrikMatchId: string;
  mapName: string | null;
  startedAt: string | null;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamARounds: number;
  teamBRounds: number;
  teamAPresent: number;
  teamBPresent: number;
  status: "CANDIDATE" | "PUBLISHED" | "HIDDEN";
  mvpRiotId: string | null;
  mvpAcs: number | null;
  players: GamePlayer[];
};

type Props = {
  slug: string;
  teams: TeamOption[];
};

function formatWhen(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export default function AdminTournamentGamesPanel({ slug, teams }: Props) {
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [minPlayersInput, setMinPlayersInput] = useState("5");
  const [historySizeInput, setHistorySizeInput] = useState("20");
  const [games, setGames] = useState<GameRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [playerGames, setPlayerGames] = useState<PlayerStandardCustomPreview[]>([]);
  const [playerMeta, setPlayerMeta] = useState<{ name: string; team: string; riotId: string } | null>(
    null,
  );
  const [selectedPlayerMatches, setSelectedPlayerMatches] = useState<Set<string>>(new Set());
  const [loadingPlayerHistory, setLoadingPlayerHistory] = useState(false);
  const [importingPlayerMatches, setImportingPlayerMatches] = useState(false);

  const cupPlayers = useMemo(
    () =>
      teams.flatMap((team) =>
        team.players.map((player) => ({
          ...player,
          teamId: team.id,
          teamName: team.name,
          label: `${player.displayName || "Player"} (${team.name})${
            player.riotGameName && player.riotTagLine
              ? ` · ${player.riotGameName}#${player.riotTagLine}`
              : ""
          }`,
        })),
      ),
    [teams],
  );

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-40), line]);
  }, []);

  const loadGames = useCallback(async () => {
    const res = await fetch(`/api/admin/tournaments/${slug}/games`);
    const parsed = await parseApiJson(res);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    if (!res.ok) {
      setError(typeof parsed.data.error === "string" ? parsed.data.error : "Failed to load games.");
      return;
    }
    setGames((parsed.data.games as GameRow[] | undefined) ?? []);
    setError(null);
  }, [slug]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  const candidates = useMemo(
    () => games.filter((g) => g.status === "CANDIDATE"),
    [games],
  );
  const published = useMemo(
    () => games.filter((g) => g.status === "PUBLISHED" || g.status === "HIDDEN"),
    [games],
  );

  async function runScan() {
    if (!teamAId || !teamBId || teamAId === teamBId) {
      setError("Pick two different teams.");
      return;
    }
    setScanning(true);
    setError(null);
    setLog([]);
    pushLog("Starting Henrik custom-match scan…");

    const parsedMinPlayers = Number(minPlayersInput);
    const parsedHistorySize = Number(historySizeInput);
    const minPlayers = Number.isFinite(parsedMinPlayers) && parsedMinPlayers > 0
      ? Math.floor(parsedMinPlayers)
      : 5;
    const historySize = Number.isFinite(parsedHistorySize) && parsedHistorySize > 0
      ? Math.floor(parsedHistorySize)
      : 20;

    let cursor = 0;
    let done = false;
    try {
      while (!done) {
        const res = await fetch(`/api/admin/tournaments/${slug}/games/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamAId,
            teamBId,
            cursor,
            minPlayersPerTeam: minPlayers,
            historySize,
          }),
        });
        const parsed = await parseApiJson(res);
        if (!parsed.ok) {
          setError(parsed.message);
          pushLog(parsed.message);
          break;
        }
        const data = parsed.data;
        if (!res.ok) {
          const msg = typeof data.error === "string" ? data.error : "Scan failed.";
          setError(msg);
          pushLog(msg);
          break;
        }
        if (typeof data.teamAResolved === "number" && cursor === 0) {
          pushLog(
            `Resolved roster: Team A ${data.teamAResolved}, Team B ${data.teamBResolved}`,
          );
        }
        if (typeof data.progress === "string") pushLog(data.progress);
        if (Array.isArray(data.found) && data.found.length) {
          pushLog(`Found ${data.found.length} candidate match(es) in this chunk.`);
        }
        cursor = typeof data.cursor === "number" ? data.cursor : cursor;
        done = !!data.done;
      }
      await loadGames();
      pushLog("Scan complete.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed.";
      setError(msg);
      pushLog(msg);
    } finally {
      setScanning(false);
    }
  }

  async function publishSelected() {
    const ids = [...selected];
    if (!ids.length) {
      setError("Select at least one candidate to publish.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${slug}/games/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameIds: ids }),
      });
      const parsed = await parseApiJson(res);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      if (!res.ok) {
        setError(typeof parsed.data.error === "string" ? parsed.data.error : "Publish failed.");
        return;
      }
      setSelected(new Set());
      const count = typeof parsed.data.count === "number" ? parsed.data.count : ids.length;
      pushLog(`Published ${count} match(es).`);
      await loadGames();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(gameId: string, status: "PUBLISHED" | "HIDDEN" | "CANDIDATE") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${slug}/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const parsed = await parseApiJson(res);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      if (!res.ok) {
        setError(typeof parsed.data.error === "string" ? parsed.data.error : "Update failed.");
        return;
      }
      await loadGames();
    } finally {
      setBusy(false);
    }
  }

  async function removeGame(gameId: string) {
    if (!confirm("Delete this stored match?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${slug}/games/${gameId}`, {
        method: "DELETE",
      });
      const parsed = await parseApiJson(res);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      if (!res.ok) {
        setError(typeof parsed.data.error === "string" ? parsed.data.error : "Delete failed.");
        return;
      }
      await loadGames();
    } finally {
      setBusy(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePlayerMatch(matchId: string) {
    setSelectedPlayerMatches((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  async function loadPlayerHistory() {
    if (!playerId) {
      setError("Select a player first.");
      return;
    }
    setLoadingPlayerHistory(true);
    setError(null);
    setPlayerGames([]);
    setPlayerMeta(null);
    setSelectedPlayerMatches(new Set());
    try {
      const parsedMinPlayers = Number(minPlayersInput);
      const minPlayers = Number.isFinite(parsedMinPlayers) && parsedMinPlayers > 0
        ? Math.floor(parsedMinPlayers)
        : 5;

      const res = await fetch(`/api/admin/tournaments/${slug}/games/player-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamPlayerId: playerId,
          teamAId: teamAId || undefined,
          teamBId: teamBId || undefined,
          limit: 10,
          minPlayersPerTeam: minPlayers,
        }),
      });
      const parsed = await parseApiJson(res);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      if (!res.ok) {
        setError(typeof parsed.data.error === "string" ? parsed.data.error : "Failed to load history.");
        return;
      }
      setPlayerMeta({
        name: typeof parsed.data.playerName === "string" ? parsed.data.playerName : "Player",
        team: typeof parsed.data.teamName === "string" ? parsed.data.teamName : "",
        riotId: typeof parsed.data.riotId === "string" ? parsed.data.riotId : "",
      });
      setPlayerGames(
        (parsed.data.games as PlayerStandardCustomPreview[] | undefined) ?? [],
      );
      pushLog(
        `Loaded ${((parsed.data.games as unknown[] | undefined) ?? []).length} standard custom game(s) for ${parsed.data.playerName ?? "player"}.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load player history.";
      setError(msg);
    } finally {
      setLoadingPlayerHistory(false);
    }
  }

  async function importSelectedPlayerMatches() {
    const matchIds = [...selectedPlayerMatches];
    if (!matchIds.length) {
      setError("Select at least one match to import.");
      return;
    }
    if (!teamAId || !teamBId || teamAId === teamBId) {
      setError("Pick Team A and Team B before importing.");
      return;
    }
    setImportingPlayerMatches(true);
    setError(null);
    try {
      const parsedMinPlayers = Number(minPlayersInput);
      const minPlayers = Number.isFinite(parsedMinPlayers) && parsedMinPlayers > 0
        ? Math.floor(parsedMinPlayers)
        : 5;

      const res = await fetch(`/api/admin/tournaments/${slug}/games/import-matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAId,
          teamBId,
          matchIds,
          minPlayersPerTeam: minPlayers,
        }),
      });
      const parsed = await parseApiJson(res);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      if (!res.ok) {
        setError(typeof parsed.data.error === "string" ? parsed.data.error : "Import failed.");
        return;
      }
      const imported = Array.isArray(parsed.data.imported) ? parsed.data.imported.length : 0;
      const skipped = Array.isArray(parsed.data.skipped) ? parsed.data.skipped.length : 0;
      pushLog(`Imported ${imported} match(es) from player history (${skipped} skipped).`);
      if (Array.isArray(parsed.data.skipped)) {
        for (const row of parsed.data.skipped as Array<{ matchId?: string; reason?: string }>) {
          if (row.matchId && row.reason) pushLog(`Skipped ${row.matchId}: ${row.reason}`);
        }
      }
      setSelectedPlayerMatches(new Set());
      await loadGames();
      await loadPlayerHistory();
    } finally {
      setImportingPlayerMatches(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-[#0a1020]/40 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Import custom games</h3>
          <p className="mt-1 text-xs text-white/45">
            Pick two cup teams, scan Henrik for shared custom lobbies, then publish selected matches
            to the public Matches tab.
          </p>
        </div>

        {teams.length < 2 ? (
          <p className="text-sm text-amber-200/80">
            Need at least two teams with rosters before scanning.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-xs text-white/50">
              Team A
              <select
                className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-3 py-2.5 text-sm text-white"
                value={teamAId}
                onChange={(e) => setTeamAId(e.target.value)}
                disabled={scanning}
              >
                <option value="">Select…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.players.length})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-white/50">
              Team B
              <select
                className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-3 py-2.5 text-sm text-white"
                value={teamBId}
                onChange={(e) => setTeamBId(e.target.value)}
                disabled={scanning}
              >
                <option value="">Select…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.players.length})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-white/50">
              Min players / team
              <input
                type="number"
                min={1}
                max={6}
                className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-3 py-2.5 text-sm text-white"
                value={minPlayersInput}
                onChange={(e) => setMinPlayersInput(e.target.value)}
                disabled={scanning}
              />
            </label>
            <label className="space-y-1 text-xs text-white/50">
              History size
              <input
                type="number"
                min={5}
                max={30}
                className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-3 py-2.5 text-sm text-white"
                value={historySizeInput}
                onChange={(e) => setHistorySizeInput(e.target.value)}
                disabled={scanning}
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runScan()}
            disabled={scanning || busy || teams.length < 2}
            className="rounded-full bg-amber-500 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0a1020] disabled:opacity-40"
          >
            {scanning ? "Scanning…" : "Scan matches"}
          </button>
          <button
            type="button"
            onClick={() => void publishSelected()}
            disabled={scanning || busy || selected.size === 0}
            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200 disabled:opacity-40"
          >
            Publish selected ({selected.size})
          </button>
          <button
            type="button"
            onClick={() => void loadGames()}
            disabled={scanning || busy}
            className="rounded-full border border-white/15 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 disabled:opacity-40"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        {log.length > 0 ? (
          <pre className="max-h-40 overflow-auto rounded-xl border border-white/[0.06] bg-black/30 p-3 text-[11px] leading-relaxed text-white/55">
            {log.join("\n")}
          </pre>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0a1020]/40 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Scan by player (standard custom)</h3>
          <p className="mt-1 text-xs text-white/45">
            Standard/normal customs use Henrik&apos;s Unrated mode (not competitive custom). Pick a
            player who was in the lobby, load their last 10 games, then import matches that overlap
            with Team A and Team B above.
          </p>
        </div>

        {cupPlayers.length === 0 ? (
          <p className="text-sm text-amber-200/80">No roster players available.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-white/50">
              Player
              <select
                className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-3 py-2.5 text-sm text-white"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                disabled={loadingPlayerHistory || importingPlayerMatches}
              >
                <option value="">Select…</option>
                {cupPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => void loadPlayerHistory()}
                disabled={
                  loadingPlayerHistory ||
                  importingPlayerMatches ||
                  busy ||
                  scanning ||
                  !playerId
                }
                className="rounded-full bg-sky-500 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0a1020] disabled:opacity-40"
              >
                {loadingPlayerHistory ? "Loading…" : "Load last 10 games"}
              </button>
              <button
                type="button"
                onClick={() => void importSelectedPlayerMatches()}
                disabled={
                  loadingPlayerHistory ||
                  importingPlayerMatches ||
                  busy ||
                  scanning ||
                  selectedPlayerMatches.size === 0 ||
                  !teamAId ||
                  !teamBId
                }
                className="rounded-full border border-sky-500/40 bg-sky-500/10 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200 disabled:opacity-40"
              >
                {importingPlayerMatches
                  ? "Importing…"
                  : `Import selected (${selectedPlayerMatches.size})`}
              </button>
            </div>
          </div>
        )}

        {playerMeta ? (
          <p className="text-xs text-white/50">
            Showing standard customs for{" "}
            <span className="text-white/80">{playerMeta.name}</span>
            {playerMeta.team ? ` (${playerMeta.team})` : ""}
            {playerMeta.riotId ? ` · ${playerMeta.riotId}` : ""}
            {teamAId && teamBId && teamAId !== teamBId
              ? " · overlap checked against selected teams"
              : " · select Team A & B to see overlap badges"}
          </p>
        ) : null}

        {playerGames.length > 0 ? (
          <ul className="space-y-2">
            {playerGames.map((g) => {
              const disabled =
                g.alreadyImported ||
                g.qualifies === false ||
                importingPlayerMatches ||
                loadingPlayerHistory;
              return (
                <li
                  key={g.matchId}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlayerMatches.has(g.matchId)}
                    onChange={() => togglePlayerMatch(g.matchId)}
                    disabled={disabled}
                    className="accent-sky-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">
                      {g.mapName ?? "Unknown map"}
                      {g.scoreLabel ? ` · ${g.scoreLabel}` : ""}
                    </p>
                    <p className="text-[11px] text-white/40">
                      {formatWhen(g.startedAt)}
                      {g.teamAPresent != null && g.teamBPresent != null
                        ? ` · A ${g.teamAPresent} · B ${g.teamBPresent}`
                        : ""}
                      {g.alreadyImported ? " · already imported" : ""}
                    </p>
                  </div>
                  {g.qualifies === true ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                      qualifies
                    </span>
                  ) : g.qualifies === false ? (
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-200">
                      low overlap
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : playerId && !loadingPlayerHistory ? (
          <p className="text-sm text-white/40">
            No standard custom history found for this player, or load games to preview.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0a1020]/40 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">
          Candidates ({candidates.length})
        </h3>
        {candidates.length === 0 ? (
          <p className="text-sm text-white/40">No candidates yet. Run a scan after teams play customs.</p>
        ) : (
          <ul className="space-y-2">
            {candidates.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={selected.has(g.id)}
                  onChange={() => toggleSelect(g.id)}
                  className="accent-amber-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    {g.mapName ?? "Unknown map"} · {g.teamAName} {g.teamARounds}-{g.teamBRounds}{" "}
                    {g.teamBName}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {formatWhen(g.startedAt)} · A {g.teamAPresent} present · B {g.teamBPresent} present
                    {g.mvpRiotId ? ` · MVP ${g.mvpRiotId} (${g.mvpAcs} ACS)` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-[11px] uppercase tracking-wider text-rose-300/80"
                  onClick={() => void removeGame(g.id)}
                  disabled={busy}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0a1020]/40 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">
          Published / hidden ({published.length})
        </h3>
        {published.length === 0 ? (
          <p className="text-sm text-white/40">Nothing published yet.</p>
        ) : (
          <ul className="space-y-2">
            {published.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    g.status === "PUBLISHED"
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {g.status}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    {g.mapName ?? "Unknown map"} · {g.teamAName} {g.teamARounds}-{g.teamBRounds}{" "}
                    {g.teamBName}
                  </p>
                  <p className="text-[11px] text-white/40">{formatWhen(g.startedAt)}</p>
                </div>
                {g.status === "PUBLISHED" ? (
                  <button
                    type="button"
                    className="text-[11px] uppercase tracking-wider text-white/50"
                    onClick={() => void setStatus(g.id, "HIDDEN")}
                    disabled={busy}
                  >
                    Hide
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-[11px] uppercase tracking-wider text-emerald-300/80"
                    onClick={() => void setStatus(g.id, "PUBLISHED")}
                    disabled={busy}
                  >
                    Unhide
                  </button>
                )}
                <button
                  type="button"
                  className="text-[11px] uppercase tracking-wider text-rose-300/80"
                  onClick={() => void removeGame(g.id)}
                  disabled={busy}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
