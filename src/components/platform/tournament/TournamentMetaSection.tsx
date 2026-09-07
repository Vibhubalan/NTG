"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  getAgentIconUrl,
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
import ValorantRoleIcon from "@/components/icons/ValorantRoleIcon";
import { resolveValorantRoleKey } from "@/lib/valorant-role-icons";

type Props = {
  games: PublicGame[];
  eligibility?: TournamentStatsEligibility;
};

type MetaTab = "highlights" | "maps" | "agents";

const ROLE_CONFIG: Record<
  string,
  {
    title: string;
    accent: string;
    icon: string;
    emptyLabel?: string;
  }
> = {
  bestOverall: {
    title: "Best overall",
    accent: "border-l-amber-400/70",
    icon: "👑",
  },
  Duelist: {
    title: "Best duelist",
    accent: "border-l-rose-400/60",
    icon: "duelist",
  },
  Initiator: {
    title: "Best initiator",
    accent: "border-l-sky-400/60",
    icon: "initiator",
  },
  Controller: {
    title: "Best controller",
    accent: "border-l-violet-400/60",
    icon: "controller",
  },
  Sentinel: {
    title: "Best sentinel",
    accent: "border-l-emerald-400/60",
    icon: "sentinel",
  },
  bestFlex: {
    title: "Best flex",
    accent: "border-l-fuchsia-400/60",
    icon: "flex",
    emptyLabel: "No player covered all four roles",
  },
};

function RoleMark({ icon }: { icon: string }) {
  if (resolveValorantRoleKey(icon)) {
    return <ValorantRoleIcon role={icon} className="h-3 w-3 opacity-70" />;
  }
  return <span aria-hidden className="text-[10px]">{icon}</span>;
}

function StatRow({ acs, kd, gp }: { acs: number; kd: number; gp: number }) {
  return (
    <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-center">
      <div>
        <dt className="text-[10px] text-white/35">ACS</dt>
        <dd className="mt-0.5 font-mono text-sm tabular-nums text-white/90">{acs}</dd>
      </div>
      <div>
        <dt className="text-[10px] text-white/35">K/D</dt>
        <dd
          className={`mt-0.5 font-mono text-sm tabular-nums ${
            kd >= 1 ? "text-emerald-300/90" : "text-white/75"
          }`}
        >
          {kd.toFixed(2)}
        </dd>
      </div>
      <div>
        <dt className="text-[10px] text-white/35">GP</dt>
        <dd className="mt-0.5 font-mono text-sm tabular-nums text-white/75">{gp}</dd>
      </div>
    </dl>
  );
}

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
      <article
        className={`rounded-md border border-white/[0.07] border-l-2 bg-white/[0.02] p-4 ${config.accent}`}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
          <RoleMark icon={config.icon} />
          <span>{config.title}</span>
        </div>
        <p className="mt-3 text-xs text-white/30">
          {config.emptyLabel ?? "Not enough data yet"}
        </p>
      </article>
    );
  }

  const [name, tag] = (() => {
    const parts = player.riotId.split("#");
    return [parts[0] ?? player.riotId, parts[1] ?? ""];
  })();
  const icon = getAgentIconUrl(player.mostPlayedAgent);
  const agentsPlayed = Object.entries(player.agentCounts ?? {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([agent, count]) => ({ agent, count }));

  return (
    <article
      className={`rounded-md border border-white/[0.07] border-l-2 bg-white/[0.025] p-4 ${config.accent}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-white/45">
          <RoleMark icon={config.icon} />
          <span>{config.title}</span>
        </div>
        {!showAllAgents && player.mostPlayedAgent ? (
          <span className="text-[10px] text-white/30">{player.mostPlayedAgent}</span>
        ) : showAllAgents ? (
          <span className="text-[10px] text-white/30">{agentsPlayed.length} agents</span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-3">
        {showAllAgents && agentsPlayed.length > 1 ? (
          <div className="flex shrink-0 flex-wrap gap-1">
            {agentsPlayed.slice(0, 4).map(({ agent, count }) => {
              const agentIcon = getAgentIconUrl(agent);
              return agentIcon ? (
                <Image
                  key={agent}
                  src={agentIcon}
                  alt={agent}
                  title={`${agent} · ${count}g`}
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain opacity-90"
                />
              ) : (
                <span
                  key={agent}
                  className="flex h-7 w-7 items-center justify-center rounded bg-white/[0.06] text-[8px] text-white/40"
                >
                  {agent.slice(0, 2)}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-black/30">
            {icon ? (
              <Image
                src={icon}
                alt={player.mostPlayedAgent ?? ""}
                width={44}
                height={44}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <span className="text-xs font-medium text-white/50">
                {name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white/95">{name}</p>
          {tag ? <p className="font-mono text-[11px] text-white/35">#{tag}</p> : null}
          {player.userName && player.userName !== name ? (
            <p className="truncate text-[11px] text-white/30">{player.userName}</p>
          ) : null}
        </div>
      </div>

      <StatRow acs={player.avgAcs} kd={player.kd} gp={player.gamesPlayed} />
    </article>
  );
}

function AgentIcons({ agents }: { agents: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {agents.map((agent) => {
        const icon = getAgentIconUrl(agent);
        return icon ? (
          <Image
            key={agent}
            src={icon}
            alt={agent}
            title={agent}
            width={22}
            height={22}
            className="h-[22px] w-[22px] object-contain opacity-85"
          />
        ) : (
          <span
            key={agent}
            title={agent}
            className="flex h-[22px] w-[22px] items-center justify-center rounded bg-white/[0.06] text-[8px] text-white/45"
          >
            {agent.slice(0, 2)}
          </span>
        );
      })}
    </div>
  );
}

export default function TournamentMetaSection({ games, eligibility }: Props) {
  const [metaTab, setMetaTab] = useState<MetaTab>("highlights");
  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole | "ALL">("ALL");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

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
      <div className="rounded-md border border-white/[0.08] bg-white/[0.02] px-6 py-10 text-center text-sm text-white/40">
        Not enough published matches yet.
      </div>
    );
  }

  const tabs: { id: MetaTab; label: string }[] = [
    { id: "highlights", label: "Role highlights" },
    { id: "maps", label: "Map stats" },
    { id: "agents", label: "Agent stats" },
  ];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Maps and agents views"
        className="flex flex-wrap gap-1 border-b border-white/[0.08] pb-px"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={metaTab === tab.id}
            onClick={() => setMetaTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              metaTab === tab.id
                ? "border-b border-emerald-400/80 text-white"
                : "border-b border-transparent text-white/40 hover:text-white/65"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {metaTab === "highlights" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StandoutCard roleKey="bestOverall" player={standouts.bestOverall} />
          <StandoutCard roleKey="Duelist" player={standouts.byRole.Duelist ?? null} />
          <StandoutCard roleKey="Initiator" player={standouts.byRole.Initiator ?? null} />
          <StandoutCard roleKey="Controller" player={standouts.byRole.Controller ?? null} />
          <StandoutCard roleKey="Sentinel" player={standouts.byRole.Sentinel ?? null} />
          <StandoutCard roleKey="bestFlex" player={standouts.bestFlex} />
        </div>
      ) : null}

      {metaTab === "maps" ? (
        teamMaps.length === 0 ? (
          <p className="text-sm text-white/40">No team map data available yet.</p>
        ) : (
          <div className="space-y-2">
            {teamMaps.map((team) => {
              const totalWins = team.maps.reduce((acc, m) => acc + m.wins, 0);
              const winRate =
                team.totalMaps > 0 ? Math.round((totalWins / team.totalMaps) * 100) : 0;
              const isOpen = expandedTeamId === team.teamId;

              return (
                <div
                  key={team.teamId}
                  className="overflow-hidden rounded-md border border-white/[0.07] bg-white/[0.02]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTeamId(isOpen ? null : team.teamId)
                    }
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/90">
                        {team.teamName}
                      </p>
                      <p className="text-[11px] text-white/35">
                        {team.totalMaps} maps · {totalWins}W–{team.totalMaps - totalWins}L ·{" "}
                        {winRate}% WR
                      </p>
                    </div>
                    <span className="text-white/30" aria-hidden>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="space-y-2 border-t border-white/[0.06] px-4 py-3">
                      {team.maps.map((m) => (
                        <div
                          key={m.mapName}
                          className="rounded-md border border-white/[0.06] bg-black/20 p-3"
                        >
                          <div className="relative mb-2 h-16 overflow-hidden rounded-sm">
                            <Image
                              src={getValorantMapSplashUrl(m.mapName)}
                              alt={m.mapName}
                              fill
                              sizes="400px"
                              quality={40}
                              className="object-cover opacity-50"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#060b13] to-transparent" />
                            <div className="absolute inset-x-2 bottom-2 flex items-end justify-between">
                              <span className="text-xs font-medium text-white/90">
                                {m.mapName}
                              </span>
                              <span className="font-mono text-[11px] text-white/50">
                                {m.winRate}% · {m.wins}W–{m.played - m.wins}L
                              </span>
                            </div>
                          </div>
                          {m.comps.length > 0 ? (
                            <div className="space-y-1.5">
                              {m.comps.map((c) => (
                                <div
                                  key={c.key}
                                  className="flex items-center justify-between gap-2 text-[11px]"
                                >
                                  <AgentIcons agents={c.agents} />
                                  <span className="shrink-0 font-mono text-white/45">
                                    {c.count}× · {c.winRate}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-white/30">No comp data</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {metaTab === "agents" ? (
        <>
          <div className="flex flex-wrap gap-1">
            {(["ALL", "Duelist", "Initiator", "Controller", "Sentinel"] as const).map(
              (role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedAgentRole(role)}
                  className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors ${
                    selectedAgentRole === role
                      ? "bg-white/[0.08] text-white/85"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {role !== "ALL" ? (
                    <ValorantRoleIcon role={role} className="h-3 w-3" />
                  ) : null}
                  {role === "ALL" ? "All" : role}
                </button>
              ),
            )}
          </div>

          {filteredAgentStandouts.length === 0 ? (
            <p className="py-8 text-center text-xs text-white/35">
              No agents match this filter yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAgentStandouts.map((item) => {
                const agentIcon = getAgentIconUrl(item.agent);
                const bp = item.bestPlayer;
                const [name, tag] = bp
                  ? bp.riotId.split("#")
                  : ["—", ""];

                return (
                  <article
                    key={item.agent}
                    className="rounded-md border border-white/[0.07] bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-black/25">
                        {agentIcon ? (
                          <Image
                            src={agentIcon}
                            alt={item.agent}
                            width={32}
                            height={32}
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-white/45">
                            {item.agent.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/90">
                          {item.agent}
                        </p>
                        <p className="text-[10px] text-white/35">
                          {item.totalPickCount} pick{item.totalPickCount !== 1 ? "s" : ""}
                          {item.role ? ` · ${item.role}` : ""}
                        </p>
                      </div>
                    </div>

                    {bp ? (
                      <div className="pt-2.5">
                        <p className="truncate text-sm font-medium text-white/85">{name}</p>
                        {tag ? (
                          <p className="font-mono text-[11px] text-white/35">#{tag}</p>
                        ) : null}
                        <StatRow
                          acs={bp.avgAcs}
                          kd={bp.kd}
                          gp={bp.gamesPlayedOnAgent}
                        />
                      </div>
                    ) : (
                      <p className="pt-2 text-[11px] text-white/30">No qualifier yet</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
