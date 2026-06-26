"use client";

import { useEffect, useState, useCallback } from "react";
import { parseApiJson } from "@/lib/parse-api-json";

type RefreshRunRow = {
  id: string;
  kind?: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  totalPlayers: number;
  successCount: number;
  failedCount: number;
  henrikRequestCount: number;
  errorMessage: string | null;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function refreshRunStatusLabel(status: string): string {
  switch (status) {
    case "RUNNING":
      return "Running";
    case "COMPLETE":
      return "Complete";
    case "ERROR":
      return "Error";
    case "SKIPPED":
      return "Skipped";
    default:
      return status;
  }
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

export default function DailyRefreshRunsPanel() {
  const [refreshRuns, setRefreshRuns] = useState<RefreshRunRow[]>([]);
  const [lastCompletedRefreshAt, setLastCompletedRefreshAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRefreshRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leaderboard/refresh-runs?limit=15&kind=daily");
      const parsed = await parseApiJson(res);
      if (!parsed.ok || !res.ok) return;
      setRefreshRuns((parsed.data.runs as RefreshRunRow[]) ?? []);
      setLastCompletedRefreshAt((parsed.data.lastCompletedRefreshAt as string | null) ?? null);
    } catch (e) {
      console.error("Failed to load daily refresh runs", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRefreshRuns();
  }, [loadRefreshRuns]);

  return (
    <section className="flex flex-col h-[540px] rounded-2xl border border-white/[0.06] bg-[#0c1424]/40 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-start justify-between border-b border-white/[0.06] pb-4 shrink-0">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/90">Leaderboard Cron</p>
          <h3 className="mt-1 font-display text-base font-bold text-white">Daily refresh runs</h3>
          <p className="mt-0.5 text-[10px] text-white/40">
            Last completed: <span className="font-semibold text-white/60">{formatWhen(lastCompletedRefreshAt)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={loadRefreshRuns}
          disabled={loading}
          className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-[10px] font-semibold text-white/60 hover:text-white disabled:opacity-50 transition-colors"
        >
          {loading ? "Loading…" : "Reload"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mt-4 rounded-xl border border-white/[0.06]">
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#0c1424] text-[10px] uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
            <tr>
              <th className="px-3 py-2 font-semibold">Started (IST)</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Players</th>
              <th className="px-3 py-2 font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-white/75">
            {refreshRuns.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-white/35">
                  {loading ? "Loading runs…" : "No daily runs yet."}
                </td>
              </tr>
            ) : (
              refreshRuns.map((run) => (
                <tr key={run.id} className={`${run.status === "ERROR" ? "bg-red-500/5" : ""} hover:bg-white/[0.01]`}>
                  <td className="whitespace-nowrap px-3 py-2.5">{formatWhen(run.startedAt)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        run.status === "RUNNING"
                          ? "text-violet-300"
                          : run.status === "COMPLETE"
                            ? "text-emerald-300"
                            : run.status === "ERROR"
                              ? "text-red-300"
                              : "text-white/55"
                      }
                    >
                      {refreshRunStatusLabel(run.status)}
                    </span>
                    {run.errorMessage ? (
                      <div className="mt-0.5 text-[9px] text-red-300 max-w-[150px] truncate" title={run.errorMessage}>
                        {run.errorMessage}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    {run.successCount} ok
                    {run.failedCount > 0 ? ` · ${run.failedCount} fail` : ""}
                  </td>
                  <td className="px-3 py-2.5">{formatDuration(run.durationMs)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
