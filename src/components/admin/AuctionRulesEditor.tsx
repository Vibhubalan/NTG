"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AuctionRulesConfig,
} from "@/modules/auction/application/auction-config.service";
import type {
  AuctionRankConfig,
  FloorSource,
} from "@/modules/auction/domain/rank-pricing";

const SOURCE_LABELS: Record<FloorSource, string> = {
  premier: "CS2 Premier",
  hours: "Steam hours",
  faceit: "FACEIT level",
  valorant: "Valorant rank",
};

const inputCls =
  "w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/80 focus:border-amber-400/50 focus:outline-none";
const btnCls =
  "rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04] disabled:opacity-40";

function TierTable<T extends Record<string, string | number>>({
  title,
  rows,
  columns,
  onChange,
}: {
  title: string;
  rows: T[];
  columns: { key: keyof T & string; label: string; numeric?: boolean }[];
  onChange: (rows: T[]) => void;
}) {
  function updateCell(idx: number, key: string, raw: string, numeric?: boolean) {
    const next = rows.map((row, i) => {
      if (i !== idx) return row;
      const value = numeric ? Number(raw.replace(/[^0-9.-]/g, "")) || 0 : raw;
      return { ...row, [key]: value };
    });
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</p>
      <table className="w-full text-left text-xs text-white/70">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="pb-1 pr-2 font-medium text-white/40">
                {c.label}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((c) => (
                <td key={c.key} className="pb-1 pr-2">
                  <input
                    className={inputCls}
                    value={String(row[c.key] ?? "")}
                    onChange={(e) => updateCell(idx, c.key, e.target.value, c.numeric)}
                  />
                </td>
              ))}
              <td className="pb-1">
                <button
                  type="button"
                  className="text-white/30 hover:text-rose-300"
                  onClick={() => onChange(rows.filter((_, i) => i !== idx))}
                  aria-label="Remove tier"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="text-xs text-amber-300/80 hover:text-amber-200"
        onClick={() => {
          const blank = Object.fromEntries(
            columns.map((c) => [c.key, c.numeric ? 0 : ""]),
          ) as T;
          onChange([...rows, blank]);
        }}
      >
        + Add tier
      </button>
    </div>
  );
}

export function AuctionRulesEditor() {
  const [rules, setRules] = useState<AuctionRulesConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auction/rules");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load rules");
      setRules(data.rules);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to load rules");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function persist(method: "PUT" | "DELETE") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/auction/rules", {
        method,
        headers: method === "PUT" ? { "Content-Type": "application/json" } : undefined,
        body: method === "PUT" ? JSON.stringify({ rules }) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setRules(data.rules);
      setMsg(method === "PUT" ? "Rules saved." : "Rules reset to defaults.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  function setCs2(patch: Partial<AuctionRankConfig>) {
    setRules((r) => (r ? { ...r, cs2: { ...r.cs2, ...patch } } : r));
  }

  function movePriority(idx: number, dir: -1 | 1) {
    if (!rules) return;
    const priority = [...(rules.cs2.priority ?? [])];
    const target = idx + dir;
    if (target < 0 || target >= priority.length) return;
    [priority[idx], priority[target]] = [priority[target], priority[idx]];
    setCs2({ priority });
  }

  if (!rules) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/50">
        {msg ?? "Loading auction rules…"}
      </div>
    );
  }

  const economy = rules.economy;

  return (
    <div className="space-y-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-amber-200">Auction rules (global defaults)</p>
          <p className="text-xs text-white/40">
            Applied to new sessions. Per-cup overrides can still be set when creating a session.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnCls} disabled={busy} onClick={() => persist("DELETE")}>
            Reset defaults
          </button>
          <button
            type="button"
            className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40"
            disabled={busy}
            onClick={() => persist("PUT")}
          >
            Save rules
          </button>
        </div>
      </div>

      {msg ? <p className="text-xs text-white/60">{msg}</p> : null}

      <section className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ["startingBudget", "Team budget"],
            ["rosterSize", "Roster size"],
            ["timerSeconds", "Timer (sec)"],
            ["minBidIncrement", "Min increment"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="space-y-1 text-xs text-white/50">
            <span>{label}</span>
            <input
              className={`${inputCls} w-full`}
              type="number"
              value={economy[key]}
              onChange={(e) =>
                setRules({
                  ...rules,
                  economy: { ...economy, [key]: Number(e.target.value) || 0 },
                })
              }
            />
          </label>
        ))}
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          CS2 evaluation priority (top wins)
        </p>
        <ul className="space-y-1">
          {(rules.cs2.priority ?? []).map((source, idx) => (
            <li
              key={source}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/70"
            >
              <span>
                {idx + 1}. {SOURCE_LABELS[source]}
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  className="px-1 text-white/40 hover:text-white disabled:opacity-20"
                  disabled={idx === 0}
                  onClick={() => movePriority(idx, -1)}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="px-1 text-white/40 hover:text-white disabled:opacity-20"
                  disabled={idx === (rules.cs2.priority?.length ?? 0) - 1}
                  onClick={() => movePriority(idx, 1)}
                  aria-label="Move down"
                >
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-white/30">
          Players with no data in any source get the base price below.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-white/50">
          <span>CS2 base price (no data)</span>
          <input
            className={inputCls}
            type="number"
            value={rules.cs2.naFloor}
            onChange={(e) => setCs2({ naFloor: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="space-y-1 text-xs text-white/50">
          <span>Valorant base price (no data)</span>
          <input
            className={inputCls}
            type="number"
            value={rules.valorant.naFloor}
            onChange={(e) =>
              setRules({
                ...rules,
                valorant: { ...rules.valorant, naFloor: Number(e.target.value) || 0 },
              })
            }
          />
        </label>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <TierTable
          title="CS2 Premier rating → points"
          rows={rules.cs2.premier ?? []}
          columns={[
            { key: "minRating", label: "Min rating", numeric: true },
            { key: "floor", label: "Points", numeric: true },
          ]}
          onChange={(premier) => setCs2({ premier })}
        />
        <TierTable
          title="Steam hours → points"
          rows={rules.cs2.hours ?? []}
          columns={[
            { key: "minHours", label: "Min hours", numeric: true },
            { key: "floor", label: "Points", numeric: true },
          ]}
          onChange={(hours) => setCs2({ hours })}
        />
        <TierTable
          title="FACEIT level → points"
          rows={rules.cs2.faceit ?? []}
          columns={[
            { key: "level", label: "Level", numeric: true },
            { key: "floor", label: "Points", numeric: true },
          ]}
          onChange={(faceit) => setCs2({ faceit })}
        />
        <TierTable
          title="Valorant fallback (CS2 cups) → points"
          rows={rules.cs2.valorantFallback ?? []}
          columns={[
            { key: "rank", label: "Rank" },
            { key: "floor", label: "Points", numeric: true },
          ]}
          onChange={(valorantFallback) => setCs2({ valorantFallback })}
        />
        <TierTable
          title="Valorant rank → points (Valorant cups)"
          rows={rules.valorant.valorant ?? []}
          columns={[
            { key: "rank", label: "Rank" },
            { key: "floor", label: "Points", numeric: true },
          ]}
          onChange={(valorant) =>
            setRules({ ...rules, valorant: { ...rules.valorant, valorant } })
          }
        />
      </div>
    </div>
  );
}
