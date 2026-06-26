"use client";

import { useEffect, useState, useCallback } from "react";
import { parseApiJson } from "@/lib/parse-api-json";

type AuditRow = {
  id: string;
  displayName: string | null;
  riotId: string | null;
  source: string;
  runId: string | null;
  previousRankTier: string | null;
  previousMmr: number | null;
  newRankTier: string | null;
  newMmr: number | null;
  changed: boolean;
  error: string | null;
  createdAt: string;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function sourceLabel(source: string): string {
  switch (source) {
    case "HOURLY_CRON":
      return "Hourly cron";
    case "CRON":
      return "Daily cron";
    case "MANUAL":
      return "Manual refresh";
    case "PROFILE":
      return "Profile sync";
    case "RIOT_LINK":
      return "Riot link";
    case "REGISTRATION":
      return "Registration";
    case "ADMIN_MEMBER":
      return "Admin refresh";
    default:
      return source;
  }
}

export default function RankChangeAuditPanel() {
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [changedOnly, setChangedOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "50",
        changedOnly: changedOnly ? "true" : "false",
      });
      const res = await fetch(`/api/admin/leaderboard/audit?${params}`);
      const parsed = await parseApiJson(res);
      if (!parsed.ok || !res.ok) return;
      setAuditRows((parsed.data.rows as AuditRow[]) ?? []);
    } catch (e) {
      console.error("Failed to load rank change audit", e);
    } finally {
      setLoading(false);
    }
  }, [changedOnly]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  return (
    <section className="flex flex-col h-[540px] rounded-2xl border border-white/[0.06] bg-[#0c1424]/40 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-4 shrink-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/90">Rank History</p>
          <h3 className="mt-1 font-display text-base font-bold text-white">Rank change audit</h3>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[10px] text-white/50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={changedOnly}
              onChange={(e) => setChangedOnly(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-0 w-3 h-3"
            />
            Changes only
          </label>
          <button
            type="button"
            onClick={loadAudit}
            disabled={loading}
            className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/60 hover:text-white disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading…" : "Reload"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-4 rounded-xl border border-white/[0.06]">
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#0c1424] text-[10px] uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
            <tr>
              <th className="px-3 py-2 font-semibold">When (IST)</th>
              <th className="px-3 py-2 font-semibold">Player</th>
              <th className="px-3 py-2 font-semibold">Source</th>
              <th className="px-3 py-2 font-semibold">Previous</th>
              <th className="px-3 py-2 font-semibold">New</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-white/75">
            {auditRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-white/35">
                  {loading ? "Loading audit log…" : "No audit entries yet."}
                </td>
              </tr>
            ) : (
              auditRows.map((row) => (
                <tr key={row.id} className={`${row.error ? "bg-red-500/5" : ""} hover:bg-white/[0.01]`}>
                  <td className="whitespace-nowrap px-3 py-2.5 text-white/40">{formatWhen(row.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-white/80">{row.displayName ?? "—"}</div>
                    <div className="text-[9px] text-white/35">{row.riotId ?? ""}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        row.source === "CRON"
                          ? "text-violet-300"
                          : row.source === "HOURLY_CRON"
                            ? "text-amber-300"
                            : row.source === "MANUAL"
                              ? "text-cyan-300"
                              : "text-white/55"
                      }
                    >
                      {sourceLabel(row.source)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-white/60">
                    {row.error ? (
                      <span className="text-red-300">{row.error}</span>
                    ) : (
                      <>
                        {row.previousRankTier ?? "—"}
                        {row.previousMmr != null ? (
                          <span className="text-white/35"> · {row.previousMmr}</span>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.error ? (
                      "—"
                    ) : (
                      <>
                        <span className={row.changed ? "font-semibold text-emerald-300" : "text-white/60"}>
                          {row.newRankTier ?? "—"}
                        </span>
                        {row.newMmr != null ? (
                          <span className="text-white/35"> · {row.newMmr}</span>
                        ) : null}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
