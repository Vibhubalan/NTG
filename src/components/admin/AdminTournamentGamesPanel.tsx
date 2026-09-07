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

type SearchCandidate = {
  matchId: string;
  mapName: string | null;
  startedAt: string | null;
  teamAHits: number;
  teamBHits: number;
  alreadyImported: boolean;
};

type SeriesGroup = {
  id: string;
  startedAt: string | null;
  maps: string[];
  matchIds: string[];
  previews: SearchCandidate[];
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

function parseMatchIdList(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

export default function AdminTournamentGamesPanel({ slug, teams }: Props) {
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [minPlayersInput, setMinPlayersInput] = useState("5");
  const [historySizeInput, setHistorySizeInput] = useState("20");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pasteIds, setPasteIds] = useState("");
  const [games, setGames] = useState<GameRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchCandidates, setSearchCandidates] = useState<SearchCandidate[]>([]);
  const [searchSeries, setSearchSeries] = useState<SeriesGroup[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
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

  const parsedMinPlayers = Number(minPlayersInput);
  const parsedHistorySize = Number(historySizeInput);
  const minPlayers =
    Number.isFinite(parsedMinPlayers) && parsedMinPlayers > 0
      ? Math.floor(parsedMinPlayers)
      : 5;
  const historySize =
    Number.isFinite(parsedHistorySize) && parsedHistorySize > 0
      ? Math.floor(parsedHistorySize)
      : 20;

  function validateTeams(): boolean {
    if (!teamAId || !teamBId || teamAId === teamBId) {
      setError("Pick two different teams.");
      return false;
    }
    return true;
  }

  async function runSearch() {
    if (!validateTeams()) return;
    setSearching(true);
    setError(null);
    setLog([]);
    setSearchCandidates([]);
    setSearchSeries([]);
    setSelectedMatchIds(new Set());
    pushLog("Searching Henrik history across both rosters…");

    try {
      const res = await fetch(`/api/admin/tournaments/${slug}/games/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAId,
          teamBId,
          historySize,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      });
      const parsed = await parseApiJson(res);
      if (!parsed.ok) {
        setError(parsed.message);
        pushLog(parsed.message);
        return;
      }
      const data = parsed.data;
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Search failed.";
        setError(msg);
        pushLog(msg);
        return;
      }

      const rows = (data.candidates as SearchCandidate[] | undefined) ?? [];
      const series = (data.series as SeriesGroup[] | undefined) ?? [];
      setSearchCandidates(rows);
      setSearchSeries(series);

      const importable = rows.filter((r) => !r.alreadyImported).map((r) => r.matchId);
      setSelectedMatchIds(new Set(importable));

      if (typeof data.progress === "string") pushLog(data.progress);
      if (typeof data.teamAResolved === "number") {
        pushLog(`Roster: Team A ${data.teamAResolved}, Team B ${data.teamBResolved}`);
      }
      pushLog(`Found ${rows.length} cross-team match(es) in ${series.length} series group(s).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed.";
      setError(msg);
      pushLog(msg);
    } finally {
      setSearching(false);
    }
  }

  async function importMatchIds(matchIds: string[], label: string) {
    if (!validateTeams()) return;
    if (!matchIds.length) {
      setError("No matches to import.");
      return;
    }

    setImporting(true);
    setError(null);
    pushLog(`${label}: importing ${matchIds.length} match(es)…`);

    let importedTotal = 0;
    let skippedTotal = 0;
    const importedHenrikIds = new Set<string>();
    const batchSize = 10;

    try {
      for (let i = 0; i < matchIds.length; i += batchSize) {
        const batch = matchIds.slice(i, i + batchSize);
        const res = await fetch(`/api/admin/tournaments/${slug}/games/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamAId,
            teamBId,
            matchIds: batch,
            minPlayersPerTeam: minPlayers,
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
          const msg = typeof data.error === "string" ? data.error : "Import failed.";
          setError(msg);
          pushLog(msg);
          break;
        }

        const imported = Array.isArray(data.imported) ? data.imported.length : 0;
        const skipped = Array.isArray(data.skipped) ? data.skipped.length : 0;
        importedTotal += imported;
        skippedTotal += skipped;

        if (Array.isArray(data.imported)) {
          for (const row of data.imported as Array<{ henrikMatchId?: string }>) {
            if (row.henrikMatchId) importedHenrikIds.add(row.henrikMatchId);
          }
        }

        if (Array.isArray(data.skipped)) {
          for (const row of data.skipped as Array<{ matchId: string; reason: string }>) {
            pushLog(`Skipped ${row.matchId.slice(0, 8)}…: ${row.reason}`);
          }
        }
      }

      pushLog(`Import done: ${importedTotal} saved, ${skippedTotal} skipped.`);
      await loadGames();
      if (importedHenrikIds.size > 0) {
        setSearchCandidates((prev) =>
          prev.map((c) => ({
            ...c,
            alreadyImported: c.alreadyImported || importedHenrikIds.has(c.matchId),
          })),
        );
        setSelectedMatchIds((prev) => {
          const next = new Set(prev);
          for (const id of importedHenrikIds) next.delete(id);
          return next;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      setError(msg);
      pushLog(msg);
    } finally {
      setImporting(false);
    }
  }

  async function importSelected() {
    const ids = [...selectedMatchIds].filter((id) => {
      const row = searchCandidates.find((c) => c.matchId === id);
      return row && !row.alreadyImported;
    });
    await importMatchIds(ids, "Import selected");
  }

  async function importAllSearchResults() {
    const ids = searchCandidates.filter((c) => !c.alreadyImported).map((c) => c.matchId);
    await importMatchIds(ids, "Import all search results");
  }

  async function importPastedIds() {
    const ids = parseMatchIdList(pasteIds);
    if (!ids.length) {
      setError("Paste one or more Henrik match IDs.");
      return;
    }
    await importMatchIds(ids, "Import pasted IDs");
  }

  async function importSeries(series: SeriesGroup) {
    const ids = series.previews.filter((p) => !p.alreadyImported).map((p) => p.matchId);
    await importMatchIds(ids, `Import series (${series.maps.join(", ") || "unknown maps"})`);
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

  function toggleMatchId(matchId: string) {
    setSelectedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  const actionDisabled = searching || importing || busy;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-[#0a1020]/40 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Import custom games</h3>
          <p className="mt-1 text-xs text-white/45">
            Search Henrik custom + unrated history for all roster players on both teams. Matches
            corroborated across teams appear in the preview — import selected ones or an entire
            BO5 series before publishing on the public Matches tab.
          </p>
        </div>

        {teams.length < 2 ? (
          <p className="text-sm text-amber-200/80">
            Need at least two teams with rosters before searching.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-xs text-white/50">
              Team A
              <select
                className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-3 py-2.5 text-sm text-white"
                value={teamAId}
                onChange={(e) => setTeamAId(e.target.value)}
                disabled={actionDisabled}
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
                disabled={actionDisabled}
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
                disabled={actionDisabled}
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
                disabled={actionDisabled}
              />
            </label>
            <label className="space-y-1 text-xs text-white/50">
              Date from
              <input
                type="date"
                className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-3 py-2.5 text-sm text-white"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={actionDisabled}
              />
            </label>
            <label className="space-y-1 text-xs text-white/50">
              Date to
              <input
                type="date"
                className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-3 py-2.5 text-sm text-white"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={actionDisabled}
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={actionDisabled || teams.length < 2}
            className="rounded-full bg-amber-500 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0a1020] disabled:opacity-40"
          >
            {searching ? "Searching…" : "Search matches"}
          </button>
          <button
            type="button"
            onClick={() => void importSelected()}
            disabled={actionDisabled || selectedMatchIds.size === 0 || !searchCandidates.length}
            className="rounded-full border border-sky-500/40 bg-sky-500/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200 disabled:opacity-40"
          >
            {importing ? "Importing…" : `Import selected (${selectedMatchIds.size})`}
          </button>
          <button
            type="button"
            onClick={() => void importAllSearchResults()}
            disabled={
              actionDisabled ||
              !searchCandidates.some((c) => !c.alreadyImported)
            }
            className="rounded-full border border-sky-500/40 bg-sky-500/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200 disabled:opacity-40"
          >
            Import all results
          </button>
          <button
            type="button"
            onClick={() => void publishSelected()}
            disabled={actionDisabled || selected.size === 0}
            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200 disabled:opacity-40"
          >
            Publish selected ({selected.size})
          </button>
          <button
            type="button"
            onClick={() => void loadGames()}
            disabled={actionDisabled}
            className="rounded-full border border-white/15 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 disabled:opacity-40"
          >
            Refresh
          </button>
        </div>

        <label className="block space-y-1 text-xs text-white/50">
          Paste Henrik match IDs (space or comma separated)
          <textarea
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-3 py-2.5 text-sm text-white font-mono"
            value={pasteIds}
            onChange={(e) => setPasteIds(e.target.value)}
            disabled={actionDisabled}
            placeholder="24415582-399b-4d3b-ac98-8cd8fbb33e55"
          />
        </label>
        <button
          type="button"
          onClick={() => void importPastedIds()}
          disabled={actionDisabled || !pasteIds.trim()}
          className="rounded-full border border-white/15 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 disabled:opacity-40"
        >
          Import pasted IDs
        </button>

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

      {searchCandidates.length > 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0a1020]/40 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">
            Search results ({searchCandidates.length})
          </h3>

          {searchSeries.length > 1 || searchSeries.some((s) => s.matchIds.length > 1) ? (
            <div className="space-y-2">
              <p className="text-xs text-white/45">BO5-style series (4h window)</p>
              {searchSeries.map((series) => (
                <div
                  key={series.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">
                      {series.maps.join(" · ") || "Unknown maps"} · {series.matchIds.length} map(s)
                    </p>
                    <p className="text-[11px] text-white/40">{formatWhen(series.startedAt)}</p>
                  </div>
                  <button
                    type="button"
                    className="text-[11px] uppercase tracking-wider text-sky-300/80"
                    onClick={() => void importSeries(series)}
                    disabled={actionDisabled}
                  >
                    Import series
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <ul className="space-y-2">
            {searchCandidates.map((c) => (
              <li
                key={c.matchId}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={selectedMatchIds.has(c.matchId)}
                  onChange={() => toggleMatchId(c.matchId)}
                  disabled={c.alreadyImported || actionDisabled}
                  className="accent-amber-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    {c.mapName ?? "Unknown map"}
                    {c.alreadyImported ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-emerald-300/80">
                        imported
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {formatWhen(c.startedAt)} · A {c.teamAHits} hits · B {c.teamBHits} hits ·{" "}
                    <span className="font-mono">{c.matchId.slice(0, 8)}…</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/[0.06] bg-[#0a1020]/40 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">
          Candidates ({candidates.length})
        </h3>
        {candidates.length === 0 ? (
          <p className="text-sm text-white/40">
            No candidates yet. Search and import matches after teams play customs.
          </p>
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
                    {formatWhen(g.startedAt)} · A {g.teamAPresent} present · B {g.teamBPresent}{" "}
                    present
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
