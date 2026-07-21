"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { RosterTeamView } from "@core/contracts/roster-listings";
import type { ListingPreview } from "@core/contracts/roster-listings";
import { gameMetaFor } from "@/lib/tournament-display";
import type { GameSlug } from "@prisma/client";
import BrandIcon from "@/components/ui/BrandIcon";
import ListingCard from "@/components/platform/listings/ListingCard";
import ValorantRosterGrid from "./ValorantRosterGrid";
import Cs2RosterGrid from "./Cs2RosterGrid";
import Cs2RosterImagePreload from "./Cs2RosterImagePreload";
import TryoutStatusBlock from "./RosterBenefitsBlock";

const GAME_KEY_TO_SLUG: Record<string, GameSlug> = {
  valorant: "VALORANT",
  cs2: "CS2",
};

type Props = {
  teams: RosterTeamView[];
  jobListings: ListingPreview[];
};

const NTG_PERKS = [
  {
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    label: "Dedicated practice slots",
    sub: "Reserved time at the NTG Lounge arena, purpose-built for scrims",
  },
  {
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    label: "Tournament entries & admin support",
    sub: "We register you, handle logistics, and back you through every bracket",
  },
  {
    icon: "M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z",
    label: "Coaching & VOD review",
    sub: "Structured feedback from experienced staff to level up your play",
  },
  {
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    label: "Community events & LAN access",
    sub: "Priority access to NTG LANs, watch parties, and member-only events",
  },
];

function OpenJobsSection({ jobs }: { jobs: ListingPreview[] }) {
  if (jobs.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] shadow-[0_0_8px_rgba(94,234,212,0.8)]" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--color-brand)]/90">
            Open jobs
          </h2>
        </div>
        <Link
          href="/listings?type=JOB"
          className="text-[10px] font-semibold uppercase tracking-wider text-white/40 transition-colors hover:text-[var(--color-brand)]"
        >
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}

function NtgPerksSection() {
  return (
    <section className="mt-10 border-t border-white/[0.06] pt-14 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] shadow-[0_0_8px_rgba(94,234,212,0.8)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--color-brand)]/90">
            Why join us
          </p>
        </div>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 pb-1">
          Why be part of NTG Roster?
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {NTG_PERKS.map((perk) => (
          <div
            key={perk.label}
            className="group flex items-start gap-5 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand)]/10 ring-1 ring-inset ring-[var(--color-brand)]/20 transition-all duration-300 group-hover:bg-[var(--color-brand)]/20 group-hover:shadow-[0_0_15px_rgba(94,234,212,0.25)] group-hover:scale-110">
              <svg
                className="h-6 w-6 text-[var(--color-brand)] transition-transform duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={perk.icon} />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-white tracking-tight">{perk.label}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50 group-hover:text-white/70 transition-colors">{perk.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function RosterHub({ teams, jobListings }: Props) {
  const [activeKey, setActiveKey] = useState(teams[0]?.gameKey ?? "valorant");
  const team = teams.find((t) => t.gameKey === activeKey) ?? teams[0];

  if (!team) {
    return (
      <div className="py-24 text-center space-y-10">
        <OpenJobsSection jobs={jobListings} />
        <div>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
            <svg className="h-7 w-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm text-white/40">Roster is being set up — check back soon.</p>
        </div>
        <div className="text-left max-w-2xl mx-auto">
          <NtgPerksSection />
        </div>
      </div>
    );
  }

  const meta = gameMetaFor(GAME_KEY_TO_SLUG[team.gameKey] ?? "OTHER");

  return (
    <div className="space-y-8">
      <Cs2RosterImagePreload />
      <OpenJobsSection jobs={jobListings} />

      {teams.length > 1 && (
        <div className="flex border-b border-white/10 pb-6">
          <div className="flex items-center gap-1 rounded-full bg-[#111] p-1.5 backdrop-blur-md border border-white/20 shadow-inner">
            {teams.map((t) => {
              const m = gameMetaFor(GAME_KEY_TO_SLUG[t.gameKey] ?? "OTHER");
              const isActive = t.gameKey === activeKey;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveKey(t.gameKey)}
                  className={`group relative flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                    isActive
                      ? "text-black"
                      : "text-white/50 hover:text-white/90 hover:bg-white/5"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="roster-active-tab"
                      className="absolute inset-0 z-0 rounded-full bg-white shadow-[0_4px_14px_0_rgba(255,255,255,0.39)]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300 ${
                      isActive ? "opacity-100" : "opacity-40 group-hover:opacity-70"
                    }`}
                  >
                    <BrandIcon path={m.iconPath} title={t.gameLabel} className="h-4 w-4" />
                  </span>
                  <span className={`relative z-10 ${isActive ? "text-black" : ""}`}>
                    {t.gameLabel}
                  </span>
                  {t.status === "RECRUITING" && (
                    <span className="relative z-10 ml-0.5 h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#080808] p-6 sm:p-8 isolate [transform:translateZ(0)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem]">
          <div
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30"
            style={{
              background: `radial-gradient(circle, ${meta.hex} 0%, transparent 70%)`
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/90 to-transparent" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${meta.hex}25, ${meta.hex}08)`,
                border: `1px solid ${meta.hex}30`,
                color: meta.hex,
              }}
            >
              <BrandIcon path={meta.iconPath} title={team.gameLabel} className="h-8 w-8" />
            </div>

            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                    team.status === "ACTIVE"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                      : "border-cyan-500/25 bg-cyan-500/10 text-cyan-400"
                  }`}
                >
                  {team.status === "ACTIVE" ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active roster
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      Recruiting
                    </>
                  )}
                </span>
              </div>
              <h2 className="font-display text-2xl font-black text-white tracking-tight sm:text-3xl">
                NTG {team.gameLabel}
              </h2>
              {team.status === "RECRUITING" ? (
                <p className="mt-0.5 text-sm text-white/40">Building the official competitive lineup</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <TryoutStatusBlock team={team} />

      {team.status === "ACTIVE" && team.gameKey === "valorant" ? (
        <ValorantRosterGrid players={team.players} />
      ) : team.status === "ACTIVE" && team.gameKey === "cs2" ? (
        <Cs2RosterGrid players={team.players} />
      ) : team.status === "ACTIVE" && team.players.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {team.players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-sm font-black text-white">
                {p.displayName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{p.displayName}</p>
                {p.roleLabel ? <p className="text-xs text-white/40 mt-0.5">{p.roleLabel}</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : team.status === "RECRUITING" ? (
        <p className="py-8 text-center text-sm text-white/35">
          Player slots will appear here once the roster is finalized.
        </p>
      ) : (
        <p className="py-12 text-center text-sm text-white/40">No players on this roster yet.</p>
      )}

      <NtgPerksSection />
    </div>
  );
}
