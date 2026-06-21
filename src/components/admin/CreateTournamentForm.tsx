"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200";

export default function CreateTournamentForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [game, setGame] = useState("VALORANT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slug || name, game }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create.");
        return;
      }
      setIsOpen(false);
      setName("");
      setSlug("");
      router.push(`/admin/tournaments/${data.slug}`);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group flex items-center justify-center gap-2 w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.01] px-5 py-6 text-sm font-semibold text-white/60 transition-all duration-250 hover:border-amber-500/30 hover:bg-amber-500/[0.02] hover:text-amber-200"
      >
        <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span>Create New Tournament Cup</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] p-6 shadow-xl backdrop-blur-sm animate-in fade-in slide-in-from-top-3 duration-200"
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">New Tournament Cup</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setError(null);
          }}
          className="text-white/40 hover:text-white/80 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/45">Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AUC CUP I"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/45">Slug (Optional URL key)</label>
          <input
            className={inputClass}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. auc-cup-1"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/45">Game Title</label>
        <select
          className={inputClass}
          value={game}
          onChange={(e) => setGame(e.target.value)}
        >
          <option value="VALORANT" className="bg-[#0a1020]">Valorant</option>
          <option value="CS2" className="bg-[#0a1020]">CS2</option>
          <option value="EA_FC26" className="bg-[#0a1020]">EA FC26</option>
          <option value="OTHER" className="bg-[#0a1020]">Other</option>
        </select>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-400">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setError(null);
          }}
          className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span>Creating…</span>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Create Cup</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

