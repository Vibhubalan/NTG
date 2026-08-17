"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminSection } from "@/components/admin/AdminSection";
import CustomBadgeIcon from "@/components/badges/CustomBadgeIcon";
import { CUSTOM_BADGE_PRESETS } from "@/lib/player-badge-presets";

type Badge = {
  id: string;
  label: string;
  kind: string;
  iconKey: string | null;
  awardedAt: string;
  tournamentName: string | null;
  user: { id: string; name: string | null; email: string | null; displayName: string | null };
};

type MemberResult = { id: string; email: string | null; name: string | null; displayName: string | null };

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200";

function initials(label: string): string {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ label, tone = "indigo" }: { label: string; tone?: "indigo" | "amber" }) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
      : "border-indigo-400/25 bg-indigo-400/10 text-indigo-200";
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${toneClass}`}
    >
      {initials(label)}
    </span>
  );
}

function isRunnerUp(label: string): boolean {
  return /RUNNER-UP$/i.test(label);
}

function TrophyIcon({ silver = false }: { silver?: boolean }) {
  return silver ? (
    <span style={{ filter: "grayscale(1) brightness(1.5)" }}>🏆</span>
  ) : (
    <span>🏆</span>
  );
}

function PlayerSearch({
  search,
  setSearch,
  results,
  searching,
  onPick,
  single,
  selectedIds,
}: {
  search: string;
  setSearch: (v: string) => void;
  results: MemberResult[];
  searching: boolean;
  onPick: (m: MemberResult, label: string) => void;
  single?: boolean;
  selectedIds: string[];
}) {
  return (
    <div className="space-y-1.5 relative">
      <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {single ? "Player (one only)" : "Players"}
      </label>
      <input
        className={inputClass}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={single ? "Search for one player..." : "Search for players to add..."}
      />
      {search.trim().length >= 2 ? (
        <ul className="absolute z-10 w-full max-h-52 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0a1020] shadow-xl mt-1">
          {searching ? (
            <li className="px-3 py-3 text-xs text-white/35">Searching...</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-3 text-xs text-white/35">No matching players.</li>
          ) : (
            results.map((m) => {
              const displayLabel = m.displayName ?? m.name ?? m.email ?? "Member";
              const alreadyAdded = selectedIds.includes(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => onPick(m, displayLabel)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-white/75 hover:bg-white/[0.05] disabled:opacity-30 transition-colors"
                  >
                    <Avatar label={displayLabel} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-white/90">{displayLabel}</span>
                      {m.email ? <span className="block truncate text-[10px] text-white/40">{m.email}</span> : null}
                    </span>
                    {alreadyAdded ? (
                      <span className="shrink-0 text-[10px] font-semibold text-amber-400">
                        {single ? "Selected" : "Added"}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

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
  const [results, setResults] = useState<MemberResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<{ id: string; label: string }[]>([]);
  const [awarding, setAwarding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const [customIconKey, setCustomIconKey] = useState(CUSTOM_BADGE_PRESETS[0]?.key ?? "");
  const [customSearch, setCustomSearch] = useState("");
  const [customResults, setCustomResults] = useState<MemberResult[]>([]);
  const [customSearching, setCustomSearching] = useState(false);
  const [customPlayer, setCustomPlayer] = useState<{ id: string; label: string } | null>(null);
  const [customAwarding, setCustomAwarding] = useState(false);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/admin/members?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setResults(data.users);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const q = customSearch.trim();
    if (q.length < 2) {
      setCustomResults([]);
      setCustomSearching(false);
      return;
    }

    setCustomSearching(true);
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/admin/members?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setCustomResults(data.users);
      }
      setCustomSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [customSearch]);

  const selectedTournamentName = tournaments.find((t) => t.id === tournamentId)?.name;
  const selectedPreset = CUSTOM_BADGE_PRESETS.find((p) => p.key === customIconKey);

  async function awardBadges() {
    if (selectedPlayers.length === 0 || !tournamentId) return;
    setAwarding(true);
    setMessage(null);
    try {
      const awardResults = await Promise.all(
        selectedPlayers.map((p) =>
          fetch("/api/admin/badges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: p.id, tournamentId, type }),
          }).then(async (res) => ({
            ok: res.ok,
            label: p.label,
            error: res.ok ? null : (await res.json()).error,
          })),
        ),
      );
      const failed = awardResults.filter((r) => !r.ok);
      if (failed.length > 0) {
        setMessage(
          `Awarded to ${awardResults.length - failed.length}/${awardResults.length}. Failed: ${failed.map((f) => f.label).join(", ")}`,
        );
      } else {
        setMessage(`Badge awarded to ${awardResults.length} player${awardResults.length === 1 ? "" : "s"}.`);
      }
      setSelectedPlayers([]);
      setSearch("");
      setResults([]);
      setTournamentId("");
      setType("WINNER");
      router.refresh();
    } finally {
      setAwarding(false);
    }
  }

  async function awardCustom() {
    if (!customPlayer || !customIconKey) return;
    setCustomAwarding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "CUSTOM",
          userId: customPlayer.id,
          iconKey: customIconKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Custom badge award failed.");
      } else {
        setMessage(
          `Custom badge awarded to ${customPlayer.label}${data.label ? `: ${data.label}` : ""}. Previous holder (if any) was replaced.`,
        );
        setCustomPlayer(null);
        setCustomSearch("");
        setCustomResults([]);
        router.refresh();
      }
    } finally {
      setCustomAwarding(false);
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

  const filteredBadges = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return initialBadges;
    return initialBadges.filter((b) => {
      const name = (b.user.displayName ?? b.user.name ?? b.user.email ?? "").toLowerCase();
      return (
        name.includes(q) ||
        b.label.toLowerCase().includes(q) ||
        (b.tournamentName ?? "").toLowerCase().includes(q) ||
        (b.iconKey ?? "").toLowerCase().includes(q)
      );
    });
  }, [initialBadges, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Player Badges</h1>
        <p className="mt-1 text-sm text-white/40">
          Manually award Winner / Runner-up badges, or unique custom badges (one holder each per cup).
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-300">
          {message}
        </p>
      ) : null}

      <div className="relative z-20">
        <AdminSection
          title="Award placement badge"
          showsOn="Player profile page; tournament leaderboard"
        >
          <div className="space-y-4 relative">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Tournament</label>
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
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Placement</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType("WINNER")}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      type === "WINNER"
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
                        : "border-white/10 bg-[#0a1020]/60 text-white/50 hover:text-white/80"
                    }`}
                  >
                    <TrophyIcon /> Winner
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("RUNNER_UP")}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      type === "RUNNER_UP"
                        ? "border-slate-400/40 bg-slate-400/15 text-slate-200"
                        : "border-white/10 bg-[#0a1020]/60 text-white/50 hover:text-white/80"
                    }`}
                  >
                    <TrophyIcon silver /> Runner-up
                  </button>
                </div>
              </div>
            </div>

            {tournamentId ? (
              <p className="text-[10px] text-white/40">
                Badge label:{" "}
                <span className="font-semibold text-amber-300">
                  {selectedTournamentName} {type === "WINNER" ? "WINNER" : "RUNNER-UP"}
                </span>
              </p>
            ) : null}

            <PlayerSearch
              search={search}
              setSearch={setSearch}
              results={results}
              searching={searching}
              selectedIds={selectedPlayers.map((p) => p.id)}
              onPick={(_m, displayLabel) => {
                setSelectedPlayers((prev) =>
                  prev.some((p) => p.id === _m.id) ? prev : [...prev, { id: _m.id, label: displayLabel }],
                );
                setSearch("");
                setResults([]);
              }}
            />

            {selectedPlayers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedPlayers.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 py-1 pl-1 pr-2.5 text-xs text-amber-200"
                  >
                    <Avatar label={p.label} tone="amber" />
                    {p.label}
                    <button
                      type="button"
                      onClick={() => setSelectedPlayers((prev) => prev.filter((x) => x.id !== p.id))}
                      className="text-amber-300/70 hover:text-white text-sm leading-none"
                      aria-label={`Remove ${p.label}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] italic text-white/25">No players selected yet. Search above to add them.</p>
            )}

            <button
              type="button"
              disabled={selectedPlayers.length === 0 || !tournamentId || awarding}
              onClick={awardBadges}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-black transition-opacity disabled:opacity-40 sm:w-auto sm:px-6"
            >
              {awarding ? (
                "Awarding..."
              ) : (
                <>
                  <TrophyIcon /> Award badge{selectedPlayers.length > 1 ? ` to ${selectedPlayers.length} players` : ""}
                </>
              )}
            </button>
          </div>
        </AdminSection>
      </div>

      <div className="relative z-10">
        <AdminSection
          title="Award custom badge"
          showsOn="Global: one person only per badge type; transfers if reassigned"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Badge</label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CUSTOM_BADGE_PRESETS.map((preset) => {
                  const active = customIconKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setCustomIconKey(preset.key)}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                        active
                          ? "border-white/25 bg-white/[0.06]"
                          : "border-white/10 bg-[#0a1020]/40 hover:border-white/20"
                      }`}
                    >
                      <span
                        className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
                        style={{
                          borderColor: `${preset.accent}55`,
                          background: `${preset.accent}14`,
                        }}
                      >
                        <CustomBadgeIcon iconKey={preset.key} accent={preset.accent} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-white">{preset.label}</span>
                        <span className="mt-0.5 block text-[10px] text-white/40">{preset.blurb}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedPreset ? (
              <p className="text-[10px] text-white/40">
                Label:{" "}
                <span className="font-semibold text-white/80">{selectedPreset.label}</span>
              </p>
            ) : null}

            <PlayerSearch
              search={customSearch}
              setSearch={setCustomSearch}
              results={customResults}
              searching={customSearching}
              single
              selectedIds={customPlayer ? [customPlayer.id] : []}
              onPick={(m, displayLabel) => {
                setCustomPlayer({ id: m.id, label: displayLabel });
                setCustomSearch("");
                setCustomResults([]);
              }}
            />

            {customPlayer ? (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/10 py-1 pl-1 pr-2.5 text-xs text-violet-100">
                  <Avatar label={customPlayer.label} />
                  {customPlayer.label}
                  <button
                    type="button"
                    onClick={() => setCustomPlayer(null)}
                    className="text-violet-200/70 hover:text-white text-sm leading-none"
                    aria-label={`Remove ${customPlayer.label}`}
                  >
                    ×
                  </button>
                </span>
              </div>
            ) : (
              <p className="text-[10px] italic text-white/25">
                Pick exactly one player. Awarding replaces any previous holder of this badge.
              </p>
            )}

            <button
              type="button"
              disabled={!customPlayer || !customIconKey || customAwarding}
              onClick={awardCustom}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-4 py-3 text-sm font-bold text-violet-100 transition-opacity disabled:opacity-40 sm:w-auto sm:px-6"
            >
              {customAwarding ? (
                "Awarding..."
              ) : (
                <>
                  {selectedPreset ? (
                    <CustomBadgeIcon
                      iconKey={selectedPreset.key}
                      accent={selectedPreset.accent}
                      className="h-4 w-4"
                    />
                  ) : null}
                  Award custom badge
                </>
              )}
            </button>
          </div>
        </AdminSection>
      </div>

      <AdminSection title={`All badges (${initialBadges.length})`} showsOn="Player profile page; tournament leaderboard">
        {initialBadges.length > 0 ? (
          <input
            className={`${inputClass} mb-3`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by player, tournament, or badge..."
          />
        ) : null}

        {initialBadges.length === 0 ? (
          <p className="text-xs italic text-white/30">No badges awarded yet.</p>
        ) : filteredBadges.length === 0 ? (
          <p className="text-xs italic text-white/30">No badges match &quot;{filter}&quot;.</p>
        ) : (
          <ul className="space-y-1.5">
            {filteredBadges.map((b) => {
              const name = b.user.displayName ?? b.user.name ?? b.user.email ?? "Member";
              const runnerUp = isRunnerUp(b.label);
              const preset = b.iconKey ? CUSTOM_BADGE_PRESETS.find((p) => p.key === b.iconKey) : null;
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar label={name} />
                    <span className="min-w-0">
                      <span className="font-semibold text-white">{name}</span>{" "}
                      <span className="inline-flex items-center gap-1 text-white/40">
                        {b.kind === "CUSTOM" && b.iconKey ? (
                          <CustomBadgeIcon
                            iconKey={b.iconKey}
                            accent={preset?.accent ?? "#a78bfa"}
                            className="h-3.5 w-3.5"
                          />
                        ) : (
                          <TrophyIcon silver={runnerUp} />
                        )}{" "}
                        {b.label}
                      </span>
                      {b.tournamentName ? (
                        <span className="ml-1.5 text-white/25">({b.tournamentName})</span>
                      ) : null}
                      {b.kind === "CUSTOM" ? (
                        <span className="ml-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-200/80">
                          Custom
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBadge(b.id)}
                    className="shrink-0 rounded-lg border border-transparent px-2 py-1 text-white/40 transition-colors hover:border-red-500/20 hover:bg-red-500/[0.06] hover:text-red-300"
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
