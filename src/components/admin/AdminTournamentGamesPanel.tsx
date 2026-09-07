"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseApiJson } from "@/lib/parse-api-json";

type TeamOption = {
  id: string;
  name: string;
  players: { id: string }[];
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-[#0a1020]/40 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Import custom games</h3>
          <p className="mt-1 text-xs text-white/45">
            Pick two cup teams, then scan Henrik custom history for every roster player on both
            teams. Matching 5v5 lobbies are saved as candidates to publish on the public Matches
            tab.
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
