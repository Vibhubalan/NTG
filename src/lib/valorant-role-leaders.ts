import type { TournamentTeamView } from "@core/contracts";
import { metricValues } from "@/lib/tournament-awards";
import {
  aggregatePlayerStats,
  aggregateRoleStandouts,
  type AggregatedPlayerStats,
  type StandoutPlayer,
  type StatsGame,
  type TournamentStatsEligibility,
} from "@/lib/tournament-stats";

export type RolePlayerStat = {
  roleKey: "duelist" | "initiator" | "controller" | "sentinel" | "flex" | "overall";
  roleTitle: string;
  roleBadgeText: string;
  displayName: string;
  userId?: string | null;
  riotTag?: string | null;
  subtitle?: string | null;
  cardArtUrl?: string | null;
  riotPlayerCard?: string | null;
  riotPlayerCardWide?: string | null;
  statLabel?: string | null;
  statValue?: string | number | null;
};

type RoleLeaderSpec = {
  roleKey: RolePlayerStat["roleKey"];
  roleTitle: string;
  roleBadgeText: string;
  standout: StandoutPlayer | null | undefined;
  statLabel: string;
  statValue: (p: AggregatedPlayerStats) => string | number;
};

function findRosterPlayer(
  standout: StandoutPlayer,
  teams: TournamentTeamView[],
) {
  const riot = standout.riotId.trim().toLowerCase();
  const name = (standout.userName ?? standout.riotId.split("#")[0] ?? "")
    .trim()
    .toLowerCase();

  for (const team of teams) {
    for (const player of team.players ?? []) {
      const pRiot = player.riotId?.trim().toLowerCase() ?? "";
      const pName = player.displayName.trim().toLowerCase();
      if ((riot && pRiot === riot) || (name && pName === name)) {
        return player;
      }
    }
  }
  return null;
}

function resolveStatsRow(
  standout: StandoutPlayer,
  byRiot: Map<string, AggregatedPlayerStats>,
  byName: Map<string, AggregatedPlayerStats>,
): AggregatedPlayerStats | null {
  const riot = standout.riotId.trim().toLowerCase();
  const fromRiot = byRiot.get(riot);
  if (fromRiot) return fromRiot;
  const name = (standout.userName ?? standout.riotId.split("#")[0] ?? "")
    .trim()
    .toLowerCase();
  return byName.get(name) ?? null;
}

function toRolePlayerStat(
  spec: RoleLeaderSpec,
  stats: AggregatedPlayerStats,
  teams: TournamentTeamView[],
): RolePlayerStat {
  const roster = findRosterPlayer(
    {
      riotId: stats.riotId,
      userName: stats.userName,
      gamesPlayed: stats.gamesPlayed,
      avgAcs: stats.avgAcs,
      kd: 0,
      mostPlayedAgent: stats.mostPlayedAgent,
      agentCounts: stats.agentCounts,
    },
    teams,
  );
  const [gameName, tag] = stats.riotId.split("#");
  const displayName =
    stats.userName?.trim() || gameName?.trim() || stats.riotId;

  return {
    roleKey: spec.roleKey,
    roleTitle: spec.roleTitle,
    roleBadgeText: spec.roleBadgeText,
    displayName,
    userId: roster?.userId ?? null,
    riotTag: tag ? `#${tag}` : null,
    subtitle: roster?.displayName ?? stats.userName,
    riotPlayerCard: roster?.riotPlayerCard ?? null,
    riotPlayerCardWide: roster?.riotPlayerCardWide ?? null,
    statLabel: spec.statLabel,
    statValue: spec.statValue(stats),
  };
}

/**
 * Role Leaders for Valorant cups — only meaningful once finals/champions exist.
 * Uses the same standout engine as Stats → Meta awards.
 */
export function buildValorantRoleLeaderPlayers(
  games: StatsGame[],
  eligibility: TournamentStatsEligibility | null | undefined,
  teams: TournamentTeamView[] = [],
): RolePlayerStat[] {
  if (!games.length) return [];

  const standouts = aggregateRoleStandouts(games, eligibility);
  const allStats = aggregatePlayerStats(games, { eligibility });
  const byRiot = new Map(
    allStats.map((p) => [p.riotId.trim().toLowerCase(), p] as const),
  );
  const byName = new Map<string, AggregatedPlayerStats>();
  for (const p of allStats) {
    const name = (p.userName ?? p.riotId.split("#")[0] ?? "").trim().toLowerCase();
    if (name && !byName.has(name)) byName.set(name, p);
  }

  const specs: RoleLeaderSpec[] = [
    {
      roleKey: "duelist",
      roleTitle: "#1 Duelist",
      roleBadgeText: "#1 DUELIST",
      standout: standouts.byRole.Duelist,
      statLabel: "FIRST KILLS",
      statValue: (p) => p.totalFirstKills,
    },
    {
      roleKey: "initiator",
      roleTitle: "#1 Initiator",
      roleBadgeText: "#1 INITIATOR",
      standout: standouts.byRole.Initiator,
      statLabel: "ASSISTS",
      statValue: (p) => p.totalAssists,
    },
    {
      roleKey: "controller",
      roleTitle: "#1 Controller",
      roleBadgeText: "#1 CONTROLLER",
      standout: standouts.byRole.Controller,
      statLabel: "KAST",
      statValue: (p) => `${metricValues(p).kast.toFixed(1)}%`,
    },
    {
      roleKey: "sentinel",
      roleTitle: "#1 Sentinel",
      roleBadgeText: "#1 SENTINEL",
      standout: standouts.byRole.Sentinel,
      statLabel: "KAST",
      statValue: (p) => `${metricValues(p).kast.toFixed(1)}%`,
    },
    {
      roleKey: "flex",
      roleTitle: "#1 Flex",
      roleBadgeText: "#1 FLEX",
      standout: standouts.bestFlex,
      statLabel: "ACS",
      statValue: (p) => p.avgAcs,
    },
  ];

  const leaders: RolePlayerStat[] = [];
  for (const spec of specs) {
    if (!spec.standout) continue;
    const stats = resolveStatsRow(spec.standout, byRiot, byName);
    if (!stats) continue;
    leaders.push(toRolePlayerStat(spec, stats, teams));
  }

  return leaders;
}
