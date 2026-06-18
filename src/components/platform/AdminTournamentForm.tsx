"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
  initial: {
    champion?: string;
    runnerUp?: string;
    mvp?: string;
    prizePool?: string;
    status?: string;
  };
};

export default function AdminTournamentForm({ slug, initial }: Props) {
  const router = useRouter();
  const [champion, setChampion] = useState(initial.champion ?? "");
  const [runnerUp, setRunnerUp] = useState(initial.runnerUp ?? "");
  const [mvp, setMvp] = useState(initial.mvp ?? "");
  const [prizePool, setPrizePool] = useState(initial.prizePool ?? "");
  const [status, setStatus] = useState(initial.status ?? "COMPLETED");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const placements = [];
      if (champion.trim()) placements.push({ role: "CHAMPION", teamLabel: champion.trim() });
      if (runnerUp.trim()) placements.push({ role: "RUNNER_UP", teamLabel: runnerUp.trim() });
      if (mvp.trim()) placements.push({ role: "MVP", teamLabel: mvp.trim() });

      if (placements.length > 0) {
        const pRes = await fetch(`/api/admin/tournaments/${slug}/placements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placements }),
        });
        if (!pRes.ok) {
          const d = await pRes.json();
          setMessage(d.error ?? "Failed to save placements.");
          return;
        }
      }

      const tRes = await fetch(`/api/admin/tournaments/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          prizePool: prizePool ? Number(prizePool) : undefined,
        }),
      });
      if (!tRes.ok) {
        const d = await tRes.json();
        setMessage(d.error ?? "Failed to update tournament.");
        return;
      }

      setMessage("Saved.");
      router.refresh();
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md space-y-4 rounded-[1.25rem] border border-amber-500/15 bg-amber-500/[0.04] p-6"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-amber-400/90">
        Admin · {slug}
      </p>
      <input
        type="text"
        placeholder="Champion"
        value={champion}
        onChange={(e) => setChampion(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
      />
      <input
        type="text"
        placeholder="Runner-up"
        value={runnerUp}
        onChange={(e) => setRunnerUp(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
      />
      <input
        type="text"
        placeholder="MVP"
        value={mvp}
        onChange={(e) => setMvp(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
      />
      <input
        type="number"
        placeholder="Prizepool (₹)"
        value={prizePool}
        onChange={(e) => setPrizePool(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white focus:outline-none"
      >
        <option value="DRAFT" className="bg-[#0a1020]">Draft</option>
        <option value="UPCOMING" className="bg-[#0a1020]">Upcoming</option>
        <option value="REGISTRATION_OPEN" className="bg-[#0a1020]">Registration open</option>
        <option value="IN_PROGRESS" className="bg-[#0a1020]">In progress</option>
        <option value="COMPLETED" className="bg-[#0a1020]">Completed</option>
      </select>
      {message ? <p className="text-sm text-white/55">{message}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-amber-500/20 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
