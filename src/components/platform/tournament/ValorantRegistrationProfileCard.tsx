"use client";

import { useMemo, type ReactNode } from "react";
import type { ValorantRegistrationProfileCard } from "@core/contracts/registration-profile";
import { formatRankLabel, rankIconUrl } from "@/lib/valorant-rank";
import { resolvePortraitCardArtUrl } from "@/lib/valorant-player-card";
import { getAgentIconUrl } from "@/lib/valorant-agent";
import {
  aggregatePlayerStats,
  distinctRolesPlayed,
  qualifiesFlex,
  type AggregatedPlayerStats,
  type StatsGame,
  type TournamentStatsEligibility,
} from "@/lib/tournament-stats";

const DEFAULT_CARD =
  "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png";

const DOT = "\u00B7";
const TIMES = "\u00D7";

type Props = {
  profile: ValorantRegistrationProfileCard;
  /** Show auction rank only while the auction window is still open. */
  showAuctionRank?: boolean;
  /** Published cup games used to surface this player's live tournament stats. */
  games?: StatsGame[] | null;
  statsEligibility?: TournamentStatsEligibility | null;
  participantRole?: "CAPTAIN" | "CO_CAPTAIN" | "PLAYER" | null;
};

function RankTile({
  label,
  tier,
  tierId,
}: {
  label: string;
  tier: string | null;
  tierId: number | null;
}) {
  const icon = rankIconUrl(tierId);
  const display = formatRankLabel(tierId, tier);

  return (
    <div className="relative flex min-w-0 items-center gap-1.5 sm:gap-3">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center sm:h-11 sm:w-11">
        {icon ? (
          <img
            src={icon}
            alt=""
            className="h-8 w-8 object-contain drop-shadow-md sm:h-11 sm:w-11"
          />
        ) : (
          <div className="h-7 w-7 rounded-lg bg-white/10 sm:h-8 sm:w-8" />
        )}
      </div>
      <div className="relative min-w-0">
        <p className="text-[7px] font-bold tracking-[0.16em] text-white/35 uppercase sm:text-[8px]">
          {label}
        </p>
        <p
          className="font-display text-[12px] font-bold leading-tight tracking-tight text-white/90 sm:truncate sm:text-base"
          title={display}
        >
          {display}
        </p>
      </div>
    </div>
  );
}

function StatChip({
  label,
  children,
  accent,
}: {
  label: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className="text-[7px] font-bold tracking-[0.12em] text-white/35 uppercase sm:text-[8px] sm:tracking-[0.14em]">
        {label}
      </p>
      <div
        className={`mt-0.5 font-display text-[11px] font-bold tabular-nums leading-none sm:text-lg ${
          accent ? "text-[var(--color-brand)]" : "text-white"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function formatRegisteredRoles(roles: string[]): string | null {
  if (roles.length === 0) return null;
  return roles
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase())
    .join(` ${DOT} `);
}

function inCupRolesLabel(agentCounts: Record<string, number>): string | null {
  if (Object.keys(agentCounts).length === 0) return null;
  if (qualifiesFlex(agentCounts)) return "Flex";
  const roles = distinctRolesPlayed(agentCounts);
  if (roles.length === 0) return null;
  return roles.join(` ${DOT} `);
}

function RoleLine({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "registered" | "played";
}) {
  const isPlayed = variant === "played";
  return (
    <div className="min-w-0">
      <p
        className={`text-[7px] font-bold tracking-[0.16em] uppercase sm:text-[9px] ${
          isPlayed ? "text-[var(--color-brand)]/75" : "text-white/35"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-0.5 min-w-0 text-[11px] font-semibold leading-snug sm:text-[13px] ${
          isPlayed ? "text-[var(--color-brand)]" : "text-white/70"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AgentsPlayedRow({ agentCounts }: { agentCounts: Record<string, number> }) {
  const agents = Object.entries(agentCounts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  if (agents.length === 0) return null;

  return (
    <div className="relative">
      <p className="mb-1 text-[7px] font-bold tracking-[0.14em] text-white/35 uppercase sm:mb-1.5 sm:text-[8px] sm:tracking-[0.16em]">
        Agents played
      </p>
      <div className="flex flex-wrap items-center gap-1 sm:gap-2.5">
        {agents.map(([agent]) => {
          const icon = getAgentIconUrl(agent);
          return (
            <div key={agent} title={agent} className="flex flex-col items-center gap-0.5">
              <div className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/15 sm:h-10 sm:w-10">
                {icon ? (
                  <img
                    src={icon}
                    alt=""
                    className="h-full w-full scale-110 object-cover object-top"
                  />
                ) : (
                  <span className="text-[8px] font-bold text-white/45 sm:text-[9px]">
                    {agent.slice(0, 2)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TournamentStatsBlock({ stats }: { stats: AggregatedPlayerStats }) {
  const kd =
    stats.totalDeaths > 0
      ? (stats.totalKills / stats.totalDeaths).toFixed(2)
      : stats.totalKills.toFixed(2);

  return (
    <div className="relative w-full min-w-0 space-y-1.5 rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent px-2.5 py-2 sm:space-y-3.5 sm:rounded-2xl sm:px-4 sm:py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[7px] font-bold tracking-[0.16em] text-white/40 uppercase sm:text-[8px] sm:tracking-[0.18em]">
          Tournament stats
        </p>
        {stats.mvpCount > 0 ? (
          <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-1.5 py-0.5 text-[7px] font-bold tracking-wide text-amber-200/90 uppercase sm:px-2 sm:text-[8px]">
            {stats.mvpCount}
            {TIMES} MVP
          </span>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[7px] font-bold tracking-[0.14em] text-white/35 uppercase sm:text-[8px] sm:tracking-[0.16em]">
            K / D / A
          </p>
          <p className="mt-0.5 font-display text-base font-black tabular-nums leading-none tracking-tight sm:mt-1 sm:text-3xl">
            <span className="text-emerald-300">{stats.totalKills}</span>
            <span className="mx-0.5 text-white/20 sm:mx-1">/</span>
            <span className="text-rose-300/90">{stats.totalDeaths}</span>
            <span className="mx-0.5 text-white/20 sm:mx-1">/</span>
            <span className="text-sky-300/90">{stats.totalAssists}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[7px] font-bold tracking-[0.14em] text-white/35 uppercase sm:text-[8px] sm:tracking-[0.16em]">
            K/D
          </p>
          <p className="mt-0.5 font-display text-base font-black tabular-nums leading-none text-white sm:mt-1 sm:text-3xl">
            {kd}
          </p>
        </div>
      </div>

      <div className="flex w-full items-stretch divide-x divide-white/[0.08] rounded-lg bg-black/25 px-0.5 py-1.5 sm:px-1 sm:py-2.5">
        <StatChip label="GP">{stats.gamesPlayed}</StatChip>
        <StatChip label="ACS" accent>
          {stats.avgAcs}
        </StatChip>
        <StatChip label="ADR">{Math.round(stats.avgAdr)}</StatChip>
        <StatChip label="HS%">{Math.round(stats.avgHsPercent)}%</StatChip>
        <StatChip label="FK/FD">
          {stats.totalFirstKills}/{stats.totalFirstDeaths}
        </StatChip>
      </div>

      <AgentsPlayedRow agentCounts={stats.agentCounts} />
    </div>
  );
}

function ProfilePlayerCard({
  profile,
}: {
  profile: ValorantRegistrationProfileCard;
}) {
  const cardImg =
    resolvePortraitCardArtUrl(profile.riotPlayerCard, profile.riotPlayerCardWide) ??
    DEFAULT_CARD;
  const rankIcon = rankIconUrl(profile.currentRankTierId);
  const rankLabel = formatRankLabel(
    profile.currentRankTierId,
    profile.currentRankTier,
  );
  const ingameName = (profile.riotGameName ?? profile.displayName).trim();

  return (
    <div className="group relative aspect-[268/640] w-[6.75rem] shrink-0 overflow-hidden rounded-xl shadow-[0_20px_40px_-18px_rgba(0,0,0,0.95)] ring-1 ring-white/15 sm:w-[13.5rem] sm:rounded-2xl sm:shadow-[0_28px_56px_-20px_rgba(0,0,0,0.95)]">
      <img
        src={cardImg}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--color-brand)]/15 to-transparent mix-blend-screen" />

      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-1.5 pb-2 text-center sm:px-3.5 sm:pb-4">
        <p
          className="w-full truncate px-0.5 font-display text-[10px] font-bold leading-tight tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-[15px]"
          title={ingameName}
        >
          {ingameName}
        </p>
        <div className="mt-1 flex h-8 w-8 items-center justify-center sm:mt-2.5 sm:h-12 sm:w-12">
          {rankIcon ? (
            <img
              src={rankIcon}
              alt=""
              className="h-8 w-8 object-contain drop-shadow-lg sm:h-12 sm:w-12"
            />
          ) : (
            <div className="h-7 w-7 rounded-lg bg-white/10 sm:h-10 sm:w-10" />
          )}
        </div>
        <p className="mt-0.5 max-w-full truncate font-display text-[8px] font-black tracking-[0.1em] text-white/90 uppercase drop-shadow-md sm:mt-1 sm:text-[11px] sm:tracking-[0.14em]">
          {rankLabel}
        </p>
      </div>
    </div>
  );
}

function findPlayerStats(
  profile: ValorantRegistrationProfileCard,
  games: StatsGame[] | null | undefined,
  eligibility: TournamentStatsEligibility | null | undefined,
): AggregatedPlayerStats | null {
  if (!games?.length) return null;
  const rows = aggregatePlayerStats(games, { eligibility: eligibility ?? null });
  const riotKey = profile.riotId?.trim().toLowerCase();
  const gameName = profile.riotGameName?.trim().toLowerCase();
  const display = profile.displayName.trim().toLowerCase();

  return (
    rows.find((p) => {
      if (riotKey && p.riotId.trim().toLowerCase() === riotKey) return true;
      const name = (p.userName ?? p.riotId.split("#")[0] ?? "").trim().toLowerCase();
      if (gameName && name === gameName) return true;
      if (display && name === display) return true;
      return false;
    }) ?? null
  );
}

function StatusFillPanel({
  showAuctionRank,
  isCaptain,
  teamName,
  auctionLabel,
  auctionIcon,
}: {
  showAuctionRank: boolean;
  isCaptain: boolean;
  teamName: string | null;
  auctionLabel: string;
  auctionIcon: string | null;
}) {
  if (showAuctionRank && !isCaptain) {
    return (
      <div className="relative w-full min-w-0 space-y-2 rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent px-3 py-2.5 sm:space-y-3 sm:rounded-2xl sm:px-4 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {auctionIcon ? (
            <img
              src={auctionIcon}
              alt=""
              className="h-10 w-10 shrink-0 object-contain sm:h-14 sm:w-14"
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 sm:h-14 sm:w-14" />
          )}
          <div className="min-w-0">
            <p className="text-[8px] font-bold tracking-[0.18em] text-white/40 uppercase">
              Auction rank
            </p>
            <p className="font-display text-lg font-black tracking-tight text-white sm:text-2xl">
              {auctionLabel}
            </p>
            <p className="text-[11px] text-white/40">Captains bid on this rank</p>
          </div>
        </div>
        <p className="border-t border-white/[0.06] pt-2 text-[11px] leading-snug text-white/50 sm:text-[13px]">
          Stay registered, join the live auction, get allotted to a team.
        </p>
      </div>
    );
  }

  if (showAuctionRank && isCaptain) {
    return (
      <div className="relative w-full min-w-0 space-y-2 rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-4">
        <p className="text-[8px] font-bold tracking-[0.18em] text-white/40 uppercase">
          Your squad
        </p>
        <p className="font-display text-xl font-black tracking-tight text-[#22c55e] sm:text-3xl">
          {teamName || "Your team"}
        </p>
        <p className="text-[11px] leading-snug text-white/45 sm:text-[13px]">
          You are the captain. Build the roster in the live auction.
        </p>
      </div>
    );
  }

  if (teamName) {
    return (
      <div className="relative w-full min-w-0 space-y-2 rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-4">
        <p className="text-[8px] font-bold tracking-[0.18em] text-white/40 uppercase">
          Team allotment
        </p>
        <p className="font-display text-xl font-black tracking-tight text-[#22c55e] sm:text-3xl">
          {teamName}
        </p>
        <p className="text-[11px] leading-snug text-white/45 sm:text-[13px]">
          Locked on the roster. Stats unlock after your first cup game.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full min-w-0 rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-4">
      <p className="text-[8px] font-bold tracking-[0.18em] text-white/40 uppercase">
        Tournament stats
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-white/45 sm:text-[13px]">
        No cup games published for this player yet.
      </p>
    </div>
  );
}

function ProfileIdentity({
  profile,
  registeredRolesLabel,
  inCupRoles,
  isCaptain,
  teamName,
  showAuctionRank,
}: {
  profile: ValorantRegistrationProfileCard;
  registeredRolesLabel: string | null;
  inCupRoles: string | null;
  isCaptain: boolean;
  teamName: string | null;
  showAuctionRank: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <p className="text-[8px] font-bold tracking-[0.18em] text-[var(--color-brand)] uppercase">
          Your profile
        </p>
        {isCaptain ? (
          <span className="inline-flex items-center rounded-full border border-amber-300/35 bg-amber-400/10 px-2 py-0.5 text-[8px] font-bold tracking-[0.12em] text-amber-200 uppercase">
            Captain
          </span>
        ) : null}
        {teamName ? (
          <span className="inline-flex max-w-full items-center truncate rounded-full border border-[#22c55e]/35 bg-[#22c55e]/12 px-2 py-0.5 text-[8px] font-bold tracking-[0.12em] text-[#22c55e] uppercase">
            {teamName}
          </span>
        ) : showAuctionRank ? (
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[8px] font-bold tracking-[0.12em] text-white/35 uppercase">
            Awaiting auction
          </span>
        ) : null}
      </div>
      <h3 className="mt-0.5 break-words font-display text-xl font-black tracking-tight text-white sm:text-3xl">
        {profile.displayName}
      </h3>
      {profile.riotId ? (
        <p className="mt-0.5 truncate text-[10px] text-white/35 sm:text-xs">{profile.riotId}</p>
      ) : null}
      {(registeredRolesLabel || inCupRoles) && (
        <div className="mt-1.5 grid min-w-0 grid-cols-1 gap-1 sm:mt-2.5 sm:grid-cols-2 sm:gap-2">
          {registeredRolesLabel ? (
            <RoleLine
              label="Registered roles"
              value={registeredRolesLabel}
              variant="registered"
            />
          ) : null}
          {inCupRoles ? (
            <RoleLine label="Roles played" value={inCupRoles} variant="played" />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function ValorantRegistrationProfileCard({
  profile,
  showAuctionRank = true,
  games = null,
  statsEligibility = null,
  participantRole = null,
}: Props) {
  const auctionIcon = rankIconUrl(profile.auctionRankTierId);
  const auctionLabel = formatRankLabel(
    profile.auctionRankTierId,
    profile.auctionRankTier,
  );
  const registeredRolesLabel = formatRegisteredRoles(profile.valorantRoles);
  const teamName = profile.teamName?.trim() || null;
  const isCaptain = participantRole === "CAPTAIN";

  const tournamentStats = useMemo(
    () => findPlayerStats(profile, games, statsEligibility),
    [profile, games, statsEligibility],
  );

  const inCupRoles =
    tournamentStats && tournamentStats.gamesPlayed > 0
      ? inCupRolesLabel(tournamentStats.agentCounts)
      : null;

  const hasLiveStats = Boolean(tournamentStats && tournamentStats.gamesPlayed > 0);

  const ranks = (
    <div className="grid min-w-0 grid-cols-2 gap-2 border-y border-white/[0.06] py-2 sm:py-2.5">
      <RankTile
        label="Current"
        tier={profile.currentRankTier}
        tierId={profile.currentRankTierId}
      />
      <RankTile
        label="Peak"
        tier={profile.peakRankTier}
        tierId={profile.peakRankTierId}
      />
    </div>
  );

  const lowerPanel = hasLiveStats ? (
    <TournamentStatsBlock stats={tournamentStats!} />
  ) : (
    <StatusFillPanel
      showAuctionRank={showAuctionRank}
      isCaptain={isCaptain}
      teamName={teamName}
      auctionLabel={auctionLabel}
      auctionIcon={auctionIcon}
    />
  );

  const identity = (
    <ProfileIdentity
      profile={profile}
      registeredRolesLabel={registeredRolesLabel}
      inCupRoles={inCupRoles}
      isCaptain={isCaptain}
      teamName={teamName}
      showAuctionRank={showAuctionRank}
    />
  );

  return (
    <>
      {/* Mobile: card beside identity, stats full-width below */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex items-start gap-3">
          <ProfilePlayerCard profile={profile} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {identity}
            {ranks}
          </div>
        </div>
        {lowerPanel}
      </div>

      {/* Desktop */}
      <div className="hidden min-w-0 items-start gap-5 sm:flex">
        <ProfilePlayerCard profile={profile} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {identity}
          {ranks}
          {lowerPanel}
        </div>
      </div>
    </>
  );
}
