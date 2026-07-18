"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminSection } from "@/components/admin/AdminSection";

type Badge = {
  id: string;
  label: string;
  awardedAt: string;
  tournamentName: string | null;
  user: { id: string; name: string | null; email: string | null; displayName: string | null };
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200";

export default function AdminBadgesPanel({
  initialBadges,
  tournaments,
}: {
  initialBadges: Badge[];
  tournaments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [tournamentId, setTournamentId] = useState("");
  const [type, setType] = useState<"WINNER" | "RUNNER_UP">("WINNER");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    { id: string; email: string | null; name: string | null; displayName: string | null }[]
  >([]);
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);
  const [awarding, setAwarding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/admin/members?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setResults(data.users);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  async function awardBadge() {
    if (!selected || !tournamentId) return;
    setAwarding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, tournamentId, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Could not award badge.");
        return;
      }
      setSelected(null);
      setSearch("");
      setResults([]);
      setTournamentId("");
      setType("WINNER");
      setMessage("Badge awarded.");
      router.refresh();
    } finally {
      setAwarding(false);
    }
  }

  async function removeBadge(id: string) {
    const res = await fetch(`/api/admin/badges?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Badge removed.");
      router.refresh();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Remove failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Player Badges</h1>
        <p className="mt-1 text-sm text-white/40">
          Award a permanent badge to a player&apos;s profile — e.g. &quot;AUC CUP I WINNER&quot;. Follows the player everywhere, including tournament registrations.
        </p>
      </div>

      {message ? <p className="text-xs text-amber-300">{message}</p> : null}

      <AdminSection title="Award a badge" showsOn="Player profile page; auction draft pool">
        <div className="space-y-3 relative">
          <select
            className={inputClass}
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
          >
            <option value="">Select a tournament...</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as "WINNER" | "RUNNER_UP")}
          >
            <option value="WINNER">Winner</option>
            <option value="RUNNER_UP">Runner-up</option>
          </select>
          {tournamentId ? (
            <p className="text-[10px] text-white/40">
              Badge label:{" "}
              <span className="text-amber-300 font-semibold">
                {tournaments.find((t) => t.id === tournamentId)?.name} {type === "WINNER" ? "WINNER" : "RUNNER-UP"}
              </span>
            </p>
          ) : null}
          <input
            className={inputClass}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(null);
            }}
            placeholder="Search for a player..."
          />
          {results.length > 0 && !selected ? (
            <ul className="absolute z-10 w-full max-h-40 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0a1020] shadow-xl mt-1">
              {results.map((m) => {
                const displayLabel = m.displayName ?? m.name ?? m.email ?? "Member";
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected({ id: m.id, label: displayLabel });
                        setSearch(displayLabel);
                        setResults([]);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-white/75 hover:bg-white/[0.04]"
                    >
                      <span className="font-medium text-white/90">{displayLabel}</span>
                      {m.email ? <span className="ml-2 text-white/40">{m.email}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <button
            type="button"
            disabled={!selected || !tournamentId || awarding}
            onClick={awardBadge}
            className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
          >
            {awarding ? "Awarding..." : "Award badge"}
          </button>
        </div>
      </AdminSection>

      <AdminSection title={`All badges (${initialBadges.length})`} showsOn="Player profile page; auction draft pool">
        {initialBadges.length === 0 ? (
          <p className="text-xs italic text-white/30">No badges awarded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {initialBadges.map((b) => {
              const name = b.user.displayName ?? b.user.name ?? b.user.email ?? "Member";
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs"
                >
                  <span className="text-white/80">
                    <span className="font-semibold text-white">{name}</span>{" "}
                    <span className="text-white/40">— {b.label}</span>
                    {b.tournamentName ? <span className="ml-2 text-white/25">({b.tournamentName})</span> : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeBadge(b.id)}
                    className="text-white/40 hover:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
