"use client";

import { useEffect, useState } from "react";

type AuditRow = {
  id: string;
  action: string;
  target: string | null;
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

function actionColor(action: string) {
  if (action.includes("DELETE") || action.includes("REMOVE")) return "text-rose-300";
  if (action.includes("CREATE") || action.includes("ADD")) return "text-emerald-300";
  if (action.includes("UPDATE") || action.includes("SAVE") || action.includes("PATCH")) return "text-amber-300";
  return "text-white/60";
}

export default function AdminAuditLogPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audit-log?limit=10");
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/90">Admin Audit</p>
          <h2 className="mt-1 font-display text-lg font-bold text-white">Action Log</h2>
          <p className="mt-0.5 text-xs text-white/40">Last 10 admin actions performed on the platform.</p>
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

      <div className="mt-4 max-h-[360px] overflow-y-auto overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#0c1424] text-[10px] uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
            <tr>
              <th className="px-3 py-2.5 font-semibold">When (IST)</th>
              <th className="px-3 py-2.5 font-semibold">Admin</th>
              <th className="px-3 py-2.5 font-semibold">Action</th>
              <th className="px-3 py-2.5 font-semibold">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-white/75">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-white/35">Loading audit log…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-red-300/70">{error}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-white/35">No admin actions recorded yet.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="whitespace-nowrap px-3 py-2.5 text-white/45">{formatWhen(row.createdAt)}</td>
                  <td className="px-3 py-2.5 font-medium text-white/80">{row.adminName}</td>
                  <td className={`px-3 py-2.5 font-semibold ${actionColor(row.action)}`}>{row.action}</td>
                  <td className="px-3 py-2.5 text-white/50 max-w-[180px] truncate">{row.target ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
