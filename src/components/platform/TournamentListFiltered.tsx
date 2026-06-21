"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import BrandIcon from "@/components/ui/BrandIcon";
import StatusBadge from "@/components/platform/ui/StatusBadge";
import { allowPastTournamentClicks } from "@/lib/env";
import { toTournamentDisplay } from "@/lib/tournament-display";
import type { TournamentPreview } from "@core/contracts";

type Filter = "all" | "open" | "past";

type Props = {
  tournaments: TournamentPreview[];
};

export default function TournamentListFiltered({ tournaments }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const items = useMemo(
    () => tournaments.filter((t) => t.status !== "DRAFT").map(toTournamentDisplay),
    [tournaments],
  );

  const filtered = items.filter((t) => {
    if (filter === "open")
      return t.status === "Upcoming" || t.status === "Open" || t.status === "Live";
    if (filter === "past") return t.status === "Hosted";
    return true;
  });

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All cups" },
    { id: "open", label: "Upcoming" },
    { id: "past", label: "Completed" },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] transition-all ${
              filter === f.id
                ? "bg-[var(--color-brand)]/12 text-[var(--color-brand)] ring-1 ring-inset ring-[var(--color-brand)]/30"
                : "text-white/45 ring-1 ring-inset ring-white/10 hover:text-white/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ol className="space-y-4">
        {filtered.map((t, i) => (
          <li key={t.slug}>
            {t.status === "Hosted" && !allowPastTournamentClicks ? (
              <div
                className="group relative flex cursor-default flex-col gap-5 overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-white/[0.02] p-5 opacity-80 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                style={{ ["--cup" as string]: t.hex }}
                aria-disabled="true"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[var(--cup)] opacity-40"
                />
                <div className="flex items-center gap-4 sm:gap-5">
                  <span className="hidden font-display text-3xl font-black tabular-nums text-white/10 sm:block">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0a1020] ring-1 ring-white/10"
                    style={{ color: t.hex }}
                  >
                    <BrandIcon path={t.iconPath} title={t.name} className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-display text-xl font-semibold tracking-[-0.01em] text-white sm:text-2xl flex flex-wrap items-center gap-3">
                      <span>{t.name}</span>
                      {t.championName && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-400/30">
                          🏆 Winner: {t.championName}
                        </span>
                      )}
                    </p>
                    <p className="mt-1.5 text-xs uppercase tracking-[0.2em] text-white/40">
                      {t.game} · {t.season}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-0 sm:pl-4">
                  <span className="text-xs uppercase tracking-[0.18em] text-white/40">{t.date}</span>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ) : (
              <Link
                href={`/esports/tournaments/${t.slug}`}
                className="group relative flex flex-col gap-5 overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-400 hover:border-white/14 hover:bg-white/[0.035] sm:flex-row sm:items-center sm:justify-between sm:p-6"
                style={{ ["--cup" as string]: t.hex }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[var(--cup)] opacity-0 transition-opacity group-hover:opacity-80"
                />
                <div className="flex items-center gap-4 sm:gap-5">
                  <span className="hidden font-display text-3xl font-black tabular-nums text-white/10 sm:block">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0a1020] ring-1 ring-white/10 transition-all group-hover:ring-[var(--cup)]/40"
                    style={{ color: t.hex }}
                  >
                    <BrandIcon path={t.iconPath} title={t.name} className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-display text-xl font-semibold tracking-[-0.01em] text-white sm:text-2xl flex flex-wrap items-center gap-3">
                      <span>{t.name}</span>
                      {t.championName && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-400/30">
                          🏆 Winner: {t.championName}
                        </span>
                      )}
                    </p>
                    <p className="mt-1.5 text-xs uppercase tracking-[0.2em] text-white/40">
                      {t.game} · {t.season}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-0 sm:pl-4">
                  <span className="text-xs uppercase tracking-[0.18em] text-white/40">{t.date}</span>
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            )}
          </li>
        ))}
      </ol>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-sm text-white/40">No tournaments in this view yet.</p>
      )}
    </div>
  );
}
