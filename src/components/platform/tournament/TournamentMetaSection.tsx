"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  getAgentIconUrl,
  getAgentColorHex,
  type AgentRole,
} from "@/lib/valorant-agent";
import { getValorantMapSplashUrl } from "@/lib/valorant-map";
import {
  aggregateRoleStandouts,
  aggregateTeamMapStats,
  aggregateAgentStandouts,
  type StandoutPlayer,
  type TournamentStatsEligibility,
} from "@/lib/tournament-stats";
import type { PublicGame } from "./TournamentGamesSection";

type Props = {
  games: PublicGame[];
  eligibility?: TournamentStatsEligibility;
};

type MetaSectionKey = "teamMaps" | "roleStandouts" | "agentMasters";

function MetaCollapsible({
  open,
  onToggle,
  accentDotClass,
  title,
  description,
  headerExtra,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  accentDotClass: string;
  title: string;
  description: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.03] sm:px-5"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${accentDotClass}`} />
              <h3 className="font-display text-sm font-black tracking-[0.12em] text-white uppercase sm:text-base sm:tracking-[0.2em]">
                {title}
              </h3>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/50 sm:text-xs">
              {description}
            </p>
          </div>
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-white/60 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>
        {open && headerExtra ? (
          <div className="px-4 pb-4 sm:px-5">{headerExtra}</div>
        ) : null}
      </div>
      {open ? <div className="space-y-5 px-4 py-5 sm:px-5">{children}</div> : null}
    </section>
  );
}

function AgentIcons({ agents, size = "sm" }: { agents: string[]; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-7 w-7 sm:h-8 sm:w-8" : "h-6 w-6 sm:h-6 sm:w-6";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {agents.map((agent) => {
        const icon = getAgentIconUrl(agent);
        return icon ? (
          <div
            key={agent}
            title={agent}
            className="group relative flex items-center justify-center rounded-lg bg-black/40 p-1 ring-1 ring-white/10 hover:ring-emerald-400/50 transition-all"
          >
            <img
              src={icon}
              alt={agent}
              className={`${cls} object-contain mix-blend-screen drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
            />
          </div>
        ) : (
          <span
            key={agent}
            title={agent}
            className={`flex ${cls} items-center justify-center rounded-lg bg-white/10 text-[9px] font-bold text-white/60 ring-1 ring-white/10`}
          >
            {agent.slice(0, 2)}
          </span>
        );
      })}
    </div>
  );
}

const ROLE_CONFIG: Record<
  string,
  {
    title: string;
    badgeBg: string;
    badgeText: string;
    glowBorder: string;
    glowBg: string;
    accentColor: string;
    icon: string;
  }
> = {
  bestOverall: {
    title: "Best Overall",
    badgeBg: "bg-amber-400/15 ring-amber-400/40 text-amber-300",
    badgeText: "text-amber-300",
    glowBorder: "border-amber-500/30 hover:border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.08)]",
    glowBg: "from-amber-500/15 via-amber-500/[0.03] to-transparent",
    accentColor: "text-amber-400",
    icon: "👑",
  },
  Duelist: {
    title: "Best Duelist",
    badgeBg: "bg-rose-500/15 ring-rose-500/40 text-rose-300",
    badgeText: "text-rose-300",
    glowBorder: "border-rose-500/30 hover:border-rose-400/60 shadow-[0_0_25px_rgba(244,63,94,0.08)]",
    glowBg: "from-rose-500/15 via-rose-500/[0.03] to-transparent",
    accentColor: "text-rose-400",
    icon: "⚔️",
  },
  Initiator: {
    title: "Best Initiator",
    badgeBg: "bg-sky-500/15 ring-sky-500/40 text-sky-300",
    badgeText: "text-sky-300",
    glowBorder: "border-sky-500/30 hover:border-sky-400/60 shadow-[0_0_25px_rgba(14,165,233,0.08)]",
    glowBg: "from-sky-500/15 via-sky-500/[0.03] to-transparent",
    accentColor: "text-sky-400",
    icon: "🎯",
  },
  Controller: {
    title: "Best Controller",
    badgeBg: "bg-purple-500/15 ring-purple-500/40 text-purple-300",
    badgeText: "text-purple-300",
    glowBorder: "border-purple-500/30 hover:border-purple-400/60 shadow-[0_0_25px_rgba(168,85,247,0.08)]",
    glowBg: "from-purple-500/15 via-purple-500/[0.03] to-transparent",
    accentColor: "text-purple-400",
    icon: "🌫️",
  },
  Sentinel: {
    title: "Best Sentinel",
    badgeBg: "bg-emerald-500/15 ring-emerald-500/40 text-emerald-300",
    badgeText: "text-emerald-300",
    glowBorder: "border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.08)]",
    glowBg: "from-emerald-500/15 via-emerald-500/[0.03] to-transparent",
    accentColor: "text-emerald-400",
    icon: "🛡️",
  },
  bestFlex: {
    title: "Best Flex",
    badgeBg: "bg-fuchsia-500/15 ring-fuchsia-500/40 text-fuchsia-300",
    badgeText: "text-fuchsia-300",
    glowBorder: "border-fuchsia-500/30 hover:border-fuchsia-400/60 shadow-[0_0_25px_rgba(217,70,239,0.08)]",
    glowBg: "from-fuchsia-500/15 via-fuchsia-500/[0.03] to-transparent",
    accentColor: "text-fuchsia-400",
    icon: "⚡",
  },
};

function StandoutCard({
  roleKey,
  player,
}: {
  roleKey: string;
  player: StandoutPlayer | null;
}) {
  const config = ROLE_CONFIG[roleKey] ?? ROLE_CONFIG.bestOverall;
  const showAllAgents = roleKey === "bestFlex";

  if (!player) {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm transition-all ${config.glowBorder}`}>
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${config.badgeBg}`}>
            <span>{config.icon}</span>
            <span>{config.title}</span>
          </span>
        </div>
        <p className="mt-6 text-xs text-white/30 font-medium">Not enough data yet</p>
      </div>
    );
  }

  const { name, tag } = (() => {
    const [n, t] = player.riotId.split("#");
    return { name: n ?? player.riotId, tag: t ?? "" };
  })();
  const icon = getAgentIconUrl(player.mostPlayedAgent);
  const agentsPlayed = Object.entries(player.agentCounts ?? {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([agent, count]) => ({ agent, count }));

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 backdrop-blur-md transition-all duration-300 ${config.glowBg} ${config.glowBorder}`}
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:via-white/40 transition-all" />

      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${config.badgeBg}`}>
          <span>{config.icon}</span>
          <span>{config.title}</span>
        </span>
        {!showAllAgents && player.mostPlayedAgent ? (
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
            {player.mostPlayedAgent}
          </span>
        ) : showAllAgents ? (
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
            {agentsPlayed.length} agents
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-3.5">
        {showAllAgents && agentsPlayed.length > 1 ? (
          <div className="grid max-w-[7.5rem] shrink-0 grid-cols-3 gap-1 rounded-2xl bg-black/40 p-1.5 ring-1 ring-white/15">
            {agentsPlayed.map(({ agent, count }) => {
              const agentIcon = getAgentIconUrl(agent);
              return agentIcon ? (
                <div
                  key={agent}
                  className="relative flex h-8 w-8 items-center justify-center"
                  title={`${agent} · ${count}g`}
                >
                  <img
                    src={agentIcon}
                    alt={agent}
                    className="h-full w-full object-contain mix-blend-screen drop-shadow-md"
                  />
                </div>
              ) : (
                <span
                  key={agent}
                  title={`${agent} · ${count}g`}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-[8px] font-bold text-white/50"
                >
                  {agent.slice(0, 2)}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/40 p-1.5 ring-1 ring-white/15 group-hover:ring-white/30 transition-all shadow-lg">
            {icon ? (
              <img
                src={icon}
                alt={player.mostPlayedAgent ?? ""}
                className="h-full w-full object-contain mix-blend-screen drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white/60">
                {name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h4 className="truncate font-display text-base font-extrabold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
            {name}
          </h4>
          {tag ? <p className="text-xs font-mono text-white/45">#{tag}</p> : null}
          {player.userName && player.userName !== name ? (
            <p className="truncate text-[11px] text-white/35 font-medium">{player.userName}</p>
          ) : null}
        </div>
      </div>

      {/* Stats Breakdown Bar */}
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-black/40 p-2.5 border border-white/[0.06]">
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-wider text-white/40">ACS</p>
          <p className="mt-0.5 font-mono text-base font-black text-white">{player.avgAcs}</p>
        </div>
        <div className="text-center border-x border-white/10">
          <p className="text-[9px] font-black uppercase tracking-wider text-white/40">K/D</p>
          <p className={`mt-0.5 font-mono text-base font-black ${player.kd >= 1.2 ? "text-emerald-300" : "text-white"}`}>
            {player.kd.toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-wider text-white/40">GP</p>
          <p className="mt-0.5 font-mono text-base font-black text-white/80">{player.gamesPlayed}</p>
        </div>
      </div>
    </div>
  );
}

export default function TournamentMetaSection({ games, eligibility }: Props) {
  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole | "ALL">("ALL");
  const [openSections, setOpenSections] = useState<Record<MetaSectionKey, boolean>>({
    teamMaps: false,
    roleStandouts: false,
    agentMasters: false,
  });
  /** Team cards inside Team Map Performance — closed by default. */
  const [openTeamIds, setOpenTeamIds] = useState<Record<string, boolean>>({});

  const toggleSection = (key: MetaSectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTeam = (teamId: string) => {
    setOpenTeamIds((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const teamMaps = useMemo(() => aggregateTeamMapStats(games), [games]);
  const standouts = useMemo(
    () => aggregateRoleStandouts(games, eligibility),
    [games, eligibility],
  );
  const agentStandouts = useMemo(
    () => aggregateAgentStandouts(games, eligibility),
    [games, eligibility],
  );

  const filteredAgentStandouts = useMemo(() => {
    const withMaster = agentStandouts.filter((a) => a.bestPlayer != null);
    if (selectedAgentRole === "ALL") return withMaster;
    return withMaster.filter((a) => a.role === selectedAgentRole);
  }, [agentStandouts, selectedAgentRole]);

  const hasMappedGames = games.some((g) => g.mapName?.trim());

  if (!hasMappedGames) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40">
        Not enough published matches yet.
      </div>
    );
  }

  const agentRoleFilters = (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 p-1">
      {(["ALL", "Duelist", "Initiator", "Controller", "Sentinel"] as const).map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => setSelectedAgentRole(role)}
          className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all ${
            selectedAgentRole === role
              ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/50"
              : "text-white/40 hover:bg-white/5 hover:text-white"
          }`}
        >
          {role}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ─── 1. TEAM MAP PERFORMANCE ─────────────────────────────────── */}
      <MetaCollapsible
        open={openSections.teamMaps}
        onToggle={() => toggleSection("teamMaps")}
        accentDotClass="bg-emerald-400 animate-pulse"
        title="Team Map Performance"
        description="Detailed win rates, map frequency, and agent compositions executed by each team"
      >
        {teamMaps.length === 0 ? (
          <p className="text-sm text-white/40">No team map data available yet.</p>
        ) : (
          <div className="space-y-3">
            {teamMaps.map((team) => {
              const totalTeamWins = team.maps.reduce((acc, m) => acc + m.wins, 0);
              const overallWinRate =
                team.totalMaps > 0 ? Math.round((totalTeamWins / team.totalMaps) * 100) : 0;
              const teamOpen = openTeamIds[team.teamId] === true;

              return (
                <div
                  key={team.teamId}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#060b13]/90 shadow-2xl backdrop-blur-md"
                >
                  <button
                    type="button"
                    onClick={() => toggleTeam(team.teamId)}
                    aria-expanded={teamOpen}
                    className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-4 text-left transition-colors hover:bg-white/[0.05] sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 font-display text-sm font-black text-emerald-300 ring-1 ring-emerald-500/30">
                        {team.teamName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate font-display text-lg font-bold tracking-tight text-white">
                          {team.teamName}
                        </h4>
                        <p className="font-mono text-[11px] text-white/40">
                          {team.totalMaps} map{team.totalMaps !== 1 ? "s" : ""} played in tournament
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-xs font-medium text-white/60 ring-1 ring-white/10">
                        Map Record:{" "}
                        <span className="font-bold text-white">
                          {totalTeamWins}W - {team.totalMaps - totalTeamWins}L
                        </span>
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 font-mono text-xs font-bold ring-1 ${
                          overallWinRate >= 60
                            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                            : overallWinRate >= 40
                              ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                              : "bg-rose-500/15 text-rose-300 ring-rose-500/30"
                        }`}
                      >
                        {overallWinRate}% Win Rate
                      </span>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-white/60 transition-transform duration-200 ${
                          teamOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </div>
                  </button>

                  {teamOpen ? (
                  <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
                    {team.maps.map((m) => {
                      const mapSplash = getValorantMapSplashUrl(m.mapName);
                      const isHighWinrate = m.winRate >= 60;
                      const isLowWinrate = m.winRate < 40;

                      return (
                        <div
                          key={m.mapName}
                          className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 shadow-lg transition-all duration-300 hover:border-emerald-400/40"
                        >
                          <div className="relative h-24 w-full overflow-hidden">
                            <img
                              src={mapSplash}
                              alt={m.mapName}
                              className="h-full w-full object-cover object-center opacity-60 transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                            <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                              <span className="font-display text-base font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                {m.mapName}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold backdrop-blur-md ring-1 ${
                                  isHighWinrate
                                    ? "bg-emerald-950/80 text-emerald-300 ring-emerald-400/40"
                                    : isLowWinrate
                                      ? "bg-rose-950/80 text-rose-300 ring-rose-400/40"
                                      : "bg-amber-950/80 text-amber-300 ring-amber-400/40"
                                }`}
                              >
                                {m.winRate}% WR
                              </span>
                            </div>

                            <div className="absolute bottom-2 left-3 font-mono text-[11px] font-semibold text-white/70 drop-shadow">
                              {m.played} match{m.played !== 1 ? "es" : ""} ({m.wins}W -{" "}
                              {m.played - m.wins}L)
                            </div>
                          </div>

                          <div className="space-y-2.5 border-t border-white/5 bg-white/[0.01] p-3.5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">
                              Top Team Compositions
                            </p>
                            {m.comps.length === 0 ? (
                              <p className="text-xs italic text-white/30">No comp data recorded</p>
                            ) : (
                              <div className="space-y-2">
                                {m.comps.slice(0, 2).map((c) => (
                                  <div
                                    key={c.key}
                                    className="flex items-center justify-between gap-2 rounded-lg bg-black/40 p-2 ring-1 ring-white/[0.06]"
                                  >
                                    <AgentIcons agents={c.agents} size="sm" />
                                    <span className="whitespace-nowrap font-mono text-[10px] font-semibold text-white/60">
                                      {c.count}× ·{" "}
                                      <span
                                        className={
                                          c.winRate >= 50
                                            ? "font-bold text-emerald-300"
                                            : "text-white/70"
                                        }
                                      >
                                        {c.winRate}% WR
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </MetaCollapsible>

      {/* ─── 2. ROLE STANDOUTS ─────────────────────────────────────── */}
      <MetaCollapsible
        open={openSections.roleStandouts}
        onToggle={() => toggleSection("roleStandouts")}
        accentDotClass="bg-amber-400 animate-pulse"
        title="Best Players by Roles"
        description="Ranked by ACS balanced with games played — small samples are tempered"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StandoutCard roleKey="bestOverall" player={standouts.bestOverall} />
          <StandoutCard roleKey="Duelist" player={standouts.byRole.Duelist ?? null} />
          <StandoutCard roleKey="Initiator" player={standouts.byRole.Initiator ?? null} />
          <StandoutCard roleKey="Controller" player={standouts.byRole.Controller ?? null} />
          <StandoutCard roleKey="Sentinel" player={standouts.byRole.Sentinel ?? null} />
          <StandoutCard roleKey="bestFlex" player={standouts.bestFlex} />
        </div>
      </MetaCollapsible>

      {/* ─── 3. AGENT MASTERS ────────────────────────────────────────── */}
      <MetaCollapsible
        open={openSections.agentMasters}
        onToggle={() => toggleSection("agentMasters")}
        accentDotClass="bg-cyan-400 animate-pulse"
        title="Best Players by Agents"
        description="Top performer per agent — ACS balanced with games on that agent"
        headerExtra={agentRoleFilters}
      >
        {filteredAgentStandouts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-xs text-white/40">
            No agents played matching this role filter yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAgentStandouts.map((item) => {
              const agentIcon = getAgentIconUrl(item.agent);
              const agentHex = getAgentColorHex(item.agent);
              const bp = item.bestPlayer;
              const playerRiot = bp ? bp.riotId.split("#") : ["-", ""];
              const name = playerRiot[0];
              const tag = playerRiot[1];

              return (
                <div
                  key={item.agent}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#060b13]/90 p-4 backdrop-blur-md transition-all duration-300 hover:border-emerald-400/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]"
                >
                  <div
                    className="absolute top-0 right-0 left-0 h-[2px] opacity-70 transition-opacity group-hover:opacity-100"
                    style={{ backgroundColor: agentHex }}
                  />

                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-black/50 p-1 ring-1 ring-white/15"
                        style={{ boxShadow: `0 0 12px ${agentHex}25` }}
                      >
                        {agentIcon ? (
                          <img
                            src={agentIcon}
                            alt={item.agent}
                            className="h-full w-full object-contain mix-blend-screen drop-shadow"
                          />
                        ) : (
                          <span className="text-xs font-bold text-white/60">
                            {item.agent.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-display text-sm font-black tracking-wider text-white uppercase">
                          {item.agent}
                        </h4>
                        {item.role && (
                          <span className="text-[10px] font-semibold text-white/40">{item.role}</span>
                        )}
                      </div>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] font-medium text-white/50">
                      {item.totalPickCount} pick{item.totalPickCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="mb-2 flex items-center gap-1 text-[9px] font-black tracking-widest text-emerald-400/80 uppercase">
                      <span>👑</span> Top Performer
                    </p>

                    {bp ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-display text-sm font-extrabold text-white transition-colors group-hover:text-emerald-300">
                              {name}
                            </p>
                            {tag ? <p className="font-mono text-xs text-white/40">#{tag}</p> : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/[0.06] bg-black/50 p-2 text-center">
                          <div>
                            <span className="text-[8px] font-black tracking-wider text-white/40 uppercase">
                              ACS
                            </span>
                            <p className="font-mono text-xs font-black text-white">{bp.avgAcs}</p>
                          </div>
                          <div className="border-x border-white/10">
                            <span className="text-[8px] font-black tracking-wider text-white/40 uppercase">
                              K/D
                            </span>
                            <p
                              className={`font-mono text-xs font-black ${
                                bp.kd >= 1.2 ? "text-emerald-300" : "text-white"
                              }`}
                            >
                              {bp.kd.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[8px] font-black tracking-wider text-white/40 uppercase">
                              GP
                            </span>
                            <p className="font-mono text-xs font-black text-white/80">
                              {bp.gamesPlayedOnAgent}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="py-2 text-xs italic text-white/30">No player qualified yet</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </MetaCollapsible>
    </div>
  );
}
