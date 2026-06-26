"use client";

import { useEffect, useState } from "react";
import { formatAuditCategory, formatAuditOperation } from "@/lib/admin-audit-format";

type AuditRow = {
  id: string;
  action: string;
  target: string | null;
  targetLabel: string;
  createdAt: string;
  adminName: string;
  metadata: unknown;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function categoryTone(category: string) {
  switch (category) {
    case "Tournament":
      return "text-violet-300";
    case "Member":
      return "text-amber-300";
    case "Leaderboard":
      return "text-cyan-300";
    case "Media":
      return "text-emerald-300";
    default:
      return "text-white/60";
  }
}

export default function AdminAuditLogPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audit-log?limit=all");
      const data = await res.json();
      if (res.ok) {
        setRows(data.logs ?? []);
      } else {
        setError(data.error ?? "Failed to load audit log.");
      }
    } catch {
      setError("Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#0c1424]/40 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/90">Admin activity</p>
          <h2 className="mt-1 font-display text-lg font-bold text-white">What happened</h2>
          <p className="mt-0.5 text-xs text-white/40">
            {loading
              ? "Loading admin activity…"
              : rows.length > 0
                ? `${rows.length} recorded action${rows.length === 1 ? "" : "s"}.`
                : "A plain-language log of changes made in the admin panel."}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white disabled:opacity-50 transition-colors"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="mt-4 max-h-[500px] overflow-y-auto overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#0c1424] text-[10px] uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
            <tr>
              <th className="px-3 py-2.5 font-semibold">When (IST)</th>
              <th className="px-3 py-2.5 font-semibold">Who</th>
              <th className="px-3 py-2.5 font-semibold">Area</th>
              <th className="px-3 py-2.5 font-semibold">What happened</th>
              <th className="px-3 py-2.5 font-semibold">Affected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-white/75">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-white/35">Loading activity log…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-red-300/70">{error}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-white/35">No admin actions recorded yet.</td>
              </tr>
            ) : (
              rows.map((row) => {
                const category = formatAuditCategory(row.action);
                return (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="whitespace-nowrap px-3 py-2.5 text-white/45">{formatWhen(row.createdAt)}</td>
                    <td className="px-3 py-2.5 font-medium text-white/80">{row.adminName}</td>
                    <td className={`px-3 py-2.5 font-semibold whitespace-nowrap ${categoryTone(category)}`}>
                      {category}
                    </td>
                    <td className="px-3 py-2.5 text-white/70 max-w-[280px]">
                      {formatAuditOperation(row.action, row.metadata)}
                    </td>
                    <td className="px-3 py-2.5 text-white/55 max-w-[160px] truncate" title={row.targetLabel}>
                      {row.targetLabel}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
